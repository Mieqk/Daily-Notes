import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { canSync, encryptionActive, isSealed, openText, sealText } from './e2ee';
import { QUICK_EVENT } from './quickRemind';
import { DEFAULT_CUSTOM_OPTS } from '../bg';

/**
 * Синхронизация всего, что живёт в localStorage и не лежит в своих таблицах (записи, задачи и сон синхронизируются отдельно, см. sync.ts).
 *
 * Идея: каждый ключ раскладывается на «документы» (одно значение, один элемент списка или одна запись словаря).
 * Документ = строка в таблице user_sync с временем правки ts. Побеждает более новая правка, удаление передаётся «надгробием».
 * Что изменилось на этом устройстве, находим сравнением с тем, что мы видели в прошлый раз: это и есть офлайн-очередь,
 * она хранится в localStorage и переживает перезапуск. Компоненты ничего не знают о синхронизации: пишут в localStorage как раньше.
 */

export type ChannelKind = 'value' | 'items' | 'map';

export interface Channel {
  /** Ключ localStorage (или его начало, если prefix). */
  key: string;
  prefix?: boolean;
  /** value — одно значение; items — массив объектов с id (или строк); map — объект «ключ -> значение». */
  kind: ChannelKind;
  idOf?: (x: unknown) => string | null;
  /** Значения по умолчанию: пока их не трогали, нечего отправлять (иначе «пустое» новое устройство перетёрло бы настроенное). */
  defaults?: string[];
  /** Событие, которое слушает экран этого ключа (если он не читает localStorage заново сам). */
  event?: string;
}

