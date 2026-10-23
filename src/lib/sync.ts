import { supabase } from './supabase';
import type { SleepData, Task } from '../store';

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
    for (const entry of remoteEntries) {
      notes[entry.date] = entry.content || '';
      if (entry.mood !== null && entry.mood !== undefined) moods[entry.date] = entry.mood;
      if (entry.tags && entry.tags.length > 0) tags[entry.date] = entry.tags;
      if (entry.photos && Array.isArray(entry.photos)) photos[entry.date] = entry.photos;
      const ref = entry.created_at || entry.updated_at;
      if (ref) {
        const d = new Date(ref);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        writtenOn[entry.date] = iso === entry.date;
      }
    }

    for (const task of remoteTasks) {
      if (!tasks[task.date]) tasks[task.date] = [];
      tasks[task.date].push({ id: task.id, text: task.title, done: task.completed });
    }

    for (const s of remoteSleep) {
      sleep[s.date] = {
        hours: Number(s.hours) || 0,
        quality: s.quality || 0,
        bedtime: s.sleep_start || '',
        waketime: s.sleep_end || '',
        awakenings: Number(s.awakenings) || 0,
        note: s.note || '',
      };
    }

    setSyncStatus('synced');
    return { notes, tasks, moods, tags, photos, sleep, settings: remoteSettings, writtenOn };
  } catch (error) {
    console.error('[SYNC] Initial sync failed:', error);
    setSyncStatus('error');
    return null;
  }
}

// Отдельный таймер на ключ (пользователь + дата), чтобы правки разных дней не затирали друг друга
function debounceByKey<A extends unknown[]>(fn: (...args: A) => void | Promise<void>, delay: number, keyOf: (...args: A) => string) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return (...args: A) => {
    const key = keyOf(...args);
    const prev = timers.get(key);
    if (prev) clearTimeout(prev);
    timers.set(key, setTimeout(() => { timers.delete(key); void fn(...args); }, delay));
  };
}

const debouncedUpsertEntry = debounceByKey(async (userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('entries').upsert({ user_id: userId, date, content, mood, tags, photos, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] Failed to sync entry:', error);
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertTasks = debounceByKey(async (userId: string, date: string, tasks: Task[]) => {
  if (isLocalMode() || !supabase) return;
  const { data: existing, error: selErr } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('date', date);
  if (selErr) { console.error('[SYNC] Failed to read tasks:', selErr); return; }
  const toDelete = (existing ?? []).map((t) => t.id).filter((id) => !tasks.find((t) => t.id === id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('tasks').delete().in('id', toDelete).eq('user_id', userId);
    if (delErr) { console.error('[SYNC] Failed to delete tasks:', delErr); return; }
  }
  if (tasks.length === 0) return;
  const tasksToUpsert = tasks.map((t) => ({ user_id: userId, date, id: t.id, title: t.text, completed: t.done }));
  const { error } = await supabase.from('tasks').upsert(tasksToUpsert);
  if (error) console.error('[SYNC] Failed to sync tasks:', error);
}, 2000, (userId, date) => `${userId}:${date}`);

const debouncedUpsertSleep = debounceByKey(async (userId: string, date: string, sleepData: SleepData) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('sleep_logs').upsert({ user_id: userId, date, sleep_start: sleepData.bedtime || '', sleep_end: sleepData.waketime || '', hours: sleepData.hours || 0, quality: sleepData.quality || 0, awakenings: sleepData.awakenings || 0, note: sleepData.note || '' }, { onConflict: 'user_id,date' });
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
export function syncSettings(userId: string, settings: { theme?: string; lang?: string; font?: number; writingFont?: string; bg?: string; moodEmoji?: string[] }) { debouncedUpsertSettings(userId, settings); }
