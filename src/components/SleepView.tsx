import { useState } from "react";
import type { Lang, TKey } from "../i18n";
import { localeOf } from "../i18n";
import type { SleepData } from "../store";
import { fromISO, shiftISO, todayISO } from "../store";
import { ArrowLeftIcon, ArrowRightIcon, SleepIcon } from "../icons";

interface SleepViewProps {
  sleep: Record<string, SleepData>;
  lang: Lang;
  t: (k: TKey) => string;
  setSleep: (iso: string, data: SleepData | null) => void;
}

const EXTRA: Record<string, { note: string; notePh: string; awake: string; auto: string; history: string; unit: string }> = {
  ru: { note: "Блокнот о сне", notePh: "Сны, мысли перед сном, что мешало уснуть…", awake: "Просыпаний", auto: "считается само", history: "История по дням", unit: "ч" },
  en: { note: "Sleep notebook", notePh: "Dreams, thoughts before bed…", awake: "Wake-ups", auto: "auto", history: "Day-by-day history", unit: "h" },
  be: { note: "Блокнот пра сон", notePh: "Сны, думкі перад сном…", awake: "Пробуджэнняў", auto: "аўта", history: "Гісторыя па днях", unit: "г" },
  uk: { note: "Нотатник про сон", notePh: "Сни, думки перед сном…", awake: "Пробуджень", auto: "авто", history: "Історія по днях", unit: "год" },
  de: { note: "Schlaf-Notizbuch", notePh: "Träume, Gedanken vor dem Schlaf…", awake: "Aufwachen", auto: "auto", history: "Verlauf nach Tagen", unit: "Std" },
  fr: { note: "Carnet de sommeil", notePh: "Rêves, pensées avant de dormir…", awake: "Réveils", auto: "auto", history: "Historique par jour", unit: "h" },
  es: { note: "Cuaderno de sueño", notePh: "Sueños, pensamientos antes de dormir…", awake: "Despertares", auto: "auto", history: "Historial por días", unit: "h" },
};

