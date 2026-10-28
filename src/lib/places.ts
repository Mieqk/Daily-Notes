import { generateUUID } from "./uuid";

/**
 * Напоминания по месту. Приватность: места лежат только в localStorage этого устройства (ключ dn.places),
 * в Supabase и на любой сервер не уходят и в синхронизацию не входят. Координаты читаются самим браузером,
 * только после нажатия человека, и никуда не передаются.
 */
export interface Place {
  id: string;
  name: string;
  /** Что напомнить. */
  text: string;
  lat: number;
  lon: number;
  /** Радиус срабатывания, м. */
  radius: number;
  enabled: boolean;
  /** Находились ли мы внутри при прошлой проверке: напоминание срабатывает на входе, а не при каждой проверке. */
  inside: boolean;
  /** Когда напоминали в последний раз, мс. */
  firedAt: number;
}

export interface Coords { lat: number; lon: number }

export const PLACES_KEY = "dn.places";
export const PLACES_EVENT = "dn-places-changed";
/** Отметка «разрешение на место уже выдано через нажатие»: только тогда проверяем само при открытом приложении. */
export const GEO_OK_KEY = "dn.placesGeoOk";
export const RADII = [100, 200, 500, 1000] as const;
export const MAX_PLACES = 12;
/** Не напоминать об одном месте чаще, чем раз в столько, даже если вышли и вернулись. */
export const COOLDOWN_MS = 3 * 60 * 60 * 1000;
/** Чтобы не «моргало» на границе: выходом считаем уход дальше радиуса с запасом. */
export const EXIT_FACTOR = 1.5;
/** Погрешность определения места хуже этого значения (м) не годится для радиуса: пропускаем проверку. */
export const MAX_ACCURACY_M = 300;

/** Расстояние между точками по поверхности Земли, м. */
export function distanceM(a: Coords, b: Coords): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface CheckResult {
  /** Обновлённый список (с новыми inside и firedAt). */
  places: Place[];
  /** Места, о которых надо напомнить сейчас. */
  fire: Place[];
}

/** Чистая проверка: вход в радиус даёт напоминание (не чаще раза в COOLDOWN_MS), выход за радиус×EXIT_FACTOR снова взводит его. */
export function checkPlaces(places: Place[], pos: Coords, now: number): CheckResult {
  const fire: Place[] = [];
  const next = places.map((p) => {
    if (!p.enabled) return p;
    const d = distanceM(pos, p);
    if (d <= p.radius) {
      if (p.inside) return p;
      if (now - p.firedAt < COOLDOWN_MS) return { ...p, inside: true };
      const fired = { ...p, inside: true, firedAt: now };
      fire.push(fired);
      return fired;
    }
    if (p.inside && d > p.radius * EXIT_FACTOR) return { ...p, inside: false };
    return p;
  });
  return { places: next, fire };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Разбор сохранённого списка: битые записи отбрасываем. */
export function parsePlaces(raw: unknown): Place[] {
  if (!Array.isArray(raw)) return [];
  const out: Place[] = [];
  for (const x of raw.slice(0, MAX_PLACES)) {
    const o = x as Partial<Place> | null;
    if (!o || typeof o !== "object" || !isNum(o.lat) || !isNum(o.lon) || Math.abs(o.lat) > 90 || Math.abs(o.lon) > 180) continue;
    const text = typeof o.text === "string" ? o.text.trim().slice(0, 140) : "";
    if (!text) continue;
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : generateUUID(),
      name: typeof o.name === "string" ? o.name.trim().slice(0, 40) : "",
      text,
      lat: o.lat,
      lon: o.lon,
      radius: isNum(o.radius) && o.radius >= 50 && o.radius <= 5000 ? o.radius : 200,
      enabled: o.enabled !== false,
      inside: o.inside === true,
      firedAt: isNum(o.firedAt) ? o.firedAt : 0,
    });
  }
  return out;
}

export function loadPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    return raw ? parsePlaces(JSON.parse(raw)) : [];
  } catch { return []; }
}

export function savePlaces(list: Place[]) {
  try { localStorage.setItem(PLACES_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(PLACES_EVENT));
}

export const geoSupported = () => typeof navigator !== "undefined" && "geolocation" in navigator;

export interface Fix extends Coords { accuracy: number }
export type GeoError = "denied" | "unavailable" | "timeout";

/** Одно определение места. Спрашивает браузер (он сам покажет запрос на разрешение), поэтому вызывать только по нажатию. */
export function getFix(opts: { maxAgeMs?: number; timeoutMs?: number; precise?: boolean } = {}): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!geoSupported()) { reject(new Error("unavailable" satisfies GeoError)); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error((e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable") satisfies GeoError)),
      { enableHighAccuracy: opts.precise ?? false, maximumAge: opts.maxAgeMs ?? 60_000, timeout: opts.timeoutMs ?? 15_000 },
    );
  });
}

/** Выдано ли разрешение на место: true/false, или null, если браузер не умеет это сказать (старый Safari). */
export async function geoPermission(): Promise<"granted" | "denied" | "prompt" | null> {
  try {
    if (!navigator.permissions?.query) return null;
    return (await navigator.permissions.query({ name: "geolocation" as PermissionName })).state;
  } catch { return null; }
}

export const geoOkFlag = () => { try { return localStorage.getItem(GEO_OK_KEY) === "1"; } catch { return false; } };
export const setGeoOkFlag = (on: boolean) => { try { localStorage.setItem(GEO_OK_KEY, on ? "1" : "0"); } catch { /* ignore */ } };

export function newPlace(p: { name: string; text: string; lat: number; lon: number; radius: number }): Place {
  return { id: generateUUID(), name: p.name.trim().slice(0, 40), text: p.text.trim().slice(0, 140), lat: p.lat, lon: p.lon, radius: p.radius, enabled: true, inside: true, firedAt: 0 };
}
