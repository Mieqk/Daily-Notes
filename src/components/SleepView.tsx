import { useState } from "react";
import type { Lang, TKey } from "../i18n";
import { localeOf } from "../i18n";
import type { SleepData } from "../store";
import { fromISO, shiftISO, todayISO } from "../store";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";

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

  /* ---------- таймлайн ночи: ось 18:00 → 12:00 ---------- */
  const toMin = (hm?: string) => {
    if (!hm) return null;
    const [h, m] = hm.split(":").map(Number);
    return Number.isNaN(h) ? null : h * 60 + m;
  };
  const AXIS_START = 18 * 60;
  const AXIS_SPAN = 18 * 60;
  const bedMin = toMin(cur.bedtime);
  const wakeMin = toMin(cur.waketime);
  let tl: { left: number; width: number } | null = null;
  if (bedMin !== null && wakeMin !== null) {
    let b = bedMin < AXIS_START ? bedMin + 1440 : bedMin;
    let w = wakeMin < AXIS_START ? wakeMin + 1440 : wakeMin;
    if (w <= b) w = b + 1;
    b = Math.max(AXIS_START, Math.min(AXIS_START + AXIS_SPAN, b));
    w = Math.max(AXIS_START, Math.min(AXIS_START + AXIS_SPAN, w));
    tl = { left: ((b - AXIS_START) / AXIS_SPAN) * 100, width: Math.max(1.5, ((w - b) / AXIS_SPAN) * 100) };
  }
  const TICKS = ["18", "21", "00", "03", "06", "09", "12"];

  /* ---------- неделя: 7 столбцов, пустые дни тоже видны ---------- */
  const weekCols = Array.from({ length: 7 }, (_, i) => {
    const iso = shiftISO(today, i - 6);
    return { iso, d: sleep[iso] };
  });
  const isToday = editDate === today;
  const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(fromISO(editDate));
  const weekdayLabel = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(fromISO(editDate));
  const label = "block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]";
  const input = "mt-1.5 h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none transition-colors focus:border-[var(--accent)]";
  const iconBtn = "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--ink-faint)] hover:text-[var(--ink)] active:scale-90";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Выбор дня */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setEditDate(shiftISO(editDate, -1))} className={iconBtn} aria-label="previous day"><ArrowLeftIcon className="h-4 w-4" /></button>
          <button onClick={() => setEditDate(shiftISO(editDate, 1))} disabled={isToday} className={`${iconBtn} ${isToday ? "cursor-not-allowed opacity-40" : ""}`} aria-label="next day"><ArrowRightIcon className="h-4 w-4" /></button>
        </div>
        <div className="min-w-0">
          <div className="font-display truncate text-lg font-bold capitalize leading-tight">{weekdayLabel}</div>
          <div className="text-xs text-[var(--ink-soft)]">{dateLabel}</div>
        </div>
        {!isToday && (
          <button onClick={() => setEditDate(today)} className="ml-auto h-9 rounded-full border border-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-deep)] transition-all duration-150 hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] active:scale-95">{t("btnToday")}</button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Ночь: итог + ввод */}
        <div className={`${card} animate-rise flex flex-col gap-5 !p-5`} style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className={label}>{t("sleepHours")}</div>
              <div className="font-display mt-1 text-[40px] font-bold leading-none tabular-nums">
                {cur.hours ? cur.hours.toFixed(1) : "—"}
                {cur.hours ? <span className="ml-1.5 text-[16px] font-semibold text-[var(--ink-soft)]">{L.unit}</span> : null}
              </div>
            </div>
            <div className="min-w-[150px]">
              <div className={label}>{t("sleepQuality")}</div>
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${n <= cur.quality ? "bg-[var(--accent)]" : "bg-[var(--hover)]"}`} />
                ))}
              </div>
              <div className="mt-1.5 text-[13px] font-bold text-[var(--accent-deep)]">{cur.quality > 0 ? qualityLabel(cur.quality) : "—"}</div>
            </div>
          </div>

          {/* Ось ночи */}
          <div>
            <div className="relative h-8 rounded-lg bg-[var(--hover)]">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="absolute top-0 h-full w-px bg-[var(--line)]" style={{ left: `${(n / 6) * 100}%` }} />
              ))}
              {tl && (
                <span className="absolute top-1 h-6 rounded-md bg-[var(--accent)] transition-all duration-300" style={{ left: `${tl.left}%`, width: `${tl.width}%` }} />
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-[var(--ink-faint)]" aria-hidden="true">
              {TICKS.map((x) => <span key={x}>{x}</span>)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>{t("sleepBedtime")}</label>
              <input type="time" value={cur.bedtime || ""} onChange={(e) => update({ bedtime: e.target.value })} className={input} />
              {isToday && (
                <button onClick={() => update({ bedtime: nowHM() })} className="mt-1.5 flex h-9 items-center gap-1.5 rounded-lg px-1 text-[12px] font-semibold text-[var(--accent-deep)] transition-all hover:underline active:scale-95">🌙 {t("sleepFellAsleep")} {nowHM()}</button>
              )}
            </div>
            <div>
              <label className={label}>{t("sleepWakeTime")}</label>
              <input type="time" value={cur.waketime || ""} onChange={(e) => update({ waketime: e.target.value })} className={input} />
              {isToday && (
                <button onClick={() => update({ waketime: nowHM() })} className="mt-1.5 flex h-9 items-center gap-1.5 rounded-lg px-1 text-[12px] font-semibold text-[var(--accent-deep)] transition-all hover:underline active:scale-95">☀️ {t("sleepWokeUp")} {nowHM()}</button>
              )}
            </div>
            <div>
              <label className={label}>{L.awake}</label>
              <div className="mt-1.5 flex h-11 items-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel-2)]">
                <button onClick={() => update({ awakenings: Math.max(0, (cur.awakenings || 0) - 1) })} className="h-full w-11 text-lg font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] active:scale-90" aria-label="−">−</button>
                <span className="flex-1 text-center text-sm font-bold tabular-nums">{cur.awakenings || 0}</span>
                <button onClick={() => update({ awakenings: Math.min(10, (cur.awakenings || 0) + 1) })} className="h-full w-11 text-lg font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] active:scale-90" aria-label="+">+</button>
              </div>
            </div>
          </div>

          <div>
            <label className={label}>{L.note}</label>
            <textarea value={cur.note || ""} onChange={(e) => update({ note: e.target.value })} placeholder={L.notePh} rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-[var(--accent)]" />
          </div>
        </div>

        {/* Неделя */}
        <div className={`${card} animate-rise flex flex-col gap-4 !p-5`} style={{ boxShadow: "var(--shadow-sm)" }}>
          <div>
            <h3 className="text-[15px] font-bold">{t("sleepHours")}</h3>
            <p className="text-xs text-[var(--ink-soft)]">{avgHours !== null ? `${avgHours.toFixed(1)} ${L.unit} · ${avgQuality !== null ? qualityLabel(Math.round(avgQuality)) : ""}` : t("sleepNoData")}</p>
          </div>
          <div className="relative flex h-40 items-end gap-2">
            <span className="absolute left-0 right-0 border-t border-dashed border-[var(--line)]" style={{ bottom: `${(8 / 12) * 100}%` }} aria-hidden="true" />
            {weekCols.map(({ iso, d }) => {
              const h = d?.hours || 0;
              const active = iso === editDate;
              return (
                <button key={iso} onClick={() => setEditDate(iso)} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" aria-label={iso}>
                  <span className="text-[11px] font-semibold tabular-nums text-[var(--ink-soft)]">{h > 0 ? h.toFixed(1) : ""}</span>
                  <span className={`w-full rounded-md transition-all duration-300 ${h > 0 ? (active ? "bg-[var(--accent-deep)]" : "bg-[var(--accent)] group-hover:bg-[var(--accent-deep)]") : "bg-[var(--hover)]"}`} style={{ height: h > 0 ? `${Math.min(100, (h / 12) * 100) * 0.78}%` : "6px" }} />
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            {weekCols.map(({ iso }) => (
              <span key={iso} className={`flex-1 text-center text-[11px] font-semibold capitalize ${iso === editDate ? "text-[var(--accent-deep)]" : "text-[var(--ink-faint)]"}`}>
                {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(fromISO(iso))}
              </span>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-[var(--line)] pt-3 text-[13px]">
            <span className="text-[var(--ink-soft)]">{L.awake}</span>
            <span className="font-bold tabular-nums">{avgAwake !== null ? avgAwake.toFixed(1) : "—"}</span>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className={`${card} animate-rise mt-5`} style={{ boxShadow: "var(--shadow-sm)" }}>
          <h3 className="mb-3 text-[15px] font-bold">{L.history}</h3>
          <div className="space-y-2">
            {history.map(({ iso, d }) => (
              <button key={iso} onClick={() => setEditDate(iso)} className="flex w-full items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-left transition-colors hover:border-[var(--accent)]">
                <span className="w-28 shrink-0 text-[12px] font-semibold capitalize text-[var(--ink-soft)]">
                  {new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(fromISO(iso))}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--hover)]">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${Math.min(100, ((d!.hours || 0) / 12) * 100)}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-[13px] font-bold">{(d!.hours || 0).toFixed(1)} {L.unit}</span>
                <span className="hidden w-24 shrink-0 text-right text-[12px] text-[var(--ink-soft)] sm:block">
                  {d!.quality > 0 ? qualityLabel(d!.quality) : "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
