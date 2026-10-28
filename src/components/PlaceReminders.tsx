import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { MAX_PLACES, PLACES_EVENT, RADII, geoSupported, getFix, loadPlaces, newPlace, savePlaces, setGeoOkFlag, geoOkFlag, type GeoError, type Place } from "../lib/places";
import { requestNotifications } from "../lib/notify";
import { runPlaceCheck } from "../hooks/usePlaceReminders";
import { makeVoice, type VoiceKey } from "../voice-strings";

const ERR: Record<GeoError, VoiceKey> = { denied: "plDenied", unavailable: "plUnavail", timeout: "plTimeout" };

/** Карточка настроек «Напоминания по месту». Места хранятся только на устройстве. */
export default function PlaceReminders({ lang, showToast }: { lang: Lang; showToast: (msg: string) => void }) {
  const v = makeVoice(lang);
  const [places, setPlaces] = useState<Place[]>(loadPlaces);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [radius, setRadius] = useState<number>(200);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setPlaces(loadPlaces());
    window.addEventListener(PLACES_EVENT, on);
    return () => window.removeEventListener(PLACES_EVENT, on);
  }, []);

  const fail = (e: unknown) => {
    const code = (e as Error).message as GeoError;
    showToast(v(ERR[code] ?? "plUnavail"));
  };

  const useHere = async () => {
    setBusy(true);
    try {
      const f = await getFix({ maxAgeMs: 0, timeoutMs: 20_000, precise: true });
      setGeoOkFlag(true);
      setPos({ lat: f.lat, lon: f.lon });
      showToast(f.accuracy > 100 ? v("plVague", { m: Math.round(f.accuracy) }) : v("plHereOk"));
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const save = () => {
    if (!pos || !text.trim()) { showToast(v("plNeedPlace")); return; }
    if (places.length >= MAX_PLACES) { showToast(v("plLimit", { n: MAX_PLACES })); return; }
    const next = [...places, newPlace({ name, text, lat: pos.lat, lon: pos.lon, radius })];
    savePlaces(next);
    setPlaces(next);
    void requestNotifications();
    setAdding(false); setName(""); setText(""); setPos(null);
    showToast(v("plSaved"));
  };

  const patch = (id: string, change: Partial<Place>) => {
    const next = places.map((p) => (p.id === id ? { ...p, ...change } : p));
    savePlaces(next);
    setPlaces(next);
  };
  const remove = (id: string) => { const next = places.filter((p) => p.id !== id); savePlaces(next); setPlaces(next); };

  const check = async () => {
    setBusy(true);
    try {
      void requestNotifications();
      const r = await runPlaceCheck(lang, showToast, { manual: true });
      if (!r.ok) { if (r.error === "vague") showToast(v("plVague", { m: r.accuracy ?? 0 })); else fail(new Error(r.error)); return; }
      setGeoOkFlag(true);
      if (!r.fired.length) showToast(v("plNothing"));
    } finally { setBusy(false); }
  };

  const field = "h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13.5px] outline-none focus:border-[var(--accent)]";
  const btn = "h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 text-[13px] font-semibold transition-all hover:border-[var(--accent)] active:scale-95 disabled:opacity-50";
  const fmt = (m: number) => (m >= 1000 ? v("plKm", { km: m / 1000 }) : v("plM", { m }));

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3 className="text-[15px] font-bold">📍 {v("plTitle")}</h3>
      <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">{v("plSub")}</p>

      {!geoSupported() ? (
        <p className="mt-3 text-[12.5px] text-[var(--danger)]">{v("plNotSupported")}</p>
      ) : (
        <>
          {places.length === 0 && !adding && <p className="mt-3 text-[13px] text-[var(--ink-faint)]">{v("plEmpty")}</p>}
          <ul className="mt-3 flex flex-col gap-2">
            {places.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg bg-[var(--hover)] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{p.text}</div>
                  <div className="truncate text-[11.5px] text-[var(--ink-faint)]">{p.name ? `${p.name} · ` : ""}{fmt(p.radius)}</div>
                </div>
                <button onClick={() => remove(p.id)} className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-semibold text-[var(--ink-faint)] hover:text-[var(--danger)]">{v("plDelete")}</button>
                <button onClick={() => patch(p.id, { enabled: !p.enabled, inside: true })} role="switch" aria-checked={p.enabled} aria-label={p.enabled ? v("plOn") : v("plOff")}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${p.enabled ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--panel-2)] shadow transition-all duration-200 ${p.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>

          {adding ? (
            <div className="mt-3 flex flex-col gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder={v("plTextPh")} className={field} />
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={v("plNamePh")} className={field} />
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={useHere} disabled={busy} className={btn}>{pos ? `✓ ${v("plHereOk")}` : v("plHere")}</button>
                <label className="flex items-center gap-2 text-[12.5px] text-[var(--ink-soft)]">
                  {v("plRadius")}
                  <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[13px] font-semibold">
                    {RADII.map((r) => <option key={r} value={r}>{fmt(r)}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95">{v("plSave")}</button>
                <button onClick={() => { setAdding(false); setPos(null); }} className={btn}>{v("plCancel")}</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setAdding(true)} disabled={places.length >= MAX_PLACES} className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">{v("plAdd")}</button>
              {places.some((p) => p.enabled) && <button onClick={check} disabled={busy} className={btn}>{v("plCheck")}</button>}
            </div>
          )}
          {geoOkFlag() && places.some((p) => p.enabled) && <p className="mt-3 text-[11.5px] text-[var(--ink-faint)]">{v("plAuto")}</p>}
        </>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{v("plNote")}</p>
    </div>
  );
}
