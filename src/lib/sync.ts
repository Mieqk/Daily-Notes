import { supabase } from './supabase';
import type { SleepData, Task } from '../store';
import { canSync, encryptionActive, isSealed, openEntry, openText, sealEntry, sealText, sleepAad, taskAad } from './e2ee';

export function isLocalMode(): boolean {
  return localStorage.getItem('dn.localMode') === 'true';
}

export function setLocalMode(value: boolean) {
  localStorage.setItem('dn.localMode', value.toString());
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

let currentSyncStatus: SyncStatus = 'idle';
let syncStatusListeners: ((status: SyncStatus) => void)[] = [];

export function getSyncStatus(): SyncStatus { return currentSyncStatus; }

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void) {
  syncStatusListeners.push(listener);
  listener(currentSyncStatus);
  return () => { syncStatusListeners = syncStatusListeners.filter(l => l !== listener); };
}

function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  syncStatusListeners.forEach(l => l(status));
}

/** Название задачи из строки базы; null, если расшифровать не вышло. */
export async function decodeTitle(userId: string, row: { id: string; title: string }): Promise<string | null> {
  try { return await openText(row.title ?? '', taskAad(userId, row.id)); } catch { return null; }
}

export async function decodeNote(userId: string, row: { date: string; note: string | null }): Promise<string | null> {
  try { return await openText(row.note ?? '', sleepAad(userId, row.date)); } catch { return null; }
}

