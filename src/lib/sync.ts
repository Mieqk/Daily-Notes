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

    // 🔥 КРИТИЧЕСКИ ВАЖНЫЙ ЛОГ 🔥
    console.log('[SYNC] 📦 RAW data from Supabase:', {
      entriesCount: remoteEntries.length,
      entries: remoteEntries, // Покажет, видит ли база твои заметки
      tasksCount: remoteTasks.length,
      sleepCount: remoteSleep.length
    });

    const hasRemoteData = remoteEntries.length > 0 || remoteTasks.length > 0 || remoteSleep.length > 0;

    if (hasRemoteData) {
      console.log('[SYNC] Remote data found, merging...');
      const localNotes = getLocal<Record<string, string>>(KEYS.notes, {});
      const localTasks = getLocal<Record<string, Task[]>>(KEYS.tasks, {});
      const localMoods = getLocal<Record<string, number>>(KEYS.moods, {});
      const localTags = getLocal
