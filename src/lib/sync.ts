import { supabase } from './supabase';
import type { SleepData, Task } from '../store';

const KEYS = {
  notes: 'dn.notes',
  tasks: 'dn.tasks',
  moods: 'dn.moods',
  tags: 'dn.tags',
  photos: 'dn.photos',
  sleep: 'dn.sleep',
  theme: 'dn.theme',
  lang: 'dn.lang',
  font: 'dn.font',
  writingFont: 'dn.wfont',
  bg: 'dn.bg',
  moodEmoji: 'dn.emoji',
  localMode: 'dn.localMode',
  lastSync: 'dn.lastSync',
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
  } catch {
    /* ignore */
  }
  return fallback;
}

export function isLocalMode(): boolean {
  return localStorage.getItem(KEYS.localMode) === 'true';
}

export function setLocalMode(value: boolean) {
  localStorage.setItem(KEYS.localMode, value.toString());
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

let currentSyncStatus: SyncStatus = 'idle';
let syncStatusListeners: ((status: SyncStatus) => void)[] = [];

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void) {
  syncStatusListeners.push(listener);
  listener(currentSyncStatus);
  return () => {
    syncStatusListeners = syncStatusListeners.filter(l => l !== listener);
  };
}

function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  syncStatusListeners.forEach(l => l(status));
}

export interface SyncedData {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  tags: Record<string, string[]>;
  photos: Record<string, string[]>;
  sleep: Record<string, SleepData>;
}

