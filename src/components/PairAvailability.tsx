import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { usePairKind } from "../lib/pairKindContext";
import { nextAvailability, sharedFreeDays, statusByDay, type Availability, type AvailabilityRow } from "../lib/pairAvailability";
import { makeTogether } from "../pair-together-strings";
import { fromISO, shiftISO, todayISO } from "../store";
import FriendsSection from "./FriendsSection";

/** «Когда мы свободны»: каждый отмечает дни свободно/занято, приложение показывает общие свободные дни. */
export default function PairAvailability({ linkId, userId, lang, otherId, name }: {
  linkId: string; userId: string; lang: Lang; otherId: string; name: string;
}) {
  const t = makeTogether(lang, usePairKind());
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [week, setWeek] = useState(0);
  const [err, setErr] = useState(false);
  const today = todayISO();
  const allDays = useMemo(() => Array.from({ length: 14 }, (_, i) => shiftISO(today, i)), [today]);
  const days = allDays.slice(week * 7, week * 7 + 7);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("pair_availability").select("user_id,day,status").eq("link_id", linkId).gte("day", todayISO());
    setRows((data ?? []) as AvailabilityRow[]);
  }, [linkId]);
  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const mine = statusByDay(rows, userId, days);
  const theirs = statusByDay(rows, otherId, days);
  const both = sharedFreeDays(rows, userId, otherId, allDays);
  const theirsAny = rows.some((r) => r.user_id === otherId);

  const fmtLong = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short", day: "numeric", month: "short" });
  const fmtShort = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short", day: "numeric" });
  const label = (s: Availability | null) => (s === "free" ? t("aFree") : s === "busy" ? t("aBusy") : t("aUnset"));

  // статус меняется сразу на экране, а база догоняет; при ошибке возвращаем как было
  const tap = async (day: string, cur: Availability | null) => {
    if (!supabase) return;
    const next = nextAvailability(cur);
    setErr(false);
    setRows((rs) => [...rs.filter((r) => !(r.user_id === userId && r.day === day)), ...(next ? [{ user_id: userId, day, status: next }] : [])]);
    const { error } = next
      ? await supabase.from("pair_availability").upsert({ link_id: linkId, user_id: userId, day, status: next, updated_at: new Date().toISOString() }, { onConflict: "link_id,user_id,day" })
      : await supabase.from("pair_availability").delete().eq("link_id", linkId).eq("user_id", userId).eq("day", day);
    if (error) setErr(true);
    load();
  };

  const tab = (on: boolean) => `h-9 flex-1 rounded-lg px-2 text-[12.5px] font-semibold transition-all active:scale-95 ${on ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`;
  const grid = "grid grid-cols-7 gap-1";
  const cell = (s: Availability | null, shared: boolean) =>
    `flex h-12 min-w-0 flex-col items-center justify-center rounded-lg text-[15px] font-bold leading-none transition-all ${
      s === "free" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : s === "busy" ? "bg-[var(--hover)] text-[var(--ink-soft)]" : "border border-dashed border-[var(--line)] text-[var(--ink-faint)]"
    } ${shared ? "ring-2 ring-[var(--accent)]" : ""}`;
  const mark = (s: Availability | null) => (s === "free" ? "✓" : s === "busy" ? "✕" : "–");

  return (
    <FriendsSection icon="🗓️" title={t("aTitle")} hint={t("aHint")}>
      <div className="mb-3 flex gap-1" role="group" aria-label={t("aTitle")}>
        <button onClick={() => setWeek(0)} aria-pressed={week === 0} className={tab(week === 0)}>{t("aThis")}</button>
        <button onClick={() => setWeek(1)} aria-pressed={week === 1} className={tab(week === 1)}>{t("aNext")}</button>
      </div>

      <div className={`${grid} mb-1 text-center text-[10.5px] text-[var(--ink-faint)]`} aria-hidden>
        {days.map((d) => <span key={d} className="truncate">{fmtShort.format(fromISO(d))}</span>)}
      </div>

      <div className="mb-1 text-[12px] font-semibold text-[var(--ink-soft)]">{t("mYou")}</div>
      <div className={grid}>
        {days.map((d, i) => (
          <button key={d} onClick={() => tap(d, mine[i])} aria-label={`${fmtLong.format(fromISO(d))}: ${label(mine[i])}, ${t("aTap")}`}
            className={`${cell(mine[i], both.includes(d))} active:scale-95`}>{mark(mine[i])}</button>
        ))}
      </div>

      <div className="mb-1 mt-3 truncate text-[12px] font-semibold text-[var(--ink-soft)]">{name}</div>
      <div className={grid}>
        {days.map((d, i) => (
          <div key={d} role="img" aria-label={`${fmtLong.format(fromISO(d))}: ${label(theirs[i])}`} className={cell(theirs[i], both.includes(d))}>{mark(theirs[i])}</div>
        ))}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-3 text-[11.5px] text-[var(--ink-faint)]" aria-hidden>
        <span>✓ {t("aFree")}</span><span>✕ {t("aBusy")}</span><span>– {t("aUnset")}</span>
      </p>
      <p className={`mt-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${both.length ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--hover)] text-[var(--ink-soft)]"}`} aria-live="polite">
        {both.length ? t("aBoth").replace("{days}", both.slice(0, 5).map((d) => fmtLong.format(fromISO(d))).join(", ")) : theirsAny ? t("aNone") : t("aWait").replace("{name}", name)}
      </p>
      {err && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
    </FriendsSection>
  );
}
