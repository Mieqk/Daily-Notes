import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { AVAILS, NOTE_MAX, availOf, bothFreeDays, cleanNote, nextAvail, type Avail, type AvailRow } from "../lib/pairAvailability";
import { makeAvail } from "../pair-availability-strings";
import { fromISO, shiftISO, todayISO } from "../store";
import FriendsSection from "./FriendsSection";

const ICON: Record<Avail, string> = { busy: "⛔", evening: "🌆", free: "✅" };
const TONE: Record<Avail, string> = {
  busy: "bg-[var(--danger-soft)] text-[var(--danger)]",
  evening: "bg-[var(--hover)] text-[var(--ink)]",
  free: "bg-[var(--accent-soft)] text-[var(--accent-deep)]",
};
const SKEY = { busy: "sBusy", evening: "sEvening", free: "sFree" } as const;

/** Быстрая отметка «занят(а) / свободен(на)»: сегодня одним нажатием и ближайшие дни одним нажатием на день. */
export default function PairAvailability({ linkId, userId, otherId, lang, name, view }: {
  linkId: string; userId: string; otherId: string; lang: Lang; name: string; view: "today" | "plans";
}) {
  const t = makeAvail(lang);
  const today = todayISO();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftISO(today, i)), [today]);
  const [rows, setRows] = useState<AvailRow[]>([]);
  const [failed, setFailed] = useState(false);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null); // null: поле не редактируется

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("pair_availability").select("user_id,day,status,note").eq("link_id", linkId).gte("day", days[0]).lte("day", days[6]);
    if (error) { setFailed(true); return; }
    setFailed(false);
    setRows((data ?? []) as AvailRow[]);
  }, [linkId, days]);
  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  /** Ставит отметку на день (null снимает). Сразу показываем, потом сверяемся с базой. */
  const set = async (day: string, status: Avail | null, text: string | null = null) => {
    if (!supabase || busy) return;
    setBusy(true); setErr(false);
    const prev = rows;
    setRows((r) => [...r.filter((x) => !(x.user_id === userId && x.day === day)), ...(status ? [{ user_id: userId, day, status, note: text }] : [])]);
    const { error } = status
      ? await supabase.from("pair_availability").upsert({ link_id: linkId, user_id: userId, day, status, note: text, updated_at: new Date().toISOString() }, { onConflict: "link_id,user_id,day" })
      : await supabase.from("pair_availability").delete().eq("link_id", linkId).eq("user_id", userId).eq("day", day);
    setBusy(false);
    if (error) { setRows(prev); setErr(true); }
  };

  if (failed) return <FriendsSection icon="🗓️" title={t("title")}><p className="text-[12.5px] leading-snug text-[var(--ink-soft)]">{t("setup")}</p></FriendsSection>;

  const wd = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short" });
  const dm = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "short" });

  if (view === "today") {
    const mine = availOf(rows, userId, today);
    const theirs = availOf(rows, otherId, today);
    const label = (k: Avail) => t(k);
    return (
      <FriendsSection icon="🗓️" title={t("title")} hint={t("hint").replace("{name}", name)}>
        <div className={`mb-3 rounded-xl px-3.5 py-3 text-[13.5px] ${theirs ? TONE[theirs.status] : "bg-[var(--hover)] text-[var(--ink-faint)]"}`} aria-live="polite">
          {theirs ? (
            <>
              <span aria-hidden>{ICON[theirs.status]} </span>
              <span className="font-semibold">{t("their").replace("{name}", name).replace("{status}", t(SKEY[theirs.status]))}</span>
              {theirs.note && <span className="mt-0.5 block break-words text-[12.5px] opacity-80">«{theirs.note}»</span>}
            </>
          ) : t("none").replace("{name}", name)}
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("title")}>
          {AVAILS.map((a) => {
            const on = mine?.status === a;
            return (
              <button key={a} aria-pressed={on} disabled={busy}
                onClick={() => { setNote(null); set(today, on ? null : a, on ? null : mine?.note ?? null); }}
                className={`flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition-all active:scale-95 disabled:opacity-60 ${on ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--hover)] text-[var(--ink-soft)]"}`}>
                <span aria-hidden className="text-[20px] leading-none">{ICON[a]}</span>
                <span className="w-full break-words text-[11.5px] font-semibold leading-tight">{label(a)}</span>
              </button>
            );
          })}
        </div>
        {mine && (
          note === null ? (
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[12.5px] text-[var(--ink-soft)]">
              <button onClick={() => setNote(mine.note ?? "")} className="min-h-[2.25rem] min-w-0 truncate text-left underline-offset-2 hover:underline">
                {mine.note ? `«${mine.note}»` : t("notePh")}
              </button>
              <button onClick={() => set(today, null)} className="min-h-[2.25rem] shrink-0 text-[var(--ink-faint)] hover:underline">{t("clear")}</button>
            </div>
          ) : (
            <form className="mt-2.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); set(today, mine.status, cleanNote(note)); setNote(null); }}>
              <input autoFocus value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder={t("notePh")} aria-label={t("notePh")}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
              <button type="submit" className="h-10 shrink-0 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95">{t("noteSave")}</button>
            </form>
          )
        )}
        {err && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
      </FriendsSection>
    );
  }

  const both = bothFreeDays(rows, userId, otherId, days);
  const cell = (uid: string, d: string, own: boolean) => {
    const r = availOf(rows, uid, d);
    const inner = r ? <span aria-hidden>{ICON[r.status]}</span> : <span aria-hidden className="h-1 w-3 rounded-full bg-[var(--line)]" />;
    const cls = `flex h-10 items-center justify-center rounded-lg text-[17px] ${r ? TONE[r.status] : ""}`;
    const lbl = `${own ? t("you") : name}, ${dm.format(fromISO(d))}: ${r ? t(SKEY[r.status]) : "–"}`;
    return own
      ? <button key={d} disabled={busy} aria-label={lbl} onClick={() => set(d, nextAvail(r?.status ?? null), nextAvail(r?.status ?? null) ? r?.note ?? null : null)} className={`${cls} transition-all active:scale-95 disabled:opacity-60`}>{inner}</button>
      : <div key={d} role="img" aria-label={lbl} className={cls}>{inner}</div>;
  };
  const grid = "grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] items-center gap-x-0.5";
  return (
    <FriendsSection icon="🗓️" title={t("weekTitle")} hint={t("weekHint")}>
      <div className={`${grid} mb-1 text-center text-[10.5px] text-[var(--ink-faint)]`} aria-hidden>
        <span />{days.map((d) => <span key={d} className="truncate">{wd.format(fromISO(d))}</span>)}
      </div>
      <div className={`${grid} mb-1`}>
        <span className="truncate text-[12px] font-semibold text-[var(--ink-soft)]">{t("you")}</span>
        {days.map((d) => cell(userId, d, true))}
      </div>
      <div className={grid}>
        <span className="truncate text-[12px] font-semibold text-[var(--ink-soft)]">{name}</span>
        {days.map((d) => cell(otherId, d, false))}
      </div>
      <p className="mt-2.5 text-[12.5px] leading-snug text-[var(--ink-soft)]">
        {both.length ? t("both").replace("{days}", both.map((d) => dm.format(fromISO(d))).join(", ")) : t("noBoth")}
      </p>
      {err && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
    </FriendsSection>
  );
}
