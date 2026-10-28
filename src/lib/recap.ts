import type { SleepData, Task } from "../store";
import { countWords, shiftISO } from "../store";

export interface RecapData {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  sleep: Record<string, SleepData>;
}

export interface Recap {
  from: string;
  to: string;
  days: number;
  entries: number;
  words: number;
  tasksDone: number;
  tasksTotal: number;
  avgMood: number | null;
  sleepNights: number;
  avgSleep: number | null;
  /** По дню периода: 0 — пусто, 1 — есть запись, задача или настроение. */
  active: boolean[];
}

const hasEntry = (d: RecapData, iso: string) => (d.notes[iso] ?? "").trim().length > 0;
const hasMood = (d: RecapData, iso: string) => d.moods[iso] !== undefined;
const hasSleep = (d: RecapData, iso: string) => (d.sleep[iso]?.hours ?? 0) > 0;
const hasTaskDone = (d: RecapData, iso: string) => (d.tasks[iso] ?? []).some((x) => x.done);

/** Итоги за последние `days` дней, включая `today`. Тексты записей наружу не попадают: только числа. */
export function computeRecap(d: RecapData, days: number, today: string): Recap {
  const from = shiftISO(today, -(days - 1));
  let entries = 0, words = 0, tasksDone = 0, tasksTotal = 0, sleepNights = 0, sleepSum = 0;
  const moodVals: number[] = [];
  const active: boolean[] = [];
  for (let i = 0; i < days; i++) {
    const iso = shiftISO(from, i);
    const t = d.tasks[iso] ?? [];
    const e = hasEntry(d, iso);
    if (e) { entries++; words += countWords(d.notes[iso] ?? ""); }
    tasksTotal += t.length;
    tasksDone += t.filter((x) => x.done).length;
    if (hasMood(d, iso)) moodVals.push(d.moods[iso]);
    if (hasSleep(d, iso)) { sleepNights++; sleepSum += d.sleep[iso].hours; }
    active.push(e || t.length > 0 || hasMood(d, iso));
  }
  return {
    from, to: today, days, entries, words, tasksDone, tasksTotal,
    avgMood: moodVals.length ? moodVals.reduce((a, b) => a + b, 0) / moodVals.length : null,
    sleepNights,
    avgSleep: sleepNights ? sleepSum / sleepNights : null,
    active,
  };
}

export interface Streak { current: number; best: number }

/** Серия по набору дат. Текущая не обрывается, пока сегодняшний день ещё не закончился: считаем со вчера. */
export function streakOf(dates: Iterable<string>, today: string): Streak {
  const set = new Set(dates);
  const sorted = [...set].sort();
  let best = 0, run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && shiftISO(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }
  let iso = set.has(today) ? today : shiftISO(today, -1);
  let current = 0;
  while (set.has(iso)) { current++; iso = shiftISO(iso, -1); }
  return { current, best };
}

export type HabitKey = "write" | "mood" | "sleep" | "tasks";

export function habitStreaks(d: RecapData, today: string): Record<HabitKey, Streak> {
  const pick = (src: Record<string, unknown>, ok: (iso: string) => boolean) => Object.keys(src).filter(ok);
  return {
    write: streakOf(pick(d.notes, (k) => hasEntry(d, k)), today),
    mood: streakOf(pick(d.moods, (k) => hasMood(d, k)), today),
    sleep: streakOf(pick(d.sleep, (k) => hasSleep(d, k)), today),
    tasks: streakOf(pick(d.tasks, (k) => hasTaskDone(d, k)), today),
  };
}

export interface Badge { id: string; have: number; target: number; done: boolean }

const BADGES: { id: string; target: number; from: (s: Record<HabitKey, Streak>, tot: Totals) => number }[] = [
  { id: "write3", target: 3, from: (s) => s.write.best },
  { id: "write7", target: 7, from: (s) => s.write.best },
  { id: "write30", target: 30, from: (s) => s.write.best },
  { id: "mood7", target: 7, from: (s) => s.mood.best },
  { id: "sleep7", target: 7, from: (s) => s.sleep.best },
  { id: "tasks7", target: 7, from: (s) => s.tasks.best },
  { id: "entries10", target: 10, from: (_, t) => t.entries },
  { id: "entries100", target: 100, from: (_, t) => t.entries },
  { id: "words5k", target: 5000, from: (_, t) => t.words },
  { id: "tasks100", target: 100, from: (_, t) => t.tasksDone },
];

interface Totals { entries: number; words: number; tasksDone: number }

export function totalsOf(d: RecapData): Totals {
  let entries = 0, words = 0, tasksDone = 0;
  for (const text of Object.values(d.notes)) {
    if ((text ?? "").trim()) { entries++; words += countWords(text); }
  }
  for (const list of Object.values(d.tasks)) tasksDone += (list ?? []).filter((x) => x.done).length;
  return { entries, words, tasksDone };
}

export function computeBadges(d: RecapData, today: string): Badge[] {
  const s = habitStreaks(d, today);
  const tot = totalsOf(d);
  return BADGES.map((b) => {
    const have = b.from(s, tot);
    return { id: b.id, have, target: b.target, done: have >= b.target };
  });
}
