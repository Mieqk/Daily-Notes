import { useEffect, useRef } from "react";
import type { Lang } from "../i18n";
import { notify } from "../lib/notify";
import { MAX_ACCURACY_M, checkPlaces, geoOkFlag, geoPermission, getFix, loadPlaces, savePlaces, type GeoError, type Place } from "../lib/places";
import { makeVoice } from "../voice-strings";

const EVERY_MS = 2 * 60_000;

export type CheckOutcome =
  | { ok: true; fired: Place[]; enabled: number }
  | { ok: false; error: GeoError | "vague"; accuracy?: number };

/** Одна проверка: определяет место (по нажатию спросит разрешение), сравнивает с сохранёнными местами и показывает напоминания. */
export async function runPlaceCheck(lang: Lang, onFire: (msg: string) => void, opts: { manual?: boolean } = {}): Promise<CheckOutcome> {
  const v = makeVoice(lang);
  const list = loadPlaces();
  const enabled = list.filter((p) => p.enabled).length;
  let fix;
  try {
    fix = await getFix({ maxAgeMs: opts.manual ? 0 : 60_000, timeoutMs: opts.manual ? 20_000 : 10_000, precise: opts.manual });
  } catch (e) {
    return { ok: false, error: (e as Error).message as GeoError };
  }
  if (fix.accuracy > MAX_ACCURACY_M) return { ok: false, error: "vague", accuracy: Math.round(fix.accuracy) };
  const { places, fire } = checkPlaces(list, fix, Date.now());
  if (JSON.stringify(places) !== JSON.stringify(list)) savePlaces(places);
  for (const p of fire) {
    notify(v("plNear", { name: p.name || p.text }), p.text, `dn-place-${p.id}`);
    onFire(`📍 ${p.text}`);
  }
  return { ok: true, fired: fire, enabled };
}

/**
 * Напоминания по месту, пока приложение открыто: при открытии, при возврате на вкладку и раз в пару минут.
 * Сами не спрашивают разрешение на место: проверяют только если человек уже разрешил его нажатием в настройках.
 */
export function usePlaceReminders(lang: Lang, showToast: (msg: string) => void) {
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden || !geoOkFlag()) return;
      if (!loadPlaces().some((p) => p.enabled)) return;
      if ((await geoPermission()) === "denied") return;
      busy = true;
      try { await runPlaceCheck(lang, (m) => toastRef.current(m)); } finally { busy = false; }
    };
    void tick();
    const id = window.setInterval(tick, EVERY_MS);
    const onVis = () => { if (!document.hidden) void tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [lang]);
}
