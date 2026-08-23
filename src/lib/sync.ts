import { supabase } from './supabase';
import type { SleepData, Task } from '../store';

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function isLocalMode(): boolean { return localStorage.getItem('dn.localMode') === 'true'; }
export function setLocalMode(value: boolean) { localStorage.setItem('dn.localMode', value.toString()); }

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

export async function performInitialSync() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  setSyncStatus('syncing');

  try {
    const [entriesRes, tasksRes, sleepRes, profileRes] = await Promise.all([
      supabase.from('entries').select('*').eq('user_id', user.id),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('sleep_logs').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('settings').eq('id', user.id).single(),
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (sleepRes.error) throw sleepRes.error;

    const remoteEntries = entriesRes.data || [];
    const remoteTasks = tasksRes.data || [];
    const remoteSleep = sleepRes.data || [];
    const remoteSettings = profileRes.data?.settings || {};
    
    // Создаем чистое состояние ТОЛЬКО из данных базы, игнорируя старый локальный мусор
    const finalNotes: Record<string, string> = {};
    const finalTasks: Record<string, Task[]> = {};
    const finalMoods: Record<string, number> = {};
    const finalTags: Record<string, string[]> = {};
    const finalPhotos: Record<string, string[]> = {};
    const finalSleep: Record<string, SleepData> = {};

    for (const entry of remoteEntries) {
      finalNotes[entry.date] = entry.content || '';
      if (entry.mood !== null && entry.mood !== undefined) finalMoods[entry.date] = entry.mood;
      if (entry.tags && entry.tags.length > 0) finalTags[entry.date] = entry.tags;
      if (entry.photos && Array.isArray(entry.photos)) finalPhotos[entry.date] = entry.photos;
    }

    for (const task of remoteTasks) {
      if (!finalTasks[task.date]) finalTasks[task.date] = [];
      finalTasks[task.date].push({ id: task.id, text: task.title, done: task.completed });
    }

    for (const sleep of remoteSleep) {
      finalSleep[sleep.date] = {
        hours: sleep.sleep_start ? parseFloat(sleep.sleep_start) : 0,
        quality: sleep.quality || 0,
        bedtime: sleep.sleep_start || '',
        waketime: sleep.sleep_end || '',
      };
    }

    // Перезаписываем localStorage чистыми данными с сервера
    localStorage.setItem('dn.notes', JSON.stringify(finalNotes));
    localStorage.setItem('dn.tasks', JSON.stringify(finalTasks));
    localStorage.setItem('dn.moods', JSON.stringify(finalMoods));
    localStorage.setItem('dn.tags', JSON.stringify(finalTags));
    localStorage.setItem('dn.photos', JSON.stringify(finalPhotos));
    localStorage.setItem('dn.sleep', JSON.stringify(finalSleep));

    if (remoteSettings.theme) localStorage.setItem('dn.theme', remoteSettings.theme);
    if (remoteSettings.lang) localStorage.setItem('dn.lang', remoteSettings.lang);
    if (remoteSettings.font !== undefined) localStorage.setItem('dn.font', String(remoteSettings.font));
    if (remoteSettings.writingFont) localStorage.setItem('dn.writingFont', remoteSettings.writingFont);
    if (remoteSettings.bg) localStorage.setItem('dn.bg', remoteSettings.bg);
    if (remoteSettings.moodEmoji) localStorage.setItem('dn.emoji', JSON.stringify(remoteSettings.moodEmoji));

    setSyncStatus('synced');
    return { notes: finalNotes, tasks: finalTasks, moods: finalMoods, tags: finalTags, photos: finalPhotos, sleep: finalSleep, settings: remoteSettings };
  } catch (error) {
    console.error('[SYNC] Initial sync failed:', error);
    setSyncStatus('error');
    return null;
  }
}

const debouncedUpsertEntry = debounce(async (userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('entries').upsert({ user_id: userId, date, content, mood, tags, photos, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] Failed to sync entry:', error);
}, 2000);

const debouncedUpsertTasks = debounce(async (userId: string, date: string, tasks: Task[]) => {
  if (isLocalMode() || !supabase) return;
  const tasksToUpsert = tasks.map(t => ({ user_id: userId, date, id: t.id, title: t.text, completed: t.done }));
  const { data: existing } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('date', date);
  const existingIds = existing?.map(t => t.id) || [];
  const toDelete = existingIds.filter(id => !tasks.find(t => t.id === id));
  if (toDelete.length > 0) await supabase.from('tasks').delete().in('id', toDelete);
  const { error } = await supabase.from('tasks').upsert(tasksToUpsert);
  if (error) console.error('[SYNC] Failed to sync tasks:', error);
}, 2000);

const debouncedUpsertSleep = debounce(async (userId: string, date: string, sleepData: SleepData) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('sleep_logs').upsert({ user_id: userId, date, sleep_start: sleepData.bedtime || String(sleepData.hours), sleep_end: sleepData.waketime || '', quality: sleepData.quality }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] Failed to sync sleep:', error);
}, 2000);

const debouncedUpsertSettings = debounce(async (userId: string, settings: Record<string, unknown>) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('profiles').update({ settings }).eq('id', userId);
  if (error) console.error('[SYNC] Failed to sync settings:', error);
}, 2000);

export function syncEntry(userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) { debouncedUpsertEntry(userId, date, content, mood, tags, photos); }
export function syncTasks(userId: string, date: string, tasks: Task[]) { debouncedUpsertTasks(userId, date, tasks); }
export function syncSleep(userId: string, date: string, sleepData: SleepData) { debouncedUpsertSleep(userId, date, sleepData); }
export function syncSettings(userId: string, settings: { theme?: string; lang?: string; font?: number; writingFont?: string; bg?: string; moodEmoji?: string[] }) { debouncedUpsertSettings(userId, settings); }
