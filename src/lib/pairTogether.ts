/** Чистая логика парных функций: обратный отсчёт, цели, настроение недели. */

export interface Countdown { past: boolean; days: number; hours: number; minutes: number }

/** Сколько осталось до события (или прошло, если оно уже было). Дни считаются целыми сутками. */
export function countdown(startsAtMs: number, nowMs: number): Countdown {
  const diff = startsAtMs - nowMs;
  const abs = Math.abs(diff);
  return {
    past: diff < 0,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
  };
}

/** Значение для поля datetime-local (локальное время) -> ISO, либо null, если дата пустая или битая. */
export function localInputToISO(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface Mark { goal_id: string; user_id: string; day: string }

export interface GoalProgress { total: number; mine: number; theirs: number; ratio: number; done: boolean; markedToday: boolean }

/** Прогресс цели: сколько отметок у каждого и доля от нужного числа (не больше 100%). */
export function goalProgress(marks: Mark[], goalId: string, target: number, me: string, today: string): GoalProgress {
  const own = marks.filter((m) => m.goal_id === goalId);
  const mine = own.filter((m) => m.user_id === me).length;
  const total = own.length;
  const t = Math.max(1, target);
  return { total, mine, theirs: total - mine, ratio: Math.min(1, total / t), done: total >= t, markedToday: own.some((m) => m.user_id === me && m.day === today) };
}

export interface MoodRow { user_id: string; day: string; mood: number }

/** Настроение по дням для одного человека: null там, где он не делился. */
export function moodByDay(rows: MoodRow[], userId: string, days: string[]): (number | null)[] {
  const map = new Map(rows.filter((r) => r.user_id === userId).map((r) => [r.day, r.mood]));
  return days.map((d) => map.get(d) ?? null);
}

/** Среднее настроение (0-4) по дням, где оно есть; null, если данных нет. */
export function moodAverage(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null);
  return v.length === 0 ? null : Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

export type TouchKind = "goodmorning" | "goodnight" | "thinking";

/** Когда какое касание уместно предложить первым (по часу): утро до полудня, ночь вечером. */
export function suggestedTouch(hour: number): TouchKind {
  if (hour >= 5 && hour < 12) return "goodmorning";
  if (hour >= 20 || hour < 4) return "goodnight";
  return "thinking";
}

/** Пара ids в порядке, который требует база (user_a < user_b). */
export function pairKey(a: string, b: string): { user_a: string; user_b: string } {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

export interface MonthRange { start: string; end: string; ym: string }

/** Границы месяца: start включительно, end (первое число следующего месяца) не включая. offset 0 - текущий, -1 - прошлый. */
export function monthRange(todayISO: string, offset = 0): MonthRange {
  const [y, m] = todayISO.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const at = (shift: number) => { const d = new Date(y, m - 1 + offset + shift, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; };
  const start = at(0);
  return { start, end: at(1), ym: start.slice(0, 7) };
}

export interface MonthTouch { sender: string; day: string }
export interface MonthGoal { id: string; target: number }
export interface MonthSummary {
  touchesMine: number; touchesTheirs: number;
  marksMine: number; marksTheirs: number;
  goalsDone: number;
  moodMine: number | null; moodTheirs: number | null;
  activeDays: number;
}

const inRange = (day: string, r: MonthRange) => day >= r.start && day < r.end;

/** Итог месяца пары: касания и отметки каждого, достигнутые за месяц цели, среднее настроение (по общим данным). */
export function monthSummary(r: MonthRange, me: string, other: string, touches: MonthTouch[], goals: MonthGoal[], marks: Mark[], moods: MoodRow[]): MonthSummary {
  const t = touches.filter((x) => inRange(x.day, r));
  const mk = marks.filter((x) => inRange(x.day, r));
  // цель достигнута в этом месяце, если отметка, закрывшая нужное число, поставлена в нём
  let goalsDone = 0;
  for (const g of goals) {
    const days = marks.filter((m) => m.goal_id === g.id).map((m) => m.day).sort();
    const closing = days[Math.max(1, g.target) - 1];
    if (closing !== undefined && inRange(closing, r)) goalsDone++;
  }
  const md = moods.filter((x) => inRange(x.day, r));
  const avg = (id: string) => moodAverage(md.filter((x) => x.user_id === id).map((x) => x.mood));
  const mine = avg(me), theirs = avg(other);
  const active = new Set<string>([...t.map((x) => x.day), ...mk.map((x) => x.day)]);
  return {
    touchesMine: t.filter((x) => x.sender === me).length, touchesTheirs: t.filter((x) => x.sender !== me).length,
    marksMine: mk.filter((x) => x.user_id === me).length, marksTheirs: mk.filter((x) => x.user_id !== me).length,
    goalsDone,
    // настроение показываем только если поделились оба
    moodMine: mine !== null && theirs !== null ? mine : null,
    moodTheirs: mine !== null && theirs !== null ? theirs : null,
    activeDays: active.size,
  };
}

export interface MonthNight { user_id: string; day: string; hours: number }
export interface MonthCheckin { user_id: string; day: string }
export interface MonthExtras {
  sleepMine: number | null; sleepTheirs: number | null; sleepBoth: number;
  habitsMine: number; habitsTheirs: number;
}

/** Сон (средние часы, ночи у обоих) и отметки парных привычек за месяц. Берётся только то, чем пара уже делится. */
export function monthExtras(r: MonthRange, me: string, other: string, nights: MonthNight[], checkins: MonthCheckin[]): MonthExtras {
  const n = nights.filter((x) => inRange(x.day, r));
  const avgOf = (id: string) => {
    const h = n.filter((x) => x.user_id === id && x.hours > 0).map((x) => x.hours);
    return h.length === 0 ? null : Math.round((h.reduce((a, b) => a + b, 0) / h.length) * 10) / 10;
  };
  const mineDays = new Set(n.filter((x) => x.user_id === me).map((x) => x.day));
  const both = new Set(n.filter((x) => x.user_id === other && mineDays.has(x.day)).map((x) => x.day)).size;
  const c = checkins.filter((x) => inRange(x.day, r));
  return {
    sleepMine: avgOf(me), sleepTheirs: avgOf(other), sleepBoth: both,
    habitsMine: c.filter((x) => x.user_id === me).length, habitsTheirs: c.filter((x) => x.user_id !== me).length,
  };
}
