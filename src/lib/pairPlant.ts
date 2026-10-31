/** Общее растение пары: стадия считается из отметок полива, в базе хранятся только они. */

export interface Care { user_id: string; day: string }

export const STAGES = [
  { from: 0, icon: "🌱" },
  { from: 4, icon: "🌿" },
  { from: 10, icon: "🪴" },
  { from: 20, icon: "🌳" },
  { from: 40, icon: "🌸" },
] as const;

export interface PlantState {
  points: number;
  stage: number;
  /** очков до следующей стадии, null на последней */
  toNext: number | null;
  /** растение давно не поливали */
  wilting: boolean;
  mineToday: boolean;
  theirsToday: boolean;
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/** Очко за каждый полив и ещё одно за день, когда полили оба. Не поливали 3 дня и больше: растение вянет. */
export function plantState(care: Care[], me: string, today: string): PlantState {
  const byDay = new Map<string, Set<string>>();
  for (const c of care) {
    if (!byDay.has(c.day)) byDay.set(c.day, new Set());
    byDay.get(c.day)!.add(c.user_id);
  }
  let points = 0;
  let last: string | null = null;
  for (const [day, who] of byDay) {
    points += who.size + (who.size >= 2 ? 1 : 0);
    if (!last || day > last) last = day;
  }
  let stage = 0;
  STAGES.forEach((s, i) => { if (points >= s.from) stage = i; });
  const next = STAGES[stage + 1];
  const todayWho = byDay.get(today);
  return {
    points,
    stage,
    toNext: next ? next.from - points : null,
    wilting: last !== null && dayDiff(today, last) >= 3,
    mineToday: Boolean(todayWho?.has(me)),
    theirsToday: Boolean(todayWho && [...todayWho].some((u) => u !== me)),
  };
}
