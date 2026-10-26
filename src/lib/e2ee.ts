import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

// Сквозное шифрование записей.
// Случайный ключ данных (DEK, AES-256-GCM) создаётся на устройстве и на сервер попадает только в «запертом» виде:
// один раз под ключом от пароля шифрования (PBKDF2), второй раз под ключом восстановления. Сервер видит только
// шифртекст в колонках content (записи), title (задачи) и note (сон) с префиксом «enc:».
// Расшифрованный ключ живёт в памяти и, чтобы не вводить пароль каждый раз, в IndexedDB как неизвлекаемый CryptoKey.

export type E2eeStatus = 'idle' | 'checking' | 'off' | 'unavailable' | 'locked' | 'unlocked' | 'error';

interface KeyRecord {
  user_id: string;
  salt: string;
  iter: number;
  wrapped_pass: string;
  r_salt: string;
  wrapped_recovery: string;
  check_value: string;
}

const PREFIX = 'enc:v1.';
const PASS_ITER = 600_000;
const RECOVERY_ITER = 10_000;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const enc = new TextEncoder();
const dec = new TextDecoder();

let status: E2eeStatus = 'idle';
let dek: CryptoKey | null = null;
let record: KeyRecord | null = null;
let listeners: (() => void)[] = [];

function setStatus(s: E2eeStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export function getE2eeStatus(): E2eeStatus { return status; }
export function subscribeE2ee(l: () => void) {
  listeners.push(l);
  return () => { listeners = listeners.filter((x) => x !== l); };
}
export function useE2eeStatus(): E2eeStatus { return useSyncExternalStore(subscribeE2ee, getE2eeStatus); }

/** Шифровать нужно, только когда ключ открыт. */
export const encryptionActive = () => status === 'unlocked' && dek !== null;
/** Писать на сервер можно, если шифрования нет или ключ открыт: иначе зашифрованное затёрлось бы пустым. */
export const canSync = () => status === 'off' || status === 'unavailable' || status === 'unlocked';

// ---------- base64 и случайные байты ----------

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

// ---------- примитивы ----------

async function deriveKek(secret: string, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function seal(key: CryptoKey, data: Uint8Array<ArrayBuffer>, aad?: string): Promise<string> {
  const iv = randomBytes(12);
  const params: AesGcmParams = { name: 'AES-GCM', iv, ...(aad ? { additionalData: enc.encode(aad) } : {}) };
  const ct = await crypto.subtle.encrypt(params, key, data);
  return `${toB64(iv)}.${toB64(ct)}`;
}

async function open(key: CryptoKey, packed: string, aad?: string): Promise<Uint8Array<ArrayBuffer>> {
  const [iv, ct] = packed.split('.');
  const params: AesGcmParams = { name: 'AES-GCM', iv: fromB64(iv), ...(aad ? { additionalData: enc.encode(aad) } : {}) };
  return new Uint8Array(await crypto.subtle.decrypt(params, key, fromB64(ct)));
}

const importDek = (raw: Uint8Array<ArrayBuffer>) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

function generateRecoveryKey(): string {
  const bytes = randomBytes(32);
  let s = '';
  for (const b of bytes) s += RECOVERY_ALPHABET[b % 32];
  return s.match(/.{4}/g)!.join('-');
}

/** Приводит введённый ключ восстановления к каноничному виду; null, если он не похож на ключ. */
export function normalizeRecoveryKey(input: string): string | null {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 32 || [...clean].some((c) => !RECOVERY_ALPHABET.includes(c))) return null;
  return clean;
}

export function formatRecoveryKey(key: string): string {
  return key.replace(/[^A-Z0-9]/g, '').match(/.{4}/g)?.join('-') ?? key;
}

// ---------- кэш ключа на устройстве ----------

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('dn-e2ee', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keys');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cachePut(userId: string, key: CryptoKey) {
  try {
    const db = await idb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('keys', 'readwrite');
      tx.objectStore('keys').put(key, userId);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch { /* без кэша просто будем спрашивать пароль */ }
}

async function cacheGet(userId: string): Promise<CryptoKey | null> {
  try {
    const db = await idb();
    const key = await new Promise<CryptoKey | null>((res, rej) => {
      const req = db.transaction('keys').objectStore('keys').get(userId);
      req.onsuccess = () => res((req.result as CryptoKey) ?? null);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return key;
  } catch { return null; }
}

async function cacheDelete(userId?: string) {
  try {
    const db = await idb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('keys', 'readwrite');
      if (userId) tx.objectStore('keys').delete(userId); else tx.objectStore('keys').clear();
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch { /* ignore */ }
}

/** Выход из аккаунта: ключ с этого устройства убираем. */
export async function forgetDeviceKey() {
  dek = null;
  record = null;
  await cacheDelete();
  setStatus('idle');
}

// ---------- шифрование текста ----------

export const isSealed = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PREFIX);

/** Зашифровать строку; aad привязывает шифртекст к строке в базе, чтобы его нельзя было подсунуть в другую. */
export async function sealText(plain: string, aad: string): Promise<string> {
  if (!dek) throw new Error('E2EE locked');
  return PREFIX + (await seal(dek, enc.encode(plain), aad));
}

/** Расшифровать строку; обычный текст (без префикса) возвращается как есть. Бросает ошибку при чужом/битом шифртексте. */
export async function openText(value: string, aad: string): Promise<string> {
  if (!isSealed(value)) return value;
  if (!dek) throw new Error('E2EE locked');
  return dec.decode(await open(dek, value.slice(PREFIX.length), aad));
}

export const entryAad = (userId: string, date: string) => `${userId}:e:${date}`;
export const taskAad = (userId: string, id: string) => `${userId}:t:${id}`;
export const sleepAad = (userId: string, date: string) => `${userId}:s:${date}`;

export interface EntryBody { c: string; t: string[]; p: string[] }

export async function sealEntry(userId: string, date: string, body: EntryBody): Promise<string> {
  return sealText(JSON.stringify(body), entryAad(userId, date));
}

export async function openEntry(userId: string, row: { date: string; content?: string | null; tags?: string[] | null; photos?: unknown }): Promise<EntryBody | null> {
  const content = row.content ?? '';
  if (!isSealed(content)) {
    return { c: content, t: Array.isArray(row.tags) ? row.tags : [], p: Array.isArray(row.photos) ? (row.photos as string[]) : [] };
  }
  try {
    const body = JSON.parse(await openText(content, entryAad(userId, row.date)));
    return { c: String(body.c ?? ''), t: Array.isArray(body.t) ? body.t : [], p: Array.isArray(body.p) ? body.p : [] };
  } catch {
    return null;
  }
}

// ---------- запись ключей на сервере ----------

const TABLE_MISSING = new Set(['42P01', 'PGRST205', 'PGRST200']);

async function fetchRecord(userId: string): Promise<KeyRecord | null | 'unavailable'> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('user_keys').select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    if (TABLE_MISSING.has(error.code ?? '')) return 'unavailable';
    throw error;
  }
  return (data as KeyRecord | null) ?? null;
}

async function verifyKey(key: CryptoKey, rec: KeyRecord): Promise<boolean> {
  try { return dec.decode(await open(key, rec.check_value, `${rec.user_id}:check`)) === 'ok'; } catch { return false; }
}

/** Вызывается при входе: узнаём, включено ли шифрование, и пробуем открыть ключ, сохранённый на устройстве. */
export async function initE2ee(userId: string): Promise<void> {
  setStatus('checking');
  try {
    const rec = await fetchRecord(userId);
    if (rec === 'unavailable') { record = null; dek = null; setStatus('unavailable'); return; }
    if (!rec) { record = null; dek = null; await cacheDelete(userId); setStatus('off'); return; }
    record = rec;
    const cached = await cacheGet(userId);
    if (cached && (await verifyKey(cached, rec))) { dek = cached; setStatus('unlocked'); return; }
    dek = null;
    setStatus('locked');
  } catch (e) {
    console.error('[E2EE] init failed:', e);
    setStatus('error');
  }
}

async function unwrapRaw(rec: KeyRecord, secret: string, kind: 'pass' | 'recovery'): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    if (kind === 'pass') {
      return await open(await deriveKek(secret, fromB64(rec.salt), rec.iter), rec.wrapped_pass, `${rec.user_id}:kp`);
    }
    const norm = normalizeRecoveryKey(secret);
    if (!norm) return null;
    return await open(await deriveKek(norm, fromB64(rec.r_salt), RECOVERY_ITER), rec.wrapped_recovery, `${rec.user_id}:kr`);
  } catch { return null; }
}

