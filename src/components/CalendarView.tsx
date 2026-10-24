import { useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf, MOODS } from "../i18n";
import type { Task } from "../store";
import { fromISO, toISO, todayISO } from "../store";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";
import { makeUI } from "../ui-strings";

interface CalendarViewProps {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  onOpen: (iso: string) => void;
  lang: Lang;
}

/** Насыщенность акцента по уровню настроения 0..4 */
const MOOD_MIX = [18, 34, 52, 72, 92];

export default function CalendarView({ notes, tasks, moods, onOpen, lang }: CalendarViewProps) {
  const u = makeUI(lang);
  const locale = localeOf(lang);
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // неделя с понедельника

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor);
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i))),
    [locale],
  );

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, month, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const written = cells.filter((iso): iso is string => Boolean(iso && (notes[iso] ?? "").trim())).length;
  const shift = (n: number) => setCursor(new Date(year, month + n, 1));
  const navBtn = "grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--ink-faint)] hover:text-[var(--ink)] active:scale-90";

  return (
    <div className="animate-rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => shift(-1)} className={navBtn} aria-label="previous month"><ArrowLeftIcon className="h-4 w-4" /></button>
        <button onClick={() => shift(1)} className={navBtn} aria-label="next month"><ArrowRightIcon className="h-4 w-4" /></button>
        <h3 className="font-display text-lg font-bold capitalize">{monthLabel}</h3>
        <button
          onClick={() => setCursor(new Date(fromISO(today).getFullYear(), fromISO(today).getMonth(), 1))}
          className="h-9 rounded-full border border-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-deep)] transition-all hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] active:scale-95"
        >
          {u("calToday")}
        </button>
        <span className="ml-auto text-sm text-[var(--ink-soft)]">{u("calEntries")}: <b className="text-[var(--ink)]">{written}</b></span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekdays.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{w}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />;
          const has = Boolean((notes[iso] ?? "").trim());
          const mood = moods[iso];
          const dayTasks = tasks[iso] ?? [];
          const done = dayTasks.filter((x) => x.done).length;
          const isToday = iso === today;
          const day = Number(iso.slice(8));
          const bg = mood !== undefined ? `color-mix(in srgb, var(--accent) ${MOOD_MIX[Math.max(0, Math.min(4, mood))]}%, var(--panel-2))` : undefined;
          const lightText = mood !== undefined && mood >= 3;
          const label = `${iso}${has ? "" : ` · ${u("calNoEntry")}`}${mood !== undefined ? ` · ${MOODS[lang][mood]}` : ""}`;
          return (
            <button
              key={iso}
              onClick={() => onOpen(iso)}
              aria-label={label}
              title={label}
              className={`relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 active:scale-95 ${isToday ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-[var(--line)]"} ${mood === undefined ? "bg-[var(--panel-2)]" : ""}`}
              style={{ background: bg, color: lightText ? "var(--accent-ink)" : "var(--ink)" }}
            >
              <span>{day}</span>
              {has && <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: lightText ? "var(--accent-ink)" : "var(--accent)" }} />}
              {dayTasks.length > 0 && done === dayTasks.length && (
                <span className="absolute right-1.5 top-1 text-[10px] leading-none" aria-hidden="true">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-[var(--ink-soft)]">
        <span>{u("calMood")}:</span>
        {MOOD_MIX.map((m, i) => (
          <span key={m} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded" style={{ background: `color-mix(in srgb, var(--accent) ${m}%, var(--panel-2))` }} />
            {MOODS[lang][i]}
          </span>
        ))}
      </div>
    </div>
  );
}
