import { supabase } from './supabase';
import type { SleepData, Task } from '../store';

const KEYS = {
  notes: 'dn.notes', tasks: 'dn.tasks', moods: 'dn.moods', tags: 'dn.tags',
  photos: 'dn.photos', sleep: 'dn.sleep', theme: 'dn.theme', lang: 'dn.lang',
  font: 'dn.font', writingFont: 'dn.wfont', bg: 'dn.bg', moodEmoji: 'dn.emoji',
  localMode: 'dn.localMode', lastSync: 'dn.lastSync',
};

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

export function isLocalMode(): boolean { return localStorage.getItem(KEYS.localMode) === 'true'; }
export function setLocalMode(value: boolean) { localStorage.setItem(KEYS.localMode, value.toString()); }

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
  if (!supabase) { console.error('[SYNC] Supabase client is null'); return null; }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.warn('[SYNC] No user found'); return null; }

  console.log('[SYNC] 🔄 Starting initial sync for user:', user.id);
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

    // 🔥 ДЕТЕКТОР ЛЖИ: показываем точные даты и содержимое 🔥
    console.log('[SYNC] 📦 RAW data from Supabase:', {
      entriesCount: remoteEntries.length,
      entries: remoteEntries.map(e => ({ 
        date: e.date, 
        content_preview: e.content ? e.content.substring(0, 30) + (e.content.length > 30 ? '...' : '') : '[ПУСТО]',
        updated_at: e.updated_at 
      })),
      tasksCount: remoteTasks.length,
      sleepCount: remoteSleep.length
    });

    const hasRemoteData = remoteEntries.length > 0 || remoteTasks.length > 0 || remoteSleep.length > 0;

    if (hasRemoteData) {
      console.log('[SYNC] Remote data found, merging...');
      const localNotes = getLocal<Record<string, string>>(KEYS.notes, {});
      const localTasks = getLocal<Record<string, Task[]>>(KEYS.tasks, {});
      const localMoods = getLocal<Record<string, number>>(KEYS.moods, {});
      const localTags = getLocal<Record<string, string[]>>(KEYS.tags, {});
      const localPhotos = getLocal<Record<string, string[]>>(KEYS.photos, {});
      const localSleep = getLocal<Record<string, SleepData>>(KEYS.sleep, {});

      for (const entry of remoteEntries) {
        const iso = entry.date;
        // Если удалённая запись новее или локальной нет, берём удалённую
        const remoteUpdated = entry.updated_at ? new Date(entry.updated_at).getTime() : 0;
        const localExists = localNotes[iso] !== undefined;
        
        if (!localExists || remoteUpdated >= 0) { 
          localNotes[iso] = entry.content || '';
          if (entry.mood !== null && entry.mood !== undefined) localMoods[iso] = entry.mood;
          if (entry.tags && entry.tags.length > 0) localTags[iso] = entry.tags;
          if (entry.photos && Array.isArray(entry.photos)) localPhotos[iso] = entry.photos;
        }
      }

      for (const task of remoteTasks) {
        const iso = task.date;
        if (!localTasks[iso]) localTasks[iso] = [];
        if (!localTasks[iso].find(t => t.id === task.id)) {
          localTasks[iso].push({ id: task.id, text: task.title, done: task.completed });
        }
      }

      for (const sleep of remoteSleep) {
        const iso = sleep.date;
        if (!localSleep[iso]) {
          localSleep[iso] = {
            hours: sleep.sleep_start ? parseFloat(sleep.sleep_start) : 0,
            quality: sleep.quality || 0,
            bedtime: sleep.sleep_start || '',
            waketime: sleep.sleep_end || '',
          };
        }
      }

      localStorage.setItem(KEYS.notes, JSON.stringify(localNotes));
      localStorage.setItem(KEYS.tasks, JSON.stringify(localTasks));
      localStorage.setItem(KEYS.moods, JSON.stringify(localMoods));
      localStorage.setItem(KEYS.tags, JSON.stringify(localTags));
      localStorage.setItem(KEYS.photos, JSON.stringify(localPhotos));
      localStorage.setItem(KEYS.sleep, JSON.stringify(localSleep));

      if (remoteSettings.theme) localStorage.setItem(KEYS.theme, remoteSettings.theme);
      if (remoteSettings.lang) localStorage.setItem(KEYS.lang, remoteSettings.lang);
      if (remoteSettings.font !== undefined) localStorage.setItem(KEYS.font, String(remoteSettings.font));
      if (remoteSettings.writingFont) localStorage.setItem(KEYS.writingFont, remoteSettings.writingFont);
      if (remoteSettings.bg) localStorage.setItem(KEYS.bg, remoteSettings.bg);
      if (remoteSettings.moodEmoji) localStorage.setItem(KEYS.moodEmoji, JSON.stringify(remoteSettings.moodEmoji));

      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
      setSyncStatus('synced');
      
      return { notes: localNotes, tasks: localTasks, moods: localMoods, tags: localTags, photos: localPhotos, sleep: localSleep, settings: remoteSettings };
    } else {
      console.log('[SYNC] Remote is empty. Keeping local data as is.');
      setSyncStatus('synced');
      return { 
        notes: getLocal(KEYS.notes, {}), tasks: getLocal(KEYS.tasks, {}), moods: getLocal(KEYS.moods, {}), 
        tags: getLocal(KEYS.tags, {}), photos: getLocal(KEYS.photos, {}), sleep: getLocal(KEYS.sleep, {}), settings: remoteSettings 
      };
    }
  } catch (error) {
    console.error('[SYNC] ❌ Initial sync failed:', error);
    setSyncStatus('error');
    return null;
  }
}

