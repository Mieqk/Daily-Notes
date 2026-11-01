export type Avail = "busy" | "evening" | "free";
export const AVAILS: Avail[] = ["busy", "evening", "free"];
export const NOTE_MAX = 40;

export interface AvailRow { user_id: string; day: string; status: Avail; note: string | null }

/** Статус человека на день или null, если не отмечал. */
export function availOf(rows: AvailRow[], userId: string, day: string): AvailRow | null {
  return rows.find((r) => r.user_id === userId && r.day === day) ?? null;
}

/** Нажатие в недельной сетке: пусто -> занят -> вечером -> свободен -> пусто. */
export function nextAvail(cur: Avail | null): Avail | null {
  if (cur === null) return "busy";
  const i = AVAILS.indexOf(cur);
  return i === AVAILS.length - 1 ? null : AVAILS[i + 1];
}

/** Комментарий: без лишних пробелов, не длиннее NOTE_MAX; пустой становится null. */
export function cleanNote(s: string): string | null {
  const v = s.trim().replace(/\s+/g, " ").slice(0, NOTE_MAX).trim();
  return v === "" ? null : v;
}

/** Дни, когда свободны оба (хотя бы вечером), в порядке дат. */
export function bothFreeDays(rows: AvailRow[], a: string, b: string, days: string[]): string[] {
  const ok = (r: AvailRow | null) => r !== null && r.status !== "busy";
  return days.filter((d) => ok(availOf(rows, a, d)) && ok(availOf(rows, b, d)));
}
