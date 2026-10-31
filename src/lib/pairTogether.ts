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
