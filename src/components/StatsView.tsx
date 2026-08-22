import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Lang, TKey } from "../i18n";
import { MOODS, localeOf } from "../i18n";
import type { Task, SleepData } from "../store";
import { countWords, fromISO, shiftISO, todayISO } from "../store";
import { FlameIcon, MoodFace, MoodVisual, StatsIcon } from "../icons";

interface StatsViewProps {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  sleep: Record<string, SleepData>;
  moodEmoji: string[];
  lang: Lang;
  t: (k: TKey) => string;
}

const pearson = (xs: number[], ys: number[]) => {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
};

export default function StatsView({ notes, tasks, moods, moodEmoji, lang, t }: StatsViewProps) {
  const [range, setRange] = useState<7 | 30>(7);
  const locale = localeOf(lang);
  const today = todayISO();

  const days = useMemo(() => {
    const list: {
      iso: string;
      label: string;
      mood: number | null;
      done: number;
      total: number;
      words: number;
      hasEntry: boolean;
    }[] = [];
    const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    for (let i = range - 1; i >= 0; i--) {
      const iso = shiftISO(today, -i);
      const text = notes[iso] ?? "";
      const dayTasks = tasks[iso] ?? [];
      list.push({
        iso,
        label: fmt.format(fromISO(iso)).replace(".", ""),
        mood: moods[iso] !== undefined ? moods[iso] : null,
        done: dayTasks.filter((x) => x.done).length,
        total: dayTasks.length,
        words: countWords(text),
        hasEntry: text.trim().length > 0,
      });
    }
    return list;
  }, [range, notes, tasks, moods, locale, today]);

  /* ---------- aggregate ---------- */
  const entries = days.filter((d) => d.hasEntry).length;
  const moodVals = days.filter((d) => d.mood !== null).map((d) => d.mood as number);
  const avgMood = moodVals.length ? moodVals.reduce((a, b) => a + b, 0) / moodVals.length : null;
  const tasksDone = days.reduce((a, d) => a + d.done, 0);
  const tasksTotal = days.reduce((a, d) => a + d.total, 0);
  const productivity = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : null;

  const allTime = useMemo(() => {
    const keys = Object.keys(notes).filter((k) => (notes[k] ?? "").trim());
    let words = 0;
    for (const k of keys) words += countWords(notes[k] ?? "");
    let best = 0;
    let cur = 0;
    const sorted = [...keys].sort();
    for (let i = 0; i < sorted.length; i++) {
      cur = i > 0 && shiftISO(sorted[i - 1], 1) === sorted[i] ? cur + 1 : 1;
      if (cur > best) best = cur;
    }
    return { words, best };
  }, [notes]);

  /* ---------- correlation ---------- */
  const pairs = days.filter((d) => d.mood !== null && d.total > 0);
  const r = pearson(pairs.map((d) => d.done), pairs.map((d) => d.mood as number));
  const withTasks = days.filter((d) => d.mood !== null && d.done > 0).map((d) => d.mood as number);
  const withoutTasks = days.filter((d) => d.mood !== null && d.done === 0).map((d) => d.mood as number);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgWith = avg(withTasks);
  const avgWithout = avg(withoutTasks);
  const corrStrength = Math.abs(r) >= 0.5 ? t("corrStrong") : Math.abs(r) >= 0.25 ? t("corrMedium") : t("corrWeak");
  const hasData = days.some((d) => d.mood !== null || d.total > 0);

  /* ---------- heatmap (16 weeks) ---------- */
  const heat = useMemo(() => {
    const d = fromISO(today);
    const leadToMonday = (d.getDay() + 6) % 7;
    const start = shiftISO(today, -(leadToMonday + 7 * 15));
    const weeks: { iso: string; level: number; words: number; done: number }[][] = [];
    for (let w = 0; w < 16; w++) {
      const col: { iso: string; level: number; words: number; done: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const iso = shiftISO(start, w * 7 + day);
        if (iso > today) {
          col.push({ iso, level: -1, words: 0, done: 0 });
          continue;
        }
        const words = countWords(notes[iso] ?? "");
        const done = (tasks[iso] ?? []).filter((x) => x.done).length;
        const score = words / 50 + done;
        const level = score <= 0 ? 0 : score <= 0.75 ? 1 : score <= 2 ? 2 : score <= 4 ? 3 : 4;
        col.push({ iso, level, words, done });
      }
      weeks.push(col);
    }
    return weeks;
  }, [notes, tasks, today]);

  const moodTick = (props: { x?: number; y?: number; value?: number }) => {
    const { x = 0, y = 0, value = 0 } = props;
    const safeValue = Math.max(0, Math.min(4, value));
    const emoji = moodEmoji[safeValue];
    if (emoji) {
      /* используем первый графемный кластер, чтобы составные emoji не ломались */
      const label = Array.from(emoji).slice(0, 1).join("");
      return (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          style={{ textRendering: "optimizeLegibility" }}
        >
          {label}
        </text>
      );
    }
    return (
      <g transform={`translate(${x - 36}, ${y - 8})`} style={{ color: "var(--ink-faint)" }}>
        <MoodFace level={safeValue} className="h-3.5 w-3.5" />
      </g>
    );
  };

  const tipStyle = {
    background: "var(--panel-2)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--ink)",
    boxShadow: "var(--shadow-sm)",
  };

  const MoodTip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: (typeof days)[number] }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={tipStyle} className="px-3 py-2">
        <div className="font-semibold capitalize">
          {new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(fromISO(d.iso))}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[var(--ink-soft)]">
          {d.mood !== null ? (
            <>
              <MoodVisual level={Math.max(0, Math.min(4, d.mood))} emoji={moodEmoji[Math.max(0, Math.min(4, d.mood))]} className="h-4 w-4 text-[12px]" />
              {MOODS[lang][d.mood]}
            </>
          ) : (
            t("noMood")
          )}
        </div>
        {d.total > 0 && (
          <div className="text-[var(--ink-faint)]">
            {d.done}/{d.total} · {d.words} {t("words")}
          </div>
        )}
      </div>
    );
  };

  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4";

  const statCards: { label: string; value: React.ReactNode; hint?: string }[] = [
    { label: t("statEntries"), value: entries, hint: `${range}` },
    {
      label: t("statAvgMood"),
      value:
        avgMood !== null ? (
          <span className="flex items-center gap-2">
            <MoodVisual
              level={Math.max(0, Math.min(4, Math.round(avgMood)))}
              emoji={moodEmoji[Math.max(0, Math.min(4, Math.round(avgMood)))]}
              className="h-6 w-6 text-[20px] text-[var(--accent)]"
            />
            {avgMood.toFixed(1)}
          </span>
        ) : (
          "—"
        ),
    },
    { label: t("statTasksDone"), value: tasksDone },
    {
      label: t("statProductivity"),
      value: productivity !== null ? `${productivity}%` : "—",
      hint:
        productivity !== null
          ? undefined
          : undefined,
    },
    { label: t("statTotalWords"), value: allTime.words.toLocaleString(locale) },
    {
      label: t("statBestStreak"),
      value: (
        <span className="flex items-center gap-1.5">
          <FlameIcon className="h-5 w-5 text-[var(--accent)]" />
          {allTime.best}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Range toggle */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-8 rounded-lg px-4 text-[13px] font-semibold transition-all duration-200 ${
                range === r
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {r === 7 ? t("rangeWeek") : t("rangeMonth")}
            </button>
          ))}
        </div>
        <span className="hidden items-center gap-2 text-xs text-[var(--ink-faint)] sm:flex">
          <StatsIcon className="h-4 w-4" />
          {t("statsSub")}
        </span>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((c, i) => (
          <div
            key={c.label}
            className={`${card} animate-rise transition-transform duration-200 hover:-translate-y-0.5`}
            style={{ animationDelay: `${i * 50}ms`, boxShadow: "var(--shadow-sm)" }}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
              {c.label}
            </div>
            <div className="font-display mt-2 text-[22px] font-bold leading-none">{c.value}</div>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className={`${card} animate-rise flex flex-col items-center gap-3 py-16 text-center`}>
          <StatsIcon className="h-10 w-10 text-[var(--ink-faint)]" />
          <p className="text-sm text-[var(--ink-faint)]">{t("corrNoData")}</p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 lg:grid-cols-5">
            {/* Mood chart */}
            <div className={`${card} animate-rise lg:col-span-3`} style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="mb-3">
                <h3 className="text-[15px] font-bold">{t("moodChartTitle")}</h3>
                <p className="text-xs text-[var(--ink-faint)]">{t("moodChartSub")}</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={days} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--ink-faint)" }}
                      axisLine={{ stroke: "var(--line)" }}
                      tickLine={false}
                      interval={range === 7 ? 0 : 4}
                    />
                    <YAxis
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 4]}
                      width={48}
                      tickLine={false}
                      axisLine={false}
                      tick={moodTick as never}
                    />
                    <Tooltip content={<MoodTip />} cursor={{ stroke: "var(--line)" }} />
                    <Area
                      type="monotone"
                      dataKey="mood"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      fill="url(#moodGrad)"
                      connectNulls={false}
                      dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Correlation */}
            <div className={`${card} animate-rise lg:col-span-2`} style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-bold">{t("corrTitle")}</h3>
                  <p className="text-xs text-[var(--ink-faint)]">{t("corrSub")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-deep)]">
                  r = {r.toFixed(2)}
                </span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "var(--ink-faint)" }}
                      axisLine={{ stroke: "var(--line)" }}
                      tickLine={false}
                      interval={range === 7 ? 0 : 6}
                    />
                    <YAxis yAxisId="mood" domain={[0, 4]} hide />
                    <YAxis yAxisId="tasks" orientation="right" allowDecimals={false} width={26} tick={{ fontSize: 9, fill: "var(--ink-faint)" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<MoodTip />} cursor={{ fill: "var(--hover)", opacity: 0.5 }} />
                    <Bar yAxisId="tasks" dataKey="done" fill="var(--accent)" fillOpacity={0.35} radius={[3, 3, 0, 0]} />
                    <Line
                      yAxisId="mood"
                      type="monotone"
                      dataKey="mood"
                      stroke="var(--accent-deep)"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 border-t border-[var(--line)] pt-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--accent-deep)]">{corrStrength}</span>
                {" · "}
                {r >= 0 ? t("corrPositive") : t("corrNegative")}
                {avgWith !== null && avgWithout !== null && (
                  <span className="mt-1 block text-[var(--ink-faint)]">
                    {t("corrWithTasks")} <b className="text-[var(--ink)]">{avgWith.toFixed(1)}</b>, {t("corrWithout")}{" "}
                    <b className="text-[var(--ink)]">{avgWithout.toFixed(1)}</b>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold">{t("heatTitle")}</h3>
                <p className="text-xs text-[var(--ink-faint)]">{t("heatSub")}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--hover)]" />
                {[25, 50, 75, 100].map((p) => (
                  <span
                    key={p}
                    className="h-2.5 w-2.5 rounded-[3px]"
                    style={{ background: `color-mix(in srgb, var(--accent) ${p}%, var(--panel-2))` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <div className="flex flex-col gap-[3px] pt-[1px] text-[9px] font-bold text-[var(--ink-faint)]">
                {(lang === "ru" ? ["Пн", "", "Ср", "", "Пт", "", "Вс"] : ["Mo", "", "We", "", "Fr", "", "Su"]).map(
                  (w, i) => (
                    <span key={i} className="grid h-[11px] place-items-center leading-none">
                      {w}
                    </span>
                  )
                )}
              </div>
              {heat.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((cell) => (
                    <span
                      key={cell.iso}
                      title={
                        cell.level >= 0
                          ? `${cell.iso} · ${cell.words} ${t("words")} · ${cell.done} ✓`
                          : undefined
                      }
                      className="h-[11px] w-[11px] rounded-[3px] transition-transform duration-150 hover:scale-125"
                      style={{
                        background:
                          cell.level < 0
                            ? "transparent"
                            : cell.level === 0
                              ? "var(--hover)"
                              : `color-mix(in srgb, var(--accent) ${cell.level * 25}%, var(--panel-2))`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