function calcHours(bedtime?: string, waketime?: string): number | null {
  if (!bedtime || !waketime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = waketime.split(":").map(Number);
  let diff = wh * 60 + wm - (bh * 60 + bm);
  if (diff <= 0) diff += 1440;
  return Math.round((diff / 60) * 10) / 10;
}

function autoQuality(hours: number, awakenings: number): number {
  if (hours <= 0) return 0;
  let q = 1;
  if (hours >= 4) q = 2;
  if (hours >= 5.5) q = 3;
  if (hours >= 6.5) q = 4;
  if (hours >= 7 && hours <= 9.5) q = 5;
  if (hours > 10) q = 4;
  q -= awakenings >= 4 ? 2 : awakenings >= 2 ? 1 : 0;
  return Math.max(1, Math.min(5, q));
}

export default function SleepView({ sleep, lang, t, setSleep }: SleepViewProps) {
  const today = todayISO();
  const [editDate, setEditDate] = useState(today);
  const locale = localeOf(lang);
  const L = EXTRA[lang] ?? EXTRA.en;
  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4";

  const empty: SleepData = { hours: 0, quality: 0, bedtime: "", waketime: "", awakenings: 0, note: "" };
  const cur = sleep[editDate] ?? empty;

  const qualityLabel = (q: number) => {
    if (q >= 5) return t("sleepExcellent");
    if (q >= 4) return t("sleepGood");
    if (q >= 3) return t("sleepAverage");
    return t("sleepPoor");
  };

  const update = (patch: Partial<SleepData>) => {
    const next = { ...cur, ...patch };
    const h = calcHours(next.bedtime, next.waketime);
    if (h !== null) next.hours = h;
    if (next.hours > 0) next.quality = autoQuality(next.hours, next.awakenings || 0);
    setSleep(editDate, next);
  };

  const nowHM = () => new Date().toTimeString().slice(0, 5);

  const week = Array.from({ length: 7 }, (_, i) => shiftISO(today, i - 6))
    .map((iso) => ({ iso, d: sleep[iso] }))
    .filter((x) => x.d && (x.d.hours > 0 || Boolean(x.d.bedtime)));
  const avgHours = week.length ? week.reduce((s, x) => s + (x.d!.hours || 0), 0) / week.length : null;
  const avgQuality = week.length ? week.reduce((s, x) => s + (x.d!.quality || 0), 0) / week.length : null;
    const avgAwake = week.length ? week.reduce((s, x) => s + (x.d!.awakenings || 0), 0) / week.length : null;

  const history = Array.from({ length: 14 }, (_, i) => shiftISO(today, -i))
    .map((iso) => ({ iso, d: sleep[iso] }))
    .filter((x) => x.d && (x.d.hours > 0 || Boolean(x.d.bedtime)))
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Быстрые кнопки */}
      <div className={`${card} mb-5 animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-3">
          <h3 className="text-[15px] font-bold">{t("todayBadge")}</h3>
          <p className="text-xs text-[var(--ink-faint)]">{t("sleepRecentSub")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setEditDate(today); update({ bedtime: nowHM() }); }} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-ink)] transition-all duration-200 hover:opacity-90 active:scale-95">
            <span>🌙</span>{t("sleepFellAsleep")} — {nowHM()}
          </button>
          <button onClick={() => { setEditDate(today); update({ waketime: nowHM() }); }} className="flex items-center gap-2 rounded-lg bg-[var(--accent-deep)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95">
            <span>☀️</span>{t("sleepWokeUp")} — {nowHM()}
          </button>
        </div>
      </div>

      {/* Редактор дня */}
      <div className={`${card} mb-5 animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold">{t("sleepTitle")}</h3>
            <p className="text-xs text-[var(--ink-faint)]">{t("sleepSub")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditDate(shiftISO(editDate, -1))} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] active:scale-95"><ArrowLeftIcon className="h-4 w-4" /></button>
            <span className="min-w-[120px] text-center text-sm font-semibold capitalize">
              {new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(fromISO(editDate))}
            </span>
            <button onClick={() => setEditDate(shiftISO(editDate, 1))} disabled={editDate === today} className={`grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] active:scale-95 ${editDate === today ? "cursor-not-allowed opacity-40" : ""}`}><ArrowRightIcon className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("sleepBedtime")}</label>
            <input type="time" value={cur.bedtime || ""} onChange={(e) => update({ bedtime: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("sleepWakeTime")}</label>
            <input type="time" value={cur.waketime || ""} onChange={(e) => update({ waketime: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("sleepHours")} · {L.auto}</label>
            <div className="mt-1 flex h-10 items-center rounded-lg border border-[var(--line)] bg-[var(--hover)] px-3 text-sm font-bold">{cur.hours ? cur.hours.toFixed(1) : "—"}</div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{L.awake}</label>
            <input type="number" min="0" max="10" step="1" value={cur.awakenings || 0} onChange={(e) => update({ awakenings: parseInt(e.target.value) || 0 })} className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-[var(--hover)] px-3 py-2.5">
          <span className="text-[12px] font-semibold text-[var(--ink-soft)]">{t("sleepQuality")} · {L.auto}:</span>
          <span className="text-[13px] font-bold text-[var(--accent-deep)]">{cur.quality > 0 ? qualityLabel(cur.quality) : "—"}</span>
        </div>

        <div className="mt-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">🌙 {L.note}</label>
          <textarea value={cur.note || ""} onChange={(e) => update({ note: e.target.value })} placeholder={L.notePh} rows={3} className="mt-1 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
        </div>
      </div>

      {/* Карточки */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{t("sleepHours")}</div>
          <div className="font-display mt-2 text-[22px] font-bold leading-none">{avgHours !== null ? avgHours.toFixed(1) : "—"}</div>
        </div>
        <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{t("sleepQuality")}</div>
          <div className="font-display mt-2 text-[22px] font-bold leading-none text-[var(--accent-deep)]">{avgQuality !== null ? qualityLabel(Math.round(avgQuality)) : "—"}</div>
        </div>
        <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{L.awake}</div>
          <div className="font-display mt-2 text-[22px] font-bold leading-none">{avgAwake !== null ? avgAwake.toFixed(1) : "—"}</div>
        </div>
      </div>

      {/* Графики */}
      {week.length === 0 ? (
        <div className={`${card} animate-rise flex flex-col items-center gap-3 py-16 text-center`}>
          <SleepIcon className="h-10 w-10 text-[var(--ink-faint)]" />
          <p className="text-sm text-[var(--ink-faint)]">{t("sleepNoData")}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="mb-3 text-[15px] font-bold">{t("sleepHours")}</h3>
            <div className="space-y-2">
              {week.map((x) => (
                <div key={x.iso} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-[var(--ink-faint)]">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(fromISO(x.iso))}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--hover)]">
                    <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${Math.min(100, ((x.d!.hours || 0) / 12) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold">{(x.d!.hours || 0).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="mb-3 text-[15px] font-bold">{t("sleepQuality")}</h3>
            <div className="space-y-2">
              {week.filter((x) => x.d!.quality > 0).map((x) => (
                <div key={x.iso} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-[var(--ink-faint)]">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(fromISO(x.iso))}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--hover)]">
                    <div className="h-full rounded-full bg-[var(--accent-deep)] transition-all duration-300" style={{ width: `${Math.min(100, (x.d!.quality / 5) * 100)}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold">{qualityLabel(x.d!.quality)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
