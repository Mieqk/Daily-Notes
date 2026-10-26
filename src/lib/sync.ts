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

export async function performInitialSync(userId: string) {
  if (!supabase) return null;

  setSyncStatus('syncing');

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

    setSyncStatus('synced');
    return { notes, tasks, moods, tags, photos, sleep, settings: remoteSettings, writtenOn, unreadable, plainRows };
  } catch (error) {
    console.error('[SYNC] Initial sync failed:', error);
    setSyncStatus('error');
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

const debouncedUpsertEntry = debounceByKey(async (userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) => {
  if (isLocalMode() || !supabase || !canSync()) return;
  let row: { content: string; tags: string[]; photos: string[] } = { content, tags, photos };
  if (encryptionActive()) {
    const hasBody = content.trim() || tags.length > 0 || photos.length > 0;
    row = { content: hasBody ? await sealEntry(userId, date, { c: content, t: tags, p: photos }) : '', tags: [], photos: [] };
  }
  const { error } = await supabase.from('entries').upsert({ user_id: userId, date, ...row, mood, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] Failed to sync entry:', error);
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertTasks = debounceByKey(async (userId: string, date: string, tasks: Task[]) => {
  if (isLocalMode() || !supabase || !canSync()) return;
  const { data: existing, error: selErr } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('date', date);
  if (selErr) { console.error('[SYNC] Failed to read tasks:', selErr); return; }
  const toDelete = (existing ?? []).map((t) => t.id).filter((id) => !tasks.find((t) => t.id === id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('tasks').delete().in('id', toDelete).eq('user_id', userId);
    if (delErr) { console.error('[SYNC] Failed to delete tasks:', delErr); return; }
  }
  if (tasks.length === 0) return;
  const tasksToUpsert = await Promise.all(tasks.map(async (t) => ({ user_id: userId, date, id: t.id, title: encryptionActive() && t.text ? await sealText(t.text, taskAad(userId, t.id)) : t.text, completed: t.done })));
  const { error } = await supabase.from('tasks').upsert(tasksToUpsert);
  if (error) console.error('[SYNC] Failed to sync tasks:', error);
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertSleep = debounceByKey(async (userId: string, date: string, sleepData: SleepData) => {
  if (isLocalMode() || !supabase || !canSync()) return;
  const note = encryptionActive() && sleepData.note ? await sealText(sleepData.note, sleepAad(userId, date)) : sleepData.note || '';
  const { error } = await supabase.from('sleep_logs').upsert({ user_id: userId, date, sleep_start: sleepData.bedtime || '', sleep_end: sleepData.waketime || '', hours: sleepData.hours || 0, quality: sleepData.quality || 0, awakenings: sleepData.awakenings || 0, note }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] Failed to sync sleep:', error);
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertSettings = debounceByKey(async (userId: string, settings: Record<string, unknown>) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('profiles').update({ settings }).eq('id', userId);
  if (error) console.error('[SYNC] Failed to sync settings:', error);
}, 2000, (userId) => userId);

export function syncEntry(userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) { debouncedUpsertEntry(userId, date, content, mood, tags, photos); }
export function syncTasks(userId: string, date: string, tasks: Task[]) { debouncedUpsertTasks(userId, date, tasks); }
export function syncSleep(userId: string, date: string, sleepData: SleepData) { debouncedUpsertSleep(userId, date, sleepData); }
export function syncSettings(userId: string, settings: { theme?: string; lang?: string; font?: number; writingFont?: string; bg?: string; moodEmoji?: string[]; capsules?: Record<string, string>; look?: unknown }) { debouncedUpsertSettings(userId, settings); }

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
  return !failed;
}
