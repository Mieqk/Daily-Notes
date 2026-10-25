import { useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { fromISO, toISO, todayISO } from "../store";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";
import { makeUI } from "../ui-strings";

interface Props {
  /** число в клетке по дням (только дни с записями): ккал, подходы */
  valueByDay: Record<string, number>;
  /** цель на день: заливка считается от неё; без цели заливка идёт от максимума месяца */
  goal?: number;
  /** строка под календарём, например среднее за месяц */
  summary?: (visible: string[]) => string | null;
  selected: string;
  onPick: (iso: string) => void;
  lang: Lang;
}

/** Месяц: в каждой клетке число за день, заливка по доле от цели (или от максимума). Нажатие открывает день. */
export default function DayCalendar({ valueByDay, goal, summary, selected, onPick, lang }: Props) {
  const u = makeUI(lang);
  const locale = localeOf(lang);
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(selected || today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
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

  const logged = cells.filter((iso): iso is string => Boolean(iso && valueByDay[iso] > 0));
  const scale = goal && goal > 0 ? goal : Math.max(1, ...logged.map((iso) => valueByDay[iso]));
  const summaryText = summary?.(logged) ?? null;
  const shift = (n: number) => setCursor(new Date(year, month + n, 1));
  const navBtn = "grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--ink-faint)] hover:text-[var(--ink)] active:scale-90";

  return (
    <div className="animate-rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
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
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weekdays.map((w) => (
          <div key={w} className="pb-1 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{w}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />;
          const kcal = valueByDay[iso] ?? 0;
          const share = Math.min(1, kcal / scale);
          const isToday = iso === today;
          const dark = share >= 0.6;
          return (
            <button
              key={iso}
              onClick={() => onPick(iso)}
              aria-label={`${iso}${kcal ? ` · ${kcal}` : ""}`}
              title={kcal ? `${kcal}` : iso}
              className={`flex aspect-square min-h-[46px] flex-col items-center justify-center rounded-lg border text-[13px] font-semibold transition-all duration-150 hover:-translate-y-0.5 active:scale-95 ${isToday ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : iso === selected ? "border-[var(--ink-faint)]" : "border-[var(--line)]"}`}
              style={{
                background: kcal ? `color-mix(in srgb, var(--accent) ${Math.round(18 + share * 74)}%, var(--panel-2))` : "var(--panel-2)",
                color: dark ? "var(--accent-ink)" : "var(--ink)",
              }}
            >
              <span>{Number(iso.slice(8))}</span>
              {kcal > 0 && <span className="text-[9.5px] font-medium leading-none opacity-80">{kcal}</span>}
            </button>
          );
        })}
      </div>

      {summaryText && <p className="mt-4 text-[12.5px] text-[var(--ink-soft)]">{summaryText}</p>}
    </div>
  );
}