export async function performInitialSync(userId: string, quiet = false) {
  if (!supabase) return null;

  if (!quiet) setSyncStatus('syncing');

  try {
    const [entriesRes, tasksRes, sleepRes, profileRes] = await Promise.all([
      supabase.from('entries').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('sleep_logs').select('*').eq('user_id', userId),
      supabase.from('profiles').select('settings').eq('id', userId).single(),
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (sleepRes.error) throw sleepRes.error;

    const remoteEntries = entriesRes.data || [];
    const remoteTasks = tasksRes.data || [];
    const remoteSleep = sleepRes.data || [];
    const remoteSettings = profileRes.data?.settings || {};

    const notes: Record<string, string> = {};
    const tasks: Record<string, Task[]> = {};
    const moods: Record<string, number> = {};
    const tags: Record<string, string[]> = {};
    const photos: Record<string, string[]> = {};
    const sleep: Record<string, SleepData> = {};

    const writtenOn: Record<string, boolean> = {};
    let unreadable = 0;
    let plainRows = 0;
    for (const entry of remoteEntries) {
      const body = await openEntry(userId, entry);
      if (!body) { unreadable += 1; continue; }
      if (!isSealed(entry.content) && (body.c.trim() || body.t.length || body.p.length)) plainRows += 1;
      notes[entry.date] = body.c;
      if (entry.mood !== null && entry.mood !== undefined) moods[entry.date] = entry.mood;
      if (body.t.length > 0) tags[entry.date] = body.t;
      if (body.p.length > 0) photos[entry.date] = body.p;
      const ref = entry.created_at || entry.updated_at;
      if (ref) {
        const d = new Date(ref);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        writtenOn[entry.date] = iso === entry.date;
      }
    }

    for (const task of remoteTasks) {
      const text = await decodeTitle(userId, task);
      if (text === null) { unreadable += 1; continue; }
      if (!tasks[task.date]) tasks[task.date] = [];
      tasks[task.date].push({ id: task.id, text, done: task.completed });
      if (!isSealed(task.title) && task.title) plainRows += 1;
    }

    for (const s of remoteSleep) {
      const note = await decodeNote(userId, s);
      if (note === null) { unreadable += 1; continue; }
      if (!isSealed(s.note) && s.note) plainRows += 1;
      sleep[s.date] = {
        hours: Number(s.hours) || 0,
        quality: s.quality || 0,
        bedtime: s.sleep_start || '',
        waketime: s.sleep_end || '',
        awakenings: Number(s.awakenings) || 0,
        note,
      };
    }

    if (!quiet) setSyncStatus('synced');
    return { notes, tasks, moods, tags, photos, sleep, settings: remoteSettings, writtenOn, unreadable, plainRows };
  } catch (error) {
    console.error('[SYNC] Initial sync failed:', error);
    if (!quiet) setSyncStatus('error');
    return null;
  }
}

// Все отложенные отправки: нужны, чтобы сбросить их разом при закрытии вкладки
const pendingFlushers = new Set<() => void>();

/** Немедленно отправляет всё, что ждёт своих 2 секунд (вызывать при скрытии/закрытии страницы). */
export function flushPendingSync() {
  [...pendingFlushers].forEach((f) => f());
}

// Отдельный таймер на ключ (пользователь + дата), чтобы правки разных дней не затирали друг друга
function debounceByKey<A extends unknown[]>(fn: (...args: A) => void | Promise<void>, delay: number, keyOf: (...args: A) => string) {
  const timers = new Map<string, { id: ReturnType<typeof setTimeout>; run: () => void }>();
  return (...args: A) => {
    const key = keyOf(...args);
    const prev = timers.get(key);
    if (prev) { clearTimeout(prev.id); pendingFlushers.delete(prev.run); }
    const run = () => {
      const cur = timers.get(key);
      if (cur) clearTimeout(cur.id);
      timers.delete(key);
      pendingFlushers.delete(run);
      void fn(...args);
    };
    timers.set(key, { id: setTimeout(run, delay), run });
    pendingFlushers.add(run);
  };
}

// ---------- офлайн-очередь ----------
// Пока правка не дошла до сервера, её метка лежит в localStorage (dn.outbox). Нет сети, сервер ответил ошибкой,
// вкладку закрыли раньше времени: метка остаётся, при возвращении сети или при следующем запуске правку отправим заново.

const OUTBOX_KEY = 'dn.outbox';
type OutKind = 'e' | 't' | 's' | 'p';
const outId = (k: OutKind, date?: string) => (date ? `${k}:${date}` : k);

function readOutbox(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
function writeOutbox(list: string[]) {
  try { if (list.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); else localStorage.removeItem(OUTBOX_KEY); } catch { /* квота */ }
}

const dirtySeq = new Map<string, number>();
function markDirty(id: string): number {
  const seq = (dirtySeq.get(id) ?? 0) + 1;
  dirtySeq.set(id, seq);
  const list = readOutbox();
  if (!list.includes(id)) writeOutbox([...list, id]);
  return seq;
}
function markClean(id: string, seq: number) {
  if ((dirtySeq.get(id) ?? 0) !== seq) return; // за время отправки правили ещё раз: остаётся в очереди
  writeOutbox(readOutbox().filter((x) => x !== id));
}

/** Есть ли неотправленная правка этой даты (запись, задачи, сон) или настроек (kind 'p'). */
export function outboxHas(kind: OutKind, date?: string): boolean { return readOutbox().includes(outId(kind, date)); }
export function outboxCount(): number { return readOutbox().length; }
export function outboxHasAny(): boolean { return outboxCount() > 0 || pendingFlushers.size > 0; }

export interface OutboxSource {
  notes: Record<string, string>; moods: Record<string, number>; tags: Record<string, string[]>; photos: Record<string, string[]>;
  tasks: Record<string, Task[]>; sleep: Record<string, SleepData>; settings: () => Record<string, unknown>;
}
let outboxSource: (() => OutboxSource) | null = null;
export function setOutboxSource(fn: (() => OutboxSource) | null) { outboxSource = fn; }

async function pushEntry(userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]): Promise<boolean> {
  if (isLocalMode() || !supabase) return true;
  if (!canSync()) return false;
  try {
    let row: { content: string; tags: string[]; photos: string[] } = { content, tags, photos };
    if (encryptionActive()) {
      const hasBody = content.trim() || tags.length > 0 || photos.length > 0;
      row = { content: hasBody ? await sealEntry(userId, date, { c: content, t: tags, p: photos }) : '', tags: [], photos: [] };
    }
    const { error } = await supabase.from('entries').upsert({ user_id: userId, date, ...row, mood, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
    if (error) { console.error('[SYNC] Failed to sync entry:', error); return false; }
    return true;
  } catch (e) { console.error('[SYNC] Failed to sync entry:', e); return false; }
}

async function pushTasks(userId: string, date: string, tasks: Task[]): Promise<boolean> {
  if (isLocalMode() || !supabase) return true;
  if (!canSync()) return false;
  try {
    const { data: existing, error: selErr } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('date', date);
    if (selErr) { console.error('[SYNC] Failed to read tasks:', selErr); return false; }
    const toDelete = (existing ?? []).map((t) => t.id).filter((id) => !tasks.find((t) => t.id === id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('tasks').delete().in('id', toDelete).eq('user_id', userId);
      if (delErr) { console.error('[SYNC] Failed to delete tasks:', delErr); return false; }
    }
    if (tasks.length === 0) return true;
    const tasksToUpsert = await Promise.all(tasks.map(async (t) => ({ user_id: userId, date, id: t.id, title: encryptionActive() && t.text ? await sealText(t.text, taskAad(userId, t.id)) : t.text, completed: t.done })));
    const { error } = await supabase.from('tasks').upsert(tasksToUpsert);
    if (error) { console.error('[SYNC] Failed to sync tasks:', error); return false; }
    return true;
  } catch (e) { console.error('[SYNC] Failed to sync tasks:', e); return false; }
}

async function pushSleep(userId: string, date: string, sleepData: SleepData): Promise<boolean> {
  if (isLocalMode() || !supabase) return true;
  if (!canSync()) return false;
  try {
    const note = encryptionActive() && sleepData.note ? await sealText(sleepData.note, sleepAad(userId, date)) : sleepData.note || '';
    const { error } = await supabase.from('sleep_logs').upsert({ user_id: userId, date, sleep_start: sleepData.bedtime || '', sleep_end: sleepData.waketime || '', hours: sleepData.hours || 0, quality: sleepData.quality || 0, awakenings: sleepData.awakenings || 0, note }, { onConflict: 'user_id,date' });
    if (error) { console.error('[SYNC] Failed to sync sleep:', error); return false; }
    return true;
  } catch (e) { console.error('[SYNC] Failed to sync sleep:', e); return false; }
}

async function pushSettings(userId: string, settings: Record<string, unknown>): Promise<boolean> {
  if (isLocalMode() || !supabase) return true;
  try {
    const { error } = await supabase.from('profiles').update({ settings }).eq('id', userId);
    if (error) { console.error('[SYNC] Failed to sync settings:', error); return false; }
    return true;
  } catch (e) { console.error('[SYNC] Failed to sync settings:', e); return false; }
}

async function finish(id: string, seq: number, ok: boolean) {
  if (ok) { markClean(id, seq); if (!outboxCount()) setSyncStatus('synced'); } else setSyncStatus('error');
}

const debouncedUpsertEntry = debounceByKey(async (userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[], seq: number) => {
  await finish(outId('e', date), seq, await pushEntry(userId, date, content, mood, tags, photos));
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertTasks = debounceByKey(async (userId: string, date: string, tasks: Task[], seq: number) => {
  await finish(outId('t', date), seq, await pushTasks(userId, date, tasks));
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertSleep = debounceByKey(async (userId: string, date: string, sleepData: SleepData, seq: number) => {
  await finish(outId('s', date), seq, await pushSleep(userId, date, sleepData));
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertSettings = debounceByKey(async (userId: string, settings: Record<string, unknown>, seq: number) => {
  await finish(outId('p'), seq, await pushSettings(userId, settings));
}, 2000, (userId) => userId);

export function syncEntry(userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) { debouncedUpsertEntry(userId, date, content, mood, tags, photos, markDirty(outId('e', date))); }
export function syncTasks(userId: string, date: string, tasks: Task[]) { debouncedUpsertTasks(userId, date, tasks, markDirty(outId('t', date))); }
export function syncSleep(userId: string, date: string, sleepData: SleepData) { debouncedUpsertSleep(userId, date, sleepData, markDirty(outId('s', date))); }
export function syncSettings(userId: string, settings: { theme?: string; lang?: string; font?: number; writingFont?: string; bg?: string; moodEmoji?: string[]; capsules?: Record<string, string>; look?: unknown }) { debouncedUpsertSettings(userId, settings, markDirty(outId('p'))); }

let retrying = false;
/** Отправляет то, что осталось в очереди (после обрыва сети или перезапуска). Берёт актуальные данные с устройства. */
export async function retryOutbox(userId: string): Promise<void> {
  if (retrying || isLocalMode() || !supabase || !outboxSource || !canSync()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const ids = readOutbox();
  if (!ids.length) return;
  retrying = true;
  try {
    for (const id of ids) {
      const src = outboxSource();
      const seq = dirtySeq.get(id) ?? 0;
      const [kind, date] = id.split(':') as [OutKind, string | undefined];
      let ok = true;
      if (kind === 'e' && date) ok = await pushEntry(userId, date, src.notes[date] ?? '', src.moods[date] ?? null, src.tags[date] ?? [], src.photos[date] ?? []);
      else if (kind === 't' && date) ok = await pushTasks(userId, date, src.tasks[date] ?? []);
      else if (kind === 's' && date) { const v = src.sleep[date]; ok = v ? await pushSleep(userId, date, v) : true; }
      else if (kind === 'p') ok = await pushSettings(userId, src.settings());
      await finish(id, seq, ok);
    }
  } finally { retrying = false; }
}

export interface LocalData {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  tags: Record<string, string[]>;
  photos: Record<string, string[]>;
  sleep: Record<string, SleepData>;
}

/**
 * Первый вход с уже накопленными локальными данными: серверные данные главнее,
 * но то, чего на сервере ещё нет, не теряется. Возвращает объединённое и список дат на выгрузку.
 */
export function mergeLocalIntoRemote(remote: LocalData, local: LocalData) {
  const merged: LocalData = {
    notes: { ...remote.notes }, tasks: { ...remote.tasks }, moods: { ...remote.moods },
    tags: { ...remote.tags }, photos: { ...remote.photos }, sleep: { ...remote.sleep },
  };
  const entries = new Set<string>();
  const taskDates = new Set<string>();
  const sleepDates = new Set<string>();

  const dates = new Set([...Object.keys(local.notes), ...Object.keys(local.moods), ...Object.keys(local.tags), ...Object.keys(local.photos)]);
  for (const d of dates) {
    const hasLocal = (local.notes[d] ?? '').trim() || local.moods[d] !== undefined || (local.tags[d]?.length ?? 0) > 0 || (local.photos[d]?.length ?? 0) > 0;
    if (!hasLocal) continue;
    const remoteBlank = !(remote.notes[d] ?? '').trim() && remote.moods[d] === undefined;
    if (!(d in remote.notes) || remoteBlank) {
      merged.notes[d] = local.notes[d] ?? '';
      if (local.moods[d] !== undefined) merged.moods[d] = local.moods[d];
      if (local.tags[d]) merged.tags[d] = local.tags[d];
      if (local.photos[d]) merged.photos[d] = local.photos[d];
      entries.add(d);
    }
  }
  for (const [d, list] of Object.entries(local.tasks)) {
    if (list?.length && !remote.tasks[d]?.length) { merged.tasks[d] = list; taskDates.add(d); }
  }
  for (const [d, v] of Object.entries(local.sleep)) {
    if (v && !(d in remote.sleep)) { merged.sleep[d] = v; sleepDates.add(d); }
  }
  return { merged, entries, taskDates, sleepDates };
}

/**
 * Подтягивание чужих правок в уже работающее приложение (трёхсторонне): что в облаке изменилось с прошлого раза и чего мы
 * сами не трогали (и не ждёт отправки), то берём; свои неотправленные правки не затираем.
 * snap — то, что мы в последний раз знали об облаке; local — что на экране сейчас; remote — что в облаке сейчас.
 */
export function mergeRemoteChanges<V>(snap: Record<string, V>, local: Record<string, V>, remote: Record<string, V>, isDirty: (key: string) => boolean): Record<string, V> {
  const out: Record<string, V> = { ...local };
  for (const k of new Set([...Object.keys(snap), ...Object.keys(local), ...Object.keys(remote)])) {
    if (isDirty(k)) continue;
    if (JSON.stringify(snap[k] ?? null) === JSON.stringify(remote[k] ?? null)) continue;
    if (remote[k] === undefined) delete out[k]; else out[k] = remote[k];
  }
  return out;
}

/** «Стереть все данные» для вошедшего пользователя: удаляем и на сервере, иначе синхронизация вернёт всё обратно. */
export async function deleteAllRemote(userId: string): Promise<boolean> {
  if (isLocalMode() || !supabase) return true;
  const results = await Promise.all([
    supabase.from('entries').delete().eq('user_id', userId),
    supabase.from('tasks').delete().eq('user_id', userId),
    supabase.from('sleep_logs').delete().eq('user_id', userId),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) console.error('[SYNC] Failed to delete remote data:', failed.error);
  else writeOutbox([]);
  return !failed;
}
