/** Расстояние пары: координаты округляются на устройстве до отправки, километры считает база. */

/** Один знак после запятой: около 11 км, точный адрес не восстановить. */
export const roundCoord = (n: number): number => Math.round(n * 10) / 10;

/** Широта и долгота в безопасном диапазоне, иначе null (битый ответ геолокации). */
export function coarsePoint(lat: number, lon: number): { lat: number; lon: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: roundCoord(lat), lon: roundCoord(lon) };
}

export const GEO_REFRESH_MS = 30 * 60_000;

/** Нужно ли обновить свою отметку: ещё не обновляли или она старше получаса. */
export const geoStale = (updatedAt: string | null, nowMs: number): boolean =>
  !updatedAt || nowMs - Date.parse(updatedAt) > GEO_REFRESH_MS;

export function formatKm(km: number, locale: string): string {
  if (km <= 0) return "";
  return new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }).format(km);
}