const defaultId = (x: unknown): string | null => (x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string' ? (x as { id: string }).id : null);
const stringId = (x: unknown): string | null => (typeof x === 'string' && x ? x : null);

/** Что синхронизируется. Намеренно НЕ входят: PIN и биометрия, места (координаты), согласия на ИИ, память ИИ, служебные флаги устройства. */
export const CHANNELS: Channel[] = [
  { key: 'dn.reminder', kind: 'value', defaults: ['{"time":"20:00","enabled":false}'] },
  { key: 'dn.sleepGoal', kind: 'value', defaults: ['8'] },
  { key: 'dn.bgCustom', kind: 'items' },
  { key: 'dn.bgCustomOpts', kind: 'value', defaults: [JSON.stringify(DEFAULT_CUSTOM_OPTS)] },
  { key: 'dn.quickReminders', kind: 'items', event: QUICK_EVENT },
  { key: 'dn.answers', kind: 'map' },
  { key: 'dn.games', kind: 'map' },
  { key: 'dn.favFriends', kind: 'items', idOf: stringId },
  { key: 'dn.coach.food', kind: 'items' },
  { key: 'dn.coach.hobby', kind: 'items' },
  { key: 'dn.coach.workout', kind: 'items' },
  { key: 'dn.breathPattern', kind: 'value', defaults: ['"box"'] },
  { key: 'dn.breathTotal', kind: 'value', defaults: ['0'] },
  { key: 'dn.recapHidden', kind: 'value', defaults: ['0'] },
  { key: 'dn.badgesHidden', kind: 'value', defaults: ['0'] },
  { key: 'dn.pairHero', kind: 'value' },
  { key: 'dn.pairKind.', prefix: true, kind: 'value' },
];

export const REMOTE_WRITE_EVENT = 'dn-remote-write';
const MAX_DOC = 1_000_000;
const SEP = '#';

export function findChannel(key: string): Channel | undefined {
  return CHANNELS.find((c) => (c.prefix ? key.startsWith(c.key) : key === c.key));
}

const lsKeyOf = (docId: string) => (docId.includes(SEP) ? docId.slice(0, docId.indexOf(SEP)) : docId);

export function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}.${s.length.toString(36)}`;
}

const parse = (raw: string): unknown => { try { return JSON.parse(raw); } catch { return undefined; } };

/** Раскладывает значение ключа на документы: id документа -> содержимое (строка). */
export function splitDocs(ch: Channel, lsKey: string, raw: string | null): Record<string, string> {
  if (raw === null) return {};
  if (ch.kind === 'value') return { [lsKey]: raw };
  const v = parse(raw);
  const out: Record<string, string> = {};
  if (ch.kind === 'items') {
    if (!Array.isArray(v)) return out;
    const idOf = ch.idOf ?? defaultId;
    for (const x of v) {
      const id = idOf(x);
      if (id) out[`${lsKey}${SEP}${id}`] = JSON.stringify(x);
    }
    return out;
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[`${lsKey}${SEP}${k}`] = JSON.stringify(x);
  }
  return out;
}

/** Применяет чужие изменения (док -> содержимое или null = удалить) к сырому значению ключа. null в ответе = ключ удалить. */
export function applyDocs(ch: Channel, lsKey: string, current: string | null, changes: Record<string, string | null>): string | null {
  if (ch.kind === 'value') {
    const c = changes[lsKey];
    return c === undefined ? current : c;
  }
  const cur = current === null ? undefined : parse(current);
  const idOf = ch.idOf ?? defaultId;
  const prefix = lsKey + SEP;
  if (ch.kind === 'items') {
    const arr: unknown[] = Array.isArray(cur) ? [...cur] : [];
    for (const [docId, c] of Object.entries(changes)) {
      const id = docId.slice(prefix.length);
      const at = arr.findIndex((x) => idOf(x) === id);
      if (c === null) { if (at >= 0) arr.splice(at, 1); continue; }
      const x = parse(c);
      if (x === undefined) continue;
      if (at >= 0) arr[at] = x; else arr.push(x);
    }
    return JSON.stringify(arr);
  }
  const obj: Record<string, unknown> = cur && typeof cur === 'object' && !Array.isArray(cur) ? { ...(cur as Record<string, unknown>) } : {};
  for (const [docId, c] of Object.entries(changes)) {
    const k = docId.slice(prefix.length);
    if (c === null) { delete obj[k]; continue; }
    const x = parse(c);
    if (x !== undefined) obj[k] = x;
  }
  return JSON.stringify(obj);
}

// ---------- состояние синхронизации ----------

/** h — хэш содержимого, которое сейчас в облаке (null: там удалено или ещё нет); o — что видели на устройстве в прошлый раз;
 *  ts — версия облака; p — время нашей неотправленной правки (есть = документ в очереди). */
export interface DocState { h: string | null; o: string | null; ts: number; p?: number }
export interface SyncState { docs: Record<string, DocState>; enc: boolean; cursor: string }

export const emptyState = (): SyncState => ({ docs: {}, enc: false, cursor: '' });

export interface LocalDoc { c: string; h: string }
export type LocalDocs = Record<string, LocalDoc>;
export type Store = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;

const rawCache = new Map<string, { raw: string; docs: LocalDocs }>();

/** Все документы, которые сейчас есть на устройстве. */
export function readLocalDocs(store: Store, state: SyncState): LocalDocs {
  const out: LocalDocs = {};
  const seen = new Set<string>();
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !k.startsWith('dn.')) continue;
    const ch = findChannel(k);
    if (!ch) continue;
    const raw = store.getItem(k);
    if (raw === null) continue;
    seen.add(k);
    // нетронутое значение по умолчанию на устройстве, которое ещё не синхронизировалось, документом не считается
    if (ch.kind === 'value' && ch.defaults?.includes(raw) && !state.docs[k]) continue;
    let cached = rawCache.get(k);
    if (!cached || cached.raw !== raw) {
      const docs: LocalDocs = {};
      for (const [id, c] of Object.entries(splitDocs(ch, k, raw))) docs[id] = { c, h: hashStr(c) };
      cached = { raw, docs };
      rawCache.set(k, cached);
    }
    Object.assign(out, cached.docs);
  }
  for (const k of [...rawCache.keys()]) if (!seen.has(k)) rawCache.delete(k);
  return out;
}

/** Сравнивает устройство с тем, что видели раньше, и ставит правки в очередь (p). Возвращает, сколько документов ждут отправки. */
export function scanChanges(state: SyncState, local: LocalDocs, now: number): number {
  for (const [id, d] of Object.entries(local)) {
    const st = state.docs[id];
    if (!st) { state.docs[id] = { h: null, o: d.h, ts: 0, p: now }; continue; }
    if (st.o !== d.h) {
      st.o = d.h;
      if (d.h === st.h) delete st.p; else st.p = Math.max(now, st.ts + 1);
    } else if (d.h !== st.h && st.p === undefined) {
      st.p = Math.max(now, st.ts + 1);
    }
  }
  for (const [id, st] of Object.entries(state.docs)) {
    if (local[id]) continue;
    if (st.o !== null) {
      st.o = null;
      if (st.h !== null) st.p = Math.max(now, st.ts + 1);
      else delete st.p;
    } else if (st.h !== null && st.p === undefined) {
      st.p = Math.max(now, st.ts + 1);
    }
    // создали и удалили, не успев отправить: следов в облаке нет
    if (st.h === null && st.o === null && st.p === undefined && st.ts === 0) delete state.docs[id];
  }
  return Object.values(state.docs).filter((s) => s.p !== undefined).length;
}

export interface RemoteRow { id: string; c: string | null; ts: number }

/**
 * Решает по каждой строке облака, брать ли её. Возвращает, что записать на устройство (null = удалить).
 * Правила: новее побеждает; без своей неотправленной правки берём любую более новую версию;
 * на новом устройстве (документ ещё не был в синхронизации) облако главнее.
 */
export function reconcileRemote(state: SyncState, local: LocalDocs, rows: RemoteRow[]): Record<string, string | null> {
  const writes: Record<string, string | null> = {};
  for (const r of rows) {
    const st = state.docs[r.id];
    const mine = local[r.id]?.c ?? null;
    const pending = st ? st.p !== undefined : mine !== null;
    let take: boolean;
    // документ, который на этом устройстве ещё ни разу не синхронизировался (в том числе замеченный сканом только что): облако главнее
    if (!st || (st.ts === 0 && st.h === null)) take = true;
    else if (!pending) take = r.ts > st.ts;
    else take = r.ts > st.ts && r.ts >= (st.p as number);
    if (!take) continue;
    const rh = r.c === null ? null : hashStr(r.c);
    state.docs[r.id] = { h: rh, o: rh, ts: r.ts };
    if (mine !== r.c) writes[r.id] = r.c;
  }
  return writes;
}

/** После полного чтения: документ, который мы считали синхронным, а в облаке его больше нет (аккаунт очищен с другого устройства), убираем и здесь. */
export function reconcileMissing(state: SyncState, local: LocalDocs, remoteIds: Set<string>): Record<string, string | null> {
  const writes: Record<string, string | null> = {};
  for (const [id, st] of Object.entries(state.docs)) {
    if (remoteIds.has(id) || st.p !== undefined || st.h === null) continue;
    delete state.docs[id];
    if (local[id]) writes[id] = null;
  }
  return writes;
}

// ---------- запись на устройство ----------

function writeLocal(store: Store, writes: Record<string, string | null>): string[] {
  const byKey: Record<string, Record<string, string | null>> = {};
  for (const [id, c] of Object.entries(writes)) (byKey[lsKeyOf(id)] ??= {})[id] = c;
  const failed: string[] = [];
  for (const [k, changes] of Object.entries(byKey)) {
    const ch = findChannel(k);
    if (!ch) continue;
    try {
      const next = applyDocs(ch, k, store.getItem(k), changes);
      if (next === null) store.removeItem(k); else store.setItem(k, next);
      window.dispatchEvent(new CustomEvent(REMOTE_WRITE_EVENT, { detail: { key: k } }));
      if (ch.event) window.dispatchEvent(new Event(ch.event));
    } catch {
      failed.push(...Object.keys(changes));
    }
  }
  return failed;
}

// ---------- обмен с облаком ----------

const aadOf = (userId: string, docId: string) => `${userId}:y:${docId}`;
const stateKey = (userId: string) => `dn.sync.v1.${userId}`;

function loadState(userId: string): SyncState {
  try {
    const v = JSON.parse(localStorage.getItem(stateKey(userId)) || 'null');
    if (v && typeof v === 'object' && v.docs && typeof v.docs === 'object') return { docs: v.docs, enc: Boolean(v.enc), cursor: typeof v.cursor === 'string' ? v.cursor : '' };
  } catch { /* начнём с чистого */ }
  return emptyState();
}

function saveState(userId: string, s: SyncState) {
  try { localStorage.setItem(stateKey(userId), JSON.stringify(s)); } catch { /* квота: в худшем случае отправим повторно */ }
}

export type CloudStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
export interface CloudInfo { status: CloudStatus; lastSync: number; pending: number; needsSetup: boolean }

let info: CloudInfo = { status: 'idle', lastSync: 0, pending: 0, needsSetup: false };
let listeners: (() => void)[] = [];
const setInfo = (patch: Partial<CloudInfo>) => {
  const next = { ...info, ...patch };
  if (next.status === info.status && next.lastSync === info.lastSync && next.pending === info.pending && next.needsSetup === info.needsSetup) return;
  info = next;
  listeners.forEach((l) => l());
};
export const getCloudInfo = () => info;
const subscribeInfo = (l: () => void) => { listeners.push(l); return () => { listeners = listeners.filter((x) => x !== l); }; };
export function useCloudInfo(): CloudInfo { return useSyncExternalStore(subscribeInfo, getCloudInfo); }

let current: { userId: string; run: (full?: boolean) => Promise<void>; stop: () => void } | null = null;

/** Синхронизировать прямо сейчас (кнопка в настройках). */
export function syncNow(): Promise<void> { return current ? current.run(true) : Promise.resolve(); }

/** Останавливает синхронизацию (перед очисткой данных). */
export function stopCloudSync() { current?.stop(); }

const isMissingTable = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' || /user_sync/.test(e.message ?? '') && /(does not exist|schema cache)/.test(e.message ?? '');

interface DbRow { key: string; value: { j?: unknown } | null; ts: number | string; deleted: boolean; updated_at: string }

async function pullRows(userId: string, cursor: string, full: boolean): Promise<{ rows: RemoteRow[]; cursor: string; ids: Set<string> }> {
  const rows: RemoteRow[] = [];
  const ids = new Set<string>();
  let maxAt = cursor;
  for (let from = 0; ; from += 1000) {
    let q = supabase!.from('user_sync').select('key,value,ts,deleted,updated_at').eq('user_id', userId);
    if (!full && cursor) q = q.gte('updated_at', cursor);
    const { data, error } = await q.order('updated_at', { ascending: true }).order('key', { ascending: true }).range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as DbRow[];
    for (const r of page) {
      ids.add(r.key);
      if (r.updated_at > maxAt) maxAt = r.updated_at;
      let c: string | null = null;
      if (!r.deleted) {
        const j = r.value?.j;
        if (typeof j !== 'string') continue;
        if (isSealed(j)) {
          if (!encryptionActive()) continue;
          try { c = await openText(j, aadOf(userId, r.key)); } catch { continue; }
        } else c = j;
      }
      rows.push({ id: r.key, c, ts: Number(r.ts) });
    }
    if (page.length < 1000) break;
  }
  return { rows, cursor: maxAt, ids };
}

async function pushPending(userId: string, state: SyncState, local: LocalDocs): Promise<boolean> {
  const pending = Object.entries(state.docs).filter(([, s]) => s.p !== undefined);
  for (let i = 0; i < pending.length; i += 50) {
    const chunk = pending.slice(i, i + 50);
    const items = await Promise.all(chunk.map(async ([id, st]) => {
      const c = local[id]?.c ?? null;
      if (c === null) return { key: id, ts: st.p, deleted: true };
      if (c.length > MAX_DOC) return null;
      return { key: id, ts: st.p, deleted: false, value: { j: encryptionActive() ? await sealText(c, aadOf(userId, id)) : c } };
    }));
    const { error } = await supabase!.rpc('sync_put_many', { items: items.filter(Boolean) });
    if (error) throw error;
    for (const [id, st] of chunk) {
      const c = local[id]?.c ?? null;
      st.h = c === null ? null : hashStr(c);
      st.ts = st.p as number;
      delete st.p;
    }
  }
  return true;
}

/** Запускает синхронизацию для вошедшего пользователя. Возвращает функцию остановки. */
export function startCloudSync(userId: string): () => void {
  const client = supabase;
  if (!client) return () => {};
  const state = loadState(userId);
  let running: Promise<void> | null = null;
  let again = false;
  let stopped = false;
  let lastFull = 0;
  let lastPull = 0;
  let blockedUntil = 0;
  let pullTimer: ReturnType<typeof setTimeout> | undefined;

  const scan = () => {
    // пустое хранилище = его очистили или оно недоступно: не принимаем это за «всё удалили»
    try { if (localStorage.length === 0) return { local: {} as LocalDocs, pending: 0 }; } catch { return { local: {} as LocalDocs, pending: 0 }; }
    const local = readLocalDocs(localStorage, state);
    const now = Date.now();
    if (state.enc !== encryptionActive()) {
      // шифрование включили или выключили: перезаписываем всё в новом виде
      for (const [id, st] of Object.entries(state.docs)) if (local[id]) st.p = Math.max(now, st.ts + 1);
      state.enc = encryptionActive();
    }
    return { local, pending: scanChanges(state, local, now) };
  };

  const cycle = async (wantPull: boolean, full: boolean) => {
    if (stopped || !canSync()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setInfo({ status: 'offline', pending: scan().pending }); return; }
    const first = scan();
    const needPull = wantPull || Date.now() - lastPull > 5 * 60_000;
    if (!needPull && first.pending === 0) { setInfo({ pending: 0 }); return; }
    setInfo({ status: 'syncing', pending: first.pending });
    try {
      if (needPull) {
        const doFull = full || !state.cursor || Date.now() - lastFull > 30 * 60_000;
        const got = await pullRows(userId, state.cursor, doFull);
        const local = readLocalDocs(localStorage, state);
        const writes = reconcileRemote(state, local, got.rows);
        if (doFull) Object.assign(writes, reconcileMissing(state, local, got.ids));
        for (const id of writeLocal(localStorage, writes)) delete state.docs[id];
        state.cursor = got.cursor;
        lastPull = Date.now();
        if (doFull) lastFull = lastPull;
      }
      const { local, pending } = scan();
      if (pending > 0) {
        await pushPending(userId, state, local);
      }
      saveState(userId, state);
      setInfo({ status: 'synced', lastSync: Date.now(), pending: scan().pending, needsSetup: false });
    } catch (e) {
      saveState(userId, state);
      const err = e as { code?: string; message?: string };
      if (isMissingTable(err)) { blockedUntil = Date.now() + 10 * 60_000; setInfo({ status: 'error', needsSetup: true, pending: scan().pending }); return; }
      console.error('[SYNC] cloud sync failed:', e);
      blockedUntil = Date.now() + 20_000; // не долбим сервер каждые 3 секунды, пока он недоступен
      setInfo({ status: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error', pending: scan().pending });
    }
  };

  const run = (full = false, wantPull = true): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (!full && Date.now() < blockedUntil) return Promise.resolve();
    if (running) { again = true; return running; }
    running = (async () => {
      try {
        await cycle(wantPull, full);
        while (again && !stopped) { again = false; await cycle(false, false); }
      } finally { running = null; }
    })();
    return running;
  };

  const schedulePull = () => { clearTimeout(pullTimer); pullTimer = setTimeout(() => { void run(); }, 500); };

  const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
  const onOnline = () => { void run(); };
  const onFlush = () => { if (document.visibilityState === 'hidden') void run(false, false); };
  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('visibilitychange', onFlush);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOnline);
  window.addEventListener('pagehide', onFlush);

  // изменения на этом устройстве замечаем раз в пару секунд (дёшево: сравниваем строки), отправляем сразу
  const poll = setInterval(() => { if (!stopped && !running) void run(false, false); }, 3000);

  const channel = client
    .channel(`user-sync-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sync', filter: `user_id=eq.${userId}` }, schedulePull)
    .subscribe();

  void run(false);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(poll);
    clearTimeout(pullTimer);
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('visibilitychange', onFlush);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOnline);
    window.removeEventListener('pagehide', onFlush);
    client.removeChannel(channel);
    saveState(userId, state);
    if (current?.stop === stop) current = null;
  };
  current = { userId, run: (full) => run(Boolean(full), true), stop };
  return stop;
}

/** «Стереть все данные»: удаляем облачные документы и забываем состояние (вызывать после stopCloudSync). */
export async function deleteAllCloudDocs(userId: string): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase.from('user_sync').delete().eq('user_id', userId);
  // нет таблицы (миграция не выполнена) = стирать нечего
  if (error && !isMissingTable(error)) { console.error('[SYNC] Failed to delete cloud docs:', error); return false; }
  return true;
}

/** Стирает с устройства всё, что синхронизируется этим слоем, и его служебное состояние. */
export function wipeCloudLocal(userId: string | null) {
  try {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (findChannel(k) || k.startsWith('dn.sync.') || k === 'dn.outbox')) drop.push(k);
    }
    drop.forEach((k) => localStorage.removeItem(k));
    if (userId) localStorage.removeItem(stateKey(userId));
  } catch { /* ignore */ }
  rawCache.clear();
}
