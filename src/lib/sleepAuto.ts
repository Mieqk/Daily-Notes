import { useCallback, useEffect, useState } from "react";
import type { SleepData } from "../store";
import { toISO } from "../store";

/**
 * Автоопределение сна без носимых устройств. Веб-приложение не видит телефон в фоне,
 * поэтому смотрим только на паузу в пользовании самим приложением ночью:
 * последнее «живое» время запоминаем на устройстве, а утром предлагаем ночную паузу
 * как сон. Решает человек: время можно поправить или отказаться.
 */

const KEY_LAST = "dn.sleepAuto.last";
const KEY_CAND = "dn.sleepAuto.cand";
const KEY_SKIP = "dn.sleepAuto.skip";

const MIN_GAP = 3 * 3600_000;
const MAX_GAP = 14 * 3600_000;
const HEARTBEAT = 60_000;

export interface SleepCandidate {
  /** день пробуждения (ключ записи сна) */
  date: string;
  bedtime: string;
  waketime: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const hmOf = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function calcHours(bedtime?: string, waketime?: string): number | null {
  if (!bedtime || !waketime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = waketime.split(":").map(Number);
  let diff = wh * 60 + wm - (bh * 60 + bm);
  if (diff <= 0) diff += 1440;
  return Math.round((diff / 60) * 10) / 10;
}

export function autoQuality(hours: number, awakenings: number): number {
  if (hours <= 0) return 0;
  let q = 1;
  if (hours >= 4) q = 2;
  if (hours >= 5.5) q = 3;
  if (hours >= 6.5) q = 4;
  if (hours >= 7 && hours <= 9.5) q = 5;
  if (hours > 10) q = 4;
  q -= awakenings >= 4 ? 2 : awakenings >= 2 ? 1 : 0;
  return Math.max(1, Math.min(5, q));
}

/** Записывает время сна в запись дня, сохраняя заметку и пробуждения. */
export function withTimes(cur: SleepData | undefined, bedtime: string, waketime: string): SleepData {
  const base: SleepData = cur ?? { hours: 0, quality: 0, bedtime: "", waketime: "", awakenings: 0, note: "" };
  const next = { ...base, bedtime, waketime };
  const h = calcHours(bedtime, waketime);
  if (h !== null) next.hours = h;
  if (next.hours > 0) next.quality = autoQuality(next.hours, next.awakenings || 0);
  return next;
}

const candLen = (c: SleepCandidate) => calcHours(c.bedtime, c.waketime) ?? 0;

/**
 * Пауза [from, to] похожа на сон, если она 3–14 часов, началась вечером или ночью
 * (с 19:00 до 04:00) и закончилась утром или днём (с 04:00 до 14:00).
 */
export function detectCandidate(from: number, to: number): SleepCandidate | null {
  const gap = to - from;
  if (!(gap >= MIN_GAP && gap <= MAX_GAP)) return null;
  const sh = new Date(from).getHours();
  const eh = new Date(to).getHours();
  const startsAtNight = sh >= 19 || sh < 4;
  const endsInMorning = eh >= 4 && eh < 14;
  if (!startsAtNight || !endsInMorning) return null;
  return { date: toISO(new Date(to)), bedtime: hmOf(from), waketime: hmOf(to) };
}

/** Из двух кандидатов на один день оставляем более длинную паузу (ночью могли заглянуть в приложение). */
export function mergeCandidate(prev: SleepCandidate | null, next: SleepCandidate | null): SleepCandidate | null {
  if (!next) return prev;
  if (!prev || prev.date !== next.date) return next;
  return candLen(next) >= candLen(prev) ? next : prev;
}

const read = <T,>(key: string): T | null => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
};
const write = (key: string, v: unknown) => {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* квота */ }
};

/** Пока включено, помнит последнее время активности и на каждом возвращении в приложение ищет ночную паузу. */
export function useSleepAuto(enabled: boolean, sleep: Record<string, SleepData>, save: (iso: string, d: SleepData) => void) {
  const [cand, setCand] = useState<SleepCandidate | null>(() => (enabled ? read<SleepCandidate>(KEY_CAND) : null));

  useEffect(() => {
    if (!enabled) {
      write(KEY_LAST, null);
      write(KEY_CAND, null);
      setCand(null);
      return;
    }
    const stamp = () => write(KEY_LAST, Date.now());
    const resume = () => {
      const now = Date.now();
      const last = read<number>(KEY_LAST);
      const found = last ? detectCandidate(last, now) : null;
      const merged = mergeCandidate(read<SleepCandidate>(KEY_CAND), found);
      write(KEY_CAND, merged);
      setCand(merged);
      stamp();
    };
    const onVis = () => { if (document.visibilityState === "visible") resume(); else stamp(); };
    resume();
    let lastTouch = 0;
    const onTouch = () => { const n = Date.now(); if (n - lastTouch > 30_000) { lastTouch = n; stamp(); } };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") stamp(); }, HEARTBEAT);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", stamp);
    window.addEventListener("pointerdown", onTouch);
    window.addEventListener("keydown", onTouch);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", stamp);
      window.removeEventListener("pointerdown", onTouch);
      window.removeEventListener("keydown", onTouch);
    };
  }, [enabled]);

  const done = useCallback(() => { write(KEY_CAND, null); setCand(null); }, []);
  const accept = useCallback((bedtime: string, waketime: string) => {
    if (!cand) return;
    save(cand.date, withTimes(sleep[cand.date], bedtime, waketime));
    done();
  }, [cand, sleep, save, done]);
  const dismiss = useCallback(() => {
    if (cand) write(KEY_SKIP, cand.date);
    done();
  }, [cand, done]);

  // не предлагаем, если сон за этот день уже записан или человек отказался
  const visible = enabled && cand && !sleep[cand.date]?.bedtime && !sleep[cand.date]?.waketime && read<string>(KEY_SKIP) !== cand.date ? cand : null;
  return { cand: visible, accept, dismiss };
}