export async function performInitialSync(): Promise<SyncedData | null> {
  if (!supabase || isLocalMode()) return null;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  setSyncStatus('syncing');

  try {
    const [entriesRes, tasksRes, sleepRes] = await Promise.all([
      supabase.from('entries').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('sleep_logs').select('*').eq('user_id', userId),
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (sleepRes.error) throw sleepRes.error;

    const remoteEntries = entriesRes.data || [];
    const remoteTasks = tasksRes.data || [];
    const remoteSleep = sleepRes.data || [];

    const localNotes = getLocal<Record<string, string>>(KEYS.notes, {});
    const localTasks = getLocal<Record<string, Task[]>>(KEYS.tasks, {});
    const localMoods = getLocal<Record<string, number>>(KEYS.moods, {});
    const localTags = getLocal<Record<string, string[]>>(KEYS.tags, {});
    const localPhotos = getLocal<Record<string, string[]>>(KEYS.photos, {});
    const localSleep = getLocal<Record<string, SleepData>>(KEYS.sleep, {});

    const hasRemoteData = remoteEntries.length > 0 || remoteTasks.length > 0 || remoteSleep.length > 0;

    if (hasRemoteData) {
      for (const entry of remoteEntries) {
        const iso = entry.date;
        localNotes[iso] = entry.content || '';
        if (entry.mood !== null && entry.mood !== undefined) localMoods[iso] = entry.mood;
        if (entry.tags && entry.tags.length > 0) localTags[iso] = entry.tags;
        if (entry.photos && Array.isArray(entry.photos)) localPhotos[iso] = entry.photos;
      }

      for (const task of remoteTasks) {
        const iso = task.date;
        if (!localTasks[iso]) localTasks[iso] = [];
        if (!localTasks[iso].find(t => t.id === task.id)) {
          localTasks[iso].push({ id: task.id, text: task.title, done: task.completed });
        }
      }

      for (const s of remoteSleep) {
        if (!localSleep[s.date]) {
          localSleep[s.date] = {
            hours: s.sleep_start ? parseFloat(s.sleep_start) || 0 : 0,
            quality: s.quality || 0,
            bedtime: s.sleep_start || '',
            waketime: s.sleep_end || '',
          };
        }
      }

      localStorage.setItem(KEYS.notes, JSON.stringify(localNotes));
      localStorage.setItem(KEYS.tasks, JSON.stringify(localTasks));
      localStorage.setItem(KEYS.moods, JSON.stringify(localMoods));
      localStorage.setItem(KEYS.tags, JSON.stringify(localTags));
      localStorage.setItem(KEYS.photos, JSON.stringify(localPhotos));
      localStorage.setItem(KEYS.sleep, JSON.stringify(localSleep));
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());

      setSyncStatus('synced');
      return { notes: localNotes, tasks: localTasks, moods: localMoods, tags: localTags, photos: localPhotos, sleep: localSleep };
    }

    const now = new Date().toISOString();

    const entriesToUpload = Object.entries(localNotes)
      .filter(([_, content]) => content.trim())
      .map(([date, content]) => ({
        user_id: userId,
        date,
        content,
        mood: localMoods[date] ?? null,
        tags: localTags[date] ?? [],
        photos: localPhotos[date] ?? [],
        updated_at: now,
      }));
    if (entriesToUpload.length > 0) {
      await supabase.from('entries').upsert(entriesToUpload, { onConflict: 'user_id,date' });
    }

    const tasksToUpload: Array<{ user_id: string; date: string; id: string; title: string; completed: boolean }> = [];
    for (const [date, dayTasks] of Object.entries(localTasks)) {
      for (const task of dayTasks) {
        tasksToUpload.push({ user_id: userId, date, id: task.id, title: task.text, completed: task.done });
      }
    }
    if (tasksToUpload.length > 0) {
      await supabase.from('tasks').upsert(tasksToUpload);
    }

    const sleepToUpload = Object.entries(localSleep).map(([date, data]) => ({
      user_id: userId,
      date,
      sleep_start: data.bedtime || String(data.hours),
      sleep_end: data.waketime || '',
      quality: data.quality,
    }));
    if (sleepToUpload.length > 0) {
      await supabase.from('sleep_logs').upsert(sleepToUpload, { onConflict: 'user_id,date' });
    }

    localStorage.setItem(KEYS.lastSync, now);
    setSyncStatus('synced');
    return null;
  } catch (error) {
    console.error('Sync error:', error);
    setSyncStatus('error');
    return null;
  }
}

const debouncedUpsertEntry = debounce(async (
  userId: string,
  date: string,
  content: string,
  mood: number | null,
  tags: string[],
  photos: string[]
) => {
  if (!supabase || isLocalMode()) return;
  const { error } = await supabase.from('entries').upsert({
    user_id: userId, date, content, mood, tags, photos,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' });
  if (error) console.error('Failed to sync entry:', error);
}, 2000);

const debouncedUpsertTasks = debounce(async (
  userId: string,
  date: string,
  tasks: Task[]
) => {
  if (!supabase || isLocalMode()) return;

  const tasksToUpsert = tasks.map(t => ({ user_id: userId, date, id: t.id, title: t.text, completed: t.done }));

  const { data: existing } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('date', date);
  const existingIds = existing?.map(t => t.id) || [];
  const toDelete = existingIds.filter(id => !tasks.find(t => t.id === id));
  if (toDelete.length > 0) {
    await supabase.from('tasks').delete().in('id', toDelete);
  }

  const { error } = await supabase.from('tasks').upsert(tasksToUpsert);
  if (error) console.error('Failed to sync tasks:', error);
}, 2000);

const debouncedUpsertSleep = debounce(async (
  userId: string,
  date: string,
  sleepData: SleepData
) => {
  if (!supabase || isLocalMode()) return;
  const { error } = await supabase.from('sleep_logs').upsert({
    user_id: userId,
    date,
    sleep_start: sleepData.bedtime || String(sleepData.hours),
    sleep_end: sleepData.waketime || '',
    quality: sleepData.quality,
  }, { onConflict: 'user_id,date' });
  if (error) console.error('Failed to sync sleep:', error);
}, 2000);

const debouncedUpsertSettings = debounce(async (
  userId: string,
  settings: Record<string, unknown>
) => {
  if (!supabase || isLocalMode()) return;
  const { error } = await supabase.from('profiles').update({ settings }).eq('id', userId);
  if (error) console.error('Failed to sync settings:', error);
}, 2000);

export function syncEntry(userId: string, date: string, content: string, mood: number | null, tags: string[], photos: string[]) {
  debouncedUpsertEntry(userId, date, content, mood, tags, photos);
}

export function syncTasks(userId: string, date: string, tasks: Task[]) {
  debouncedUpsertTasks(userId, date, tasks);
}

export function syncSleep(userId: string, date: string, sleepData: SleepData) {
  debouncedUpsertSleep(userId, date, sleepData);
}

export function syncSettings(userId: string, settings: { theme?: string; lang?: string; font?: number; writingFont?: string; bg?: string; moodEmoji?: string[] }) {
  debouncedUpsertSettings(userId, settings);
}
