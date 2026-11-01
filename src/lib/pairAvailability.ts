/** Чистая логика «свободно / занято»: смена статуса по касанию и общие свободные дни. */

export type Availability = "free" | "busy";

export interface AvailabilityRow { user_id: string; day: string; status: Availability }

/** Касание по дню: не отмечено -> свободно -> занято -> не отмечено. */
export function nextAvailability(cur: Availability | null): Availability | null {
  if (cur === null) return "free";
  return cur === "free" ? "busy" : null;
}

/** Статусы одного человека по дням: null там, где он ничего не отметил. */
export function statusByDay(rows: AvailabilityRow[], userId: string, days: string[]): (Availability | null)[] {
  const map = new Map(rows.filter((r) => r.user_id === userId).map((r) => [r.day, r.status]));
  return days.map((d) => map.get(d) ?? null);
}

/** Дни, в которые свободны оба (по порядку переданного списка). */
export function sharedFreeDays(rows: AvailabilityRow[], me: string, other: string, days: string[]): string[] {
  const mine = statusByDay(rows, me, days);
  const theirs = statusByDay(rows, other, days);
  return days.filter((_, i) => mine[i] === "free" && theirs[i] === "free");
}