const debouncedUpsertEntry = debounce(async (userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) => {
  console.log('[SYNC] 📤 debouncedUpsertEntry called. date:', date, 'content_len:', content.length);
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('entries').upsert({ user_id: userId, date, content, mood, tags, photos, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] ❌ Failed to sync entry:', error);
  else console.log('[SYNC] ✅ Successfully synced entry for date:', date);
}, 2000);

const debouncedUpsertTasks = debounce(async (userId: string, date: string, tasks: Task[]) => {
  if (isLocalMode() || !supabase) return;
  const tasksToUpsert = tasks.map(t => ({ user_id: userId, date, id: t.id, title: t.text, completed: t.done }));
  const { data: existing } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('date', date);
  const existingIds = existing?.map(t => t.id) || [];
  const toDelete = existingIds.filter(id => !tasks.find(t => t.id === id));
  if (toDelete.length > 0) await supabase.from('tasks').delete().in('id', toDelete);
  const { error } = await supabase.from('tasks').upsert(tasksToUpsert);
  if (error) console.error('[SYNC] ❌ Failed to sync tasks:', error);
}, 2000);

const debouncedUpsertSleep = debounce(async (userId: string, date: string, sleepData: SleepData) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('sleep_logs').upsert({ user_id: userId, date, sleep_start: sleepData.bedtime || String(sleepData.hours), sleep_end: sleepData.waketime || '', quality: sleepData.quality }, { onConflict: 'user_id,date' });
  if (error) console.error('[SYNC] ❌ Failed to sync sleep:', error);
}, 2000);

const debouncedUpsertSettings = debounce(async (userId: string, settings: Record<string, unknown>) => {
  if (isLocalMode() || !supabase) return;
  const { error } = await supabase.from('profiles').update({ settings }).eq('id', userId);
  if (error) console.error('[SYNC] ❌ Failed to sync settings:', error);
}, 2000);

export function syncEntry(userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) { debouncedUpsertEntry(userId, date, content, mood, tags, photos); }
export function syncTasks(userId: string, date: string, tasks: Task[]) { debouncedUpsertTasks(userId, date, tasks); }
export function syncSleep(userId: string, date: string, sleepData: SleepData) { debouncedUpsertSleep(userId, date, sleepData); }
export function syncSettings(userId: string, settings: { theme?: string; lang?: string; font?: number; writingFont?: string; bg?: string; moodEmoji?: string[] }) { debouncedUpsertSettings(userId, settings); }
