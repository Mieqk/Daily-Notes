/** Расчёты для вкладки «Пара»: считаются на устройстве только из ночей, которыми человек сам поделился. */

export interface NightLike { day: string; hours: number; quality: number; bedtime: string | null; waketime: string | null }

export const toMin = (v?: string | null): number | null => {
  if (!v || !v.includes(":")) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
};

export const fmtMin = (m: number): string => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/** Среднее время суток по кругу: 23:30 и 00:30 дают 00:00, а не полдень. */
export function circularMean(mins: number[]): number | null {
  if (mins.length === 0) return null;
  let sx = 0, sy = 0;
  for (const m of mins) {
    const a = (m / 1440) * 2 * Math.PI;
    sx += Math.cos(a); sy += Math.sin(a);
  }
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) return mins[0];
  const a = Math.atan2(sy, sx);
  return (((a / (2 * Math.PI)) * 1440) + 1440) % 1440;
}

/** Расстояние между двумя временами суток в минутах с учётом полуночи. */
export function clockDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

/** Типичные отбой и подъём по последним ночам; нужно хотя бы 3 ночи с обоими временами. */
export function typicalSleep(nights: NightLike[]): { bed: number; wake: number } | null {
  const ok = nights.filter((n) => toMin(n.bedtime) !== null && toMin(n.waketime) !== null);
  if (ok.length < 3) return null;
  const bed = circularMean(ok.map((n) => toMin(n.bedtime)!));
  const wake = circularMean(ok.map((n) => toMin(n.waketime)!));
  return bed === null || wake === null ? null : { bed, wake };
}

export type SleepState = "asleep" | "up" | "awake" | "unknown";

/**
 * Приблизительное «спит / не спит». Своих данных о сне в реальном времени у приложения нет,
 * поэтому смотрим на привычное окно сна человека и на то, открыто ли у него приложение.
 * Если подъём уже записан за сегодня, это точный ответ «проснулся».
 */
export function sleepState(opts: {
  nowMin: number;
  typical: { bed: number; wake: number } | null;
  online: boolean;
  wokeToday: string | null;
}): SleepState {
  const { nowMin, typical, online, wokeToday } = opts;
  const w = toMin(wokeToday);
  if (w !== null && nowMin >= w && nowMin < 18 * 60) return "up";
  if (!typical) return "unknown";
  const len = (typical.wake - typical.bed + 1440) % 1440;
  const sinceBed = (nowMin - typical.bed + 1440) % 1440;
  const inWindow = len > 0 && sinceBed < len;
  if (inWindow) return online ? "awake" : "asleep";
  return "unknown";
}

/** Положение интервала сна на шкале 18:00 → 14:00 следующего дня, в долях от 0 до 1. */
export function nightSpan(bed?: string | null, wake?: string | null): { left: number; width: number } | null {
  const b = toMin(bed), w = toMin(wake);
  if (b === null || w === null) return null;
  const START = 18 * 60, LEN = 20 * 60;
  const off = (m: number) => (m - START + 1440) % 1440;
  const from = off(b), to = off(w);
  if (from >= LEN || to <= from) return null;
  const end = Math.min(to, LEN);
  return { left: from / LEN, width: (end - from) / LEN };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface WeekSummary {
  avgHours: number | null;
  avgBed: number | null;
  nights: number;
}

export function weekSummary(nights: NightLike[], days: string[]): WeekSummary {
  const set = new Set(days);
  const list = nights.filter((n) => set.has(n.day));
  const beds = list.map((n) => toMin(n.bedtime)).filter((x): x is number => x !== null);
  const h = avg(list.map((n) => n.hours).filter((x) => x > 0));
  return { avgHours: h === null ? null : Math.round(h * 10) / 10, avgBed: circularMean(beds), nights: list.length };
}

/** Сколько общих ночей из дней недели лёг в пределах 30 минут друг от друга. */
export function syncedNights(mine: NightLike[], theirs: NightLike[], days: string[]): { synced: number; both: number } {
  let both = 0, synced = 0;
  for (const d of days) {
    const a = mine.find((n) => n.day === d), b = theirs.find((n) => n.day === d);
    if (!a || !b) continue;
    both++;
    const x = toMin(a.bedtime), y = toMin(b.bedtime);
    if (x !== null && y !== null && clockDiff(x, y) <= 30) synced++;
  }
  return { synced, both };
}