async function wrapPass(userId: string, raw: Uint8Array<ArrayBuffer>, passphrase: string) {
  const salt = randomBytes(16);
  return { salt: toB64(salt), iter: PASS_ITER, wrapped_pass: await seal(await deriveKek(passphrase, salt, PASS_ITER), raw, `${userId}:kp`) };
}

async function wrapRecovery(userId: string, raw: Uint8Array<ArrayBuffer>, recoveryKey: string) {
  const salt = randomBytes(16);
  const norm = normalizeRecoveryKey(recoveryKey)!;
  return { r_salt: toB64(salt), wrapped_recovery: await seal(await deriveKek(norm, salt, RECOVERY_ITER), raw, `${userId}:kr`) };
}

/** Включение: создаёт ключ данных и возвращает ключ восстановления (показывается один раз). */
export async function setupE2ee(userId: string, passphrase: string): Promise<string> {
  if (!supabase) throw new Error('no supabase');
  const raw = randomBytes(32);
  const key = await importDek(raw);
  const recoveryKey = generateRecoveryKey();
  const rec: KeyRecord = {
    user_id: userId,
    ...(await wrapPass(userId, raw, passphrase)),
    ...(await wrapRecovery(userId, raw, recoveryKey)),
    check_value: await seal(key, enc.encode('ok'), `${userId}:check`),
  };
  const { error } = await supabase.from('user_keys').insert(rec);
  if (error) throw error;
  record = rec;
  dek = key;
  await cachePut(userId, key);
  setStatus('unlocked');
  return recoveryKey;
}

