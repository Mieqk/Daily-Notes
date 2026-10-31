import { useCallback, useEffect, useState } from 'react';
import type { SleepData } from '../store';
import { toISO } from '../store';
import { callNative, isNativeApp } from './nativeAuth';
import { withTimes } from './sleepAuto';

/**
 * Сон из Health Connect на Android (14+). Приложение только читает сессии сна, которые записали часы,
 * браслет или сам телефон, и заполняет дни, где сон ещё не записан. Существующие записи не трогаем.
 */

const KEY_SEEN = 'dn.sleepHealth.seen';
const MIN_SESSION = 2 * 3600_000;
const DAYS = 3;

export interface HealthSession { start: number; end: number; awakenings: number }
export interface HealthStatus { available: boolean; granted: boolean }

const pad = (n: number) => String(n).padStart(2, '0');
const hmOf = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** Для каждого дня пробуждения берём самую долгую сессию (короткие дневные дремоты пропускаем). */
export function sessionsToDays(sessions: HealthSession[]): Record<string, SleepData> {
  const best: Record<string, HealthSession> = {};
  for (const s of sessions) {
    if (!(s.end > s.start) || s.end - s.start < MIN_SESSION) continue;
    const date = toISO(new Date(s.end));
    const cur = best[date];
    if (!cur || s.end - s.start > cur.end - cur.start) best[date] = s;
  }
  const out: Record<string, SleepData> = {};
  for (const [date, s] of Object.entries(best)) {
    const base: SleepData = { hours: 0, quality: 0, bedtime: '', waketime: '', awakenings: Math.max(0, Math.round(s.awakenings || 0)), note: '' };
    out[date] = withTimes(base, hmOf(s.start), hmOf(s.end));
  }
  return out;
}

const readSeen = (): string[] => { try { const v = localStorage.getItem(KEY_SEEN); return v ? (JSON.parse(v) as string[]) : []; } catch { return []; } };
const writeSeen = (v: string[]) => { try { localStorage.setItem(KEY_SEEN, JSON.stringify(v.slice(-60))); } catch { /* квота */ } };

export const healthSupported = () => isNativeApp();

export async function healthStatus(): Promise<HealthStatus> {
  if (!isNativeApp()) return { available: false, granted: false };
  try { return await callNative('HealthSleep', 'status'); } catch { return { available: false, granted: false }; }
}
export async function healthRequest(): Promise<HealthStatus> {
  try { return await callNative('HealthSleep', 'request'); } catch { return { available: false, granted: false }; }
}
export const healthOpenSettings = () => callNative('HealthSleep', 'openSettings').catch(() => {});

/** Пока включено, при каждом открытии приложения подтягивает недостающие ночи. */
export function useHealthSleep(
  enabled: boolean,
  sleep: Record<string, SleepData>,
  addDays: (days: Record<string, SleepData>) => void,
) {
  useEffect(() => {
    if (!enabled || !isNativeApp()) return;
    let cancelled = false;
    const run = async () => {
      try {
        const st = await healthStatus();
        if (!st.available || !st.granted) return;
        const res = await callNative('HealthSleep', 'read', { days: DAYS }) as { sessions?: HealthSession[] };
        if (cancelled) return;
        const seen = readSeen();
        const fresh: Record<string, SleepData> = {};
        for (const [date, d] of Object.entries(sessionsToDays(res.sessions ?? []))) {
          if (seen.includes(date) || sleep[date]?.bedtime || sleep[date]?.waketime) continue;
          fresh[date] = d;
        }
        if (Object.keys(fresh).length) {
          writeSeen([...seen, ...Object.keys(fresh)]);
          addDays(fresh);
        }
      } catch { /* нет доступа или Health Connect недоступен */ }
    };
    void run();
    const onVis = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

/** Состояние для карточки настроек: доступность Health Connect и выдано ли разрешение. */
export function useHealthStatus() {
  const [st, setSt] = useState<HealthStatus | null>(null);
  const refresh = useCallback(() => { void healthStatus().then(setSt); }, []);
  useEffect(() => {
    refresh();
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);
  return { st, refresh };
}
