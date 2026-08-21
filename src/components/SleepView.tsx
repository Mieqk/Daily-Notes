import { useMemo, useState } from "react";
import type { Lang, TKey } from "../i18n";
import { localeOf } from "../i18n";
import type { SleepData } from "../store";
import { fromISO, shiftISO, todayISO, toISO } from "../store";
import { SleepIcon } from "../icons";

interface SleepViewProps {
  sleep: Record<string, SleepData>;
  lang: Lang;
  t: (k: TKey) => string;
  setSleep: (iso: string, data: SleepData | null) => void;
}

export default function SleepView({ sleep, lang, t, setSleep }: SleepViewProps) {
  const [range, setRange] = useState<7 | 30>(7);
  const locale = localeOf(lang);
  const today = todayISO();

  const days = useMemo(() => {
    const list: {
      iso: string;
      label: string;
      hours: number | null;
      quality: number | null;
      deep: number;
      light: number;
      rem: number;
      awake: number;
      bedtime: string | null;
      wakeTime: string | null;
      hasEntry: boolean;
    }[] = [];
    const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    for (let i = range - 1; i >= 0; i--) {
      const iso = shiftISO(today, -i);
      const data = sleep[iso];
      list.push({
        iso,
        label: fmt.format(fromISO(iso)).replace(".", ""),
        hours: data?.hours ?? null,
        quality: data?.quality ?? null,
        deep: data?.deep ?? 0,
        light: data?.light ?? 0,
        rem: data?.rem ?? 0,
        awake: data?.awake ?? 0,
        bedtime: data?.bedtime ?? null,
        wakeTime: data?.wakeTime ?? null,
        hasEntry: data !== undefined && data !== null,
      });
    }
    return list;
  }, [range, sleep, locale, today]);

  const avgHours = useMemo(() => {
    const vals = days.filter((d) => d.hours !== null).map((d) => d.hours as number);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [days]);

  const avgQuality = useMemo(() => {
    const vals = days.filter((d) => d.quality !== null).map((d) => d.quality as number);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [days]);

  const totalDeep = days.reduce((a, d) => a + d.deep, 0);
  const totalLight = days.reduce((a, d) => d.light, 0);
  const totalRem = days.reduce((a, d) => a + d.rem, 0);
  const totalAwake = days.reduce((a, d) => a + d.awake, 0);

  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4";

  const qualityLabel = (q: number) => {
    if (q >= 4) return t("sleepExcellent");
    if (q >= 3) return t("sleepGood");
    if (q >= 2) return t("sleepAverage");
    return t("sleepPoor");
  };

  const hasData = days.some((d) => d.hasEntry);

  const handleFellAsleep = () => {
    const now = new Date();
    const iso = todayISO();
    const timeStr = now.toTimeString().slice(0, 5);
    const existing = sleep[iso] || null;
    setSleep(iso, {
      ...existing,
      bedtime: timeStr,
      hours: existing?.hours ?? 0,
      quality: existing?.quality ?? 3,
      deep: existing?.deep ?? 0,
      light: existing?.light ?? 0,
      rem: existing?.rem ?? 0,
      awake: existing?.awake ?? 0,
      wakeTime: existing?.wakeTime ?? null,
    });
  };

  const handleWokeUp = () => {
    const now = new Date();
    const iso = todayISO();
    const timeStr = now.toTimeString().slice(0, 5);
    const existing = sleep[iso] || null;
    
    let hours = existing?.hours ?? 0;
    if (existing?.bedtime) {
      const [bedH, bedM] = existing.bedtime.split(":").map(Number);
      const [wakeH, wakeM] = timeStr.split(":").map(Number);
      const bedMinutes = bedH * 60 + bedM;
      const wakeMinutes = wakeH * 60 + wakeM;
      const diffMinutes = wakeMinutes >= bedMinutes ? wakeMinutes - bedMinutes : (24 * 60 - bedMinutes) + wakeMinutes;
      hours = diffMinutes / 60;
    }
    
    setSleep(iso, {
      ...existing,
      wakeTime: timeStr,
      hours,
      quality: existing?.quality ?? 3,
      deep: existing?.deep ?? 0,
      light: existing?.light ?? 0,
      rem: existing?.rem ?? 0,
      awake: existing?.awake ?? 0,
      bedtime: existing?.bedtime ?? null,
    });
  };

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
          <SleepIcon className="h-4 w-4" />
          {t("sleepSub")}
        </span>
      </div>

      {/* Quick action buttons for today */}
      <div className={`${card} mb-5 animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-3">
          <h3 className="text-[15px] font-bold">{t("todayBadge")}</h3>
          <p className="text-xs text-[var(--ink-faint)]">{t("sleepRecentSub")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleFellAsleep}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-ink)] transition-all duration-200 hover:opacity-90"
          >
            <span>🌙</span>
            {t("sleepFellAsleep")} — {new Date().toTimeString().slice(0, 5)}
          </button>
          <button
            onClick={handleWokeUp}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-deep)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:opacity-90"
          >
            <span>☀️</span>
            {t("sleepWokeUp")} — {new Date().toTimeString().slice(0, 5)}
          </button>
        </div>
        {sleep[todayISO()]?.bedtime && (
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            {t("sleepBedtime")}: <span className="font-semibold">{sleep[todayISO()].bedtime}</span>
            {sleep[todayISO()]?.wakeTime && (
              <>
                {" | "}{t("sleepWakeTime")}: <span className="font-semibold">{sleep[todayISO()].wakeTime}</span>
                {" | "}{t("sleepHours")}: <span className="font-semibold">{sleep[todayISO()].hours.toFixed(1)}</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {[
          { label: t("statEntries"), value: days.filter((d) => d.hasEntry).length },
          {
            label: t("sleepHours"),
            value: avgHours !== null ? `${avgHours.toFixed(1)}` : "—",
          },
          {
            label: t("sleepQuality"),
            value:
              avgQuality !== null ? (
                <span className="text-[var(--accent-deep)]">{qualityLabel(Math.round(avgQuality))}</span>
              ) : (
                "—"
              ),
          },
          { label: t("sleepDeep"), value: `${totalDeep} мин` },
          { label: t("sleepLight"), value: `${totalLight} мин` },
          { label: t("sleepREM"), value: `${totalRem} мин` },
        ].map((c, i) => (
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
          <SleepIcon className="h-10 w-10 text-[var(--ink-faint)]" />
          <p className="text-sm text-[var(--ink-faint)]">{t("sleepNoData")}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sleep Hours Chart */}
          <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-3">
              <h3 className="text-[15px] font-bold">{t("sleepHours")}</h3>
              <p className="text-xs text-[var(--ink-faint)]">{t("sleepHoursSub")}</p>
            </div>
            <div className="space-y-2">
              {days
                .filter((d) => d.hours !== null)
                .slice(0, 7)
                .map((d) => (
                  <div key={d.iso} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-[var(--ink-faint)]">{d.label}</span>
                    <div className="flex-1 rounded-full bg-[var(--hover)] h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (d.hours! / 12) * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold">{d.hours!.toFixed(1)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Sleep Quality Chart */}
          <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-3">
              <h3 className="text-[15px] font-bold">{t("sleepQuality")}</h3>
              <p className="text-xs text-[var(--ink-faint)]">{t("sleepQualitySub")}</p>
            </div>
            <div className="space-y-2">
              {days
                .filter((d) => d.quality !== null)
                .slice(0, 7)
                .map((d) => (
                  <div key={d.iso} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-[var(--ink-faint)]">{d.label}</span>
                    <div className="flex-1 rounded-full bg-[var(--hover)] h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-deep)] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (d.quality! / 4) * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold">{qualityLabel(d.quality!)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Sleep Phases */}
          <div className={`${card} animate-rise lg:col-span-2`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-3">
              <h3 className="text-[15px] font-bold">{t("sleepPhases")}</h3>
              <p className="text-xs text-[var(--ink-faint)]">{t("sleepPhasesSub")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: t("sleepDeep"), value: totalDeep, color: "bg-indigo-500" },
                { label: t("sleepLight"), value: totalLight, color: "bg-blue-400" },
                { label: t("sleepREM"), value: totalRem, color: "bg-purple-400" },
                { label: t("sleepAwake"), value: totalAwake, color: "bg-orange-400" },
              ].map((phase) => (
                <div key={phase.label} className="text-center">
                  <div className={`mx-auto mb-2 h-16 w-16 rounded-full ${phase.color} opacity-80`} />
                  <div className="text-xs text-[var(--ink-faint)]">{phase.label}</div>
                  <div className="font-display text-lg font-bold">{phase.value} мин</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Entries Table */}
          <div className={`${card} animate-rise lg:col-span-2`} style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-3">
              <h3 className="text-[15px] font-bold">{t("sleepRecent")}</h3>
              <p className="text-xs text-[var(--ink-faint)]">{t("sleepRecentSub")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--ink-faint)]">
                    <th className="py-2 font-semibold">{t("date")}</th>
                    <th className="py-2 font-semibold">{t("sleepBedtime")}</th>
                    <th className="py-2 font-semibold">{t("sleepWakeTime")}</th>
                    <th className="py-2 font-semibold">{t("sleepHours")}</th>
                    <th className="py-2 font-semibold">{t("sleepQuality")}</th>
                  </tr>
                </thead>
                <tbody>
                  {days
                    .filter((d) => d.hasEntry)
                    .slice(0, 10)
                    .map((d) => (
                      <tr key={d.iso} className="border-b border-[var(--line)] last:border-0">
                        <td className="py-2.5">{d.label}</td>
                        <td className="py-2.5 text-[var(--ink-soft)]">{d.bedtime ?? "—"}</td>
                        <td className="py-2.5 text-[var(--ink-soft)]">{d.wakeTime ?? "—"}</td>
                        <td className="py-2.5 font-medium">{d.hours?.toFixed(1) ?? "—"}</td>
                        <td className="py-2.5 text-[var(--accent-deep)]">
                          {d.quality !== null ? qualityLabel(d.quality) : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