/** Открыть ключ паролем или ключом восстановления. */
export async function unlockE2ee(userId: string, secret: string, kind: 'pass' | 'recovery'): Promise<boolean> {
  if (!record) return false;
  const raw = await unwrapRaw(record, secret, kind);
  if (!raw) return false;
  const key = await importDek(raw);
  if (!(await verifyKey(key, record))) return false;
  dek = key;
  await cachePut(userId, key);
  setStatus('unlocked');
  return true;
}

/** Задать новый пароль шифрования; текущий секрет (пароль или ключ восстановления) нужен, чтобы достать ключ данных. */
export async function changePassphrase(userId: string, currentSecret: string, kind: 'pass' | 'recovery', newPassphrase: string): Promise<boolean> {
  if (!supabase || !record) return false;
  const raw = await unwrapRaw(record, currentSecret, kind);
  if (!raw) return false;
  const next = await wrapPass(userId, raw, newPassphrase);
  const { error } = await supabase.from('user_keys').update({ ...next, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
  record = { ...record, ...next };
  return true;
}

/** Новый ключ восстановления (старый перестаёт работать). Нужен пароль шифрования. */
export async function renewRecoveryKey(userId: string, passphrase: string): Promise<string | null> {
  if (!supabase || !record) return null;
  const raw = await unwrapRaw(record, passphrase, 'pass');
  if (!raw) return null;
  const recoveryKey = generateRecoveryKey();
  const next = await wrapRecovery(userId, raw, recoveryKey);
  const { error } = await supabase.from('user_keys').update({ ...next, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
  record = { ...record, ...next };
  return recoveryKey;
}

/** Проверка пароля шифрования без смены состояния (для подтверждения опасных действий). */
export async function checkPassphrase(passphrase: string): Promise<boolean> {
  return Boolean(record && (await unwrapRaw(record, passphrase, 'pass')));
}

// ---------- перенос уже существующих данных ----------

const PAGE = 20;

/**
 * Приводит все строки пользователя к нужному виду: toEncrypted=true шифрует открытые, false расшифровывает.
 * Идёт по одной строке и безопасна к повтору: уже обработанные пропускаются. Возвращает число ошибок.
 */
export async function convertAllRemote(userId: string, toEncrypted: boolean, onProgress?: (done: number) => void): Promise<number> {
  if (!supabase) return 0;
  if (toEncrypted && !dek) throw new Error('E2EE locked');
  let failed = 0;
  let done = 0;
  const tick = () => { done += 1; onProgress?.(done); };

  // записи дня: сначала только даты, потом пачками по одной порции, чтобы не тянуть все фото сразу
  const like = `${PREFIX}%`;
  const q = supabase.from('entries').select('date').eq('user_id', userId);
  const { data: dates, error: dErr } = await (toEncrypted ? q.or(`content.is.null,content.not.like.${like}`) : q.like('content', like));
  if (dErr) throw dErr;
  const all = (dates ?? []).map((r) => r.date as string);
  for (let i = 0; i < all.length; i += PAGE) {
    const { data, error } = await supabase.from('entries').select('date,content,tags,photos').eq('user_id', userId).in('date', all.slice(i, i + PAGE));
    if (error) throw error;
    for (const r of data ?? []) {
      if (toEncrypted ? isSealed(r.content) || !hasBody(r) : !isSealed(r.content)) continue;
      try {
        const patch = toEncrypted
          ? { content: await sealEntry(userId, r.date, { c: r.content ?? '', t: r.tags ?? [], p: Array.isArray(r.photos) ? r.photos : [] }), tags: [], photos: [] }
          : await plainEntryPatch(userId, r);
        if (!patch) { failed += 1; continue; }
        const { error: upErr } = await supabase.from('entries').update(patch).eq('user_id', userId).eq('date', r.date);
        if (upErr) throw upErr;
        tick();
      } catch (e) { console.error('[E2EE] entry convert failed', e); failed += 1; }
    }
  }

  // задачи
  const { data: tasks, error: tErr } = await supabase.from('tasks').select('id,title').eq('user_id', userId);
  if (tErr) throw tErr;
  for (const t of tasks ?? []) {
    if (toEncrypted === isSealed(t.title) || (toEncrypted && !t.title)) continue;
    try {
      const title = toEncrypted ? await sealText(t.title, taskAad(userId, t.id)) : await openText(t.title, taskAad(userId, t.id));
      const { error: upErr } = await supabase.from('tasks').update({ title }).eq('id', t.id).eq('user_id', userId);
      if (upErr) throw upErr;
      tick();
    } catch (e) { console.error('[E2EE] task convert failed', e); failed += 1; }
  }

  // заметки о сне
  const { data: sleeps, error: sErr } = await supabase.from('sleep_logs').select('date,note').eq('user_id', userId);
  if (sErr) throw sErr;
  for (const s of sleeps ?? []) {
    if (toEncrypted === isSealed(s.note) || (toEncrypted && !s.note)) continue;
    try {
      const note = toEncrypted ? await sealText(s.note, sleepAad(userId, s.date)) : await openText(s.note, sleepAad(userId, s.date));
      const { error: upErr } = await supabase.from('sleep_logs').update({ note }).eq('user_id', userId).eq('date', s.date);
      if (upErr) throw upErr;
      tick();
    } catch (e) { console.error('[E2EE] sleep convert failed', e); failed += 1; }
  }
  return failed;
}

const hasBody = (r: { content?: string | null; tags?: string[] | null; photos?: unknown }) =>
  Boolean((r.content ?? '').trim()) || (r.tags?.length ?? 0) > 0 || (Array.isArray(r.photos) && r.photos.length > 0);

async function plainEntryPatch(userId: string, r: { date: string; content: string | null; tags: string[] | null; photos: unknown }) {
  const body = await openEntry(userId, r);
  return body ? { content: body.c, tags: body.t, photos: body.p } : null;
}

/** Отключение: сначала всё расшифровывается, и только если ошибок нет, ключ удаляется с сервера. */
export async function disableE2ee(userId: string, onProgress?: (done: number) => void): Promise<boolean> {
  if (!supabase || !dek) return false;
  const failed = await convertAllRemote(userId, false, onProgress);
  if (failed > 0) return false;
  const { error } = await supabase.from('user_keys').delete().eq('user_id', userId);
  if (error) throw error;
  dek = null;
  record = null;
  await cacheDelete(userId);
  setStatus('off');
  return true;
}

/** «Нет ни пароля, ни ключа»: зашифрованное безвозвратно удаляется, шифрование выключается. */
export async function resetE2ee(userId: string): Promise<void> {
  if (!supabase) return;
  const like = `${PREFIX}%`;
  const results = await Promise.all([
    supabase.from('entries').delete().eq('user_id', userId).like('content', like),
    supabase.from('tasks').delete().eq('user_id', userId).like('title', like),
    supabase.from('sleep_logs').update({ note: '' }).eq('user_id', userId).like('note', like),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  const { error } = await supabase.from('user_keys').delete().eq('user_id', userId);
  if (error) throw error;
  dek = null;
  record = null;
  await cacheDelete(userId);
  setStatus('off');
}
