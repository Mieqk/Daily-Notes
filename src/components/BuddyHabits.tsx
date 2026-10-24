import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { shiftISO, todayISO } from "../store";
import { makeSocial } from "../social-strings";
import type { FriendOpt } from "./SharedMemories";

interface Habit { id: string; owner: string; buddy: string; title: string }
interface Checkin { habit_id: string; user_id: string; day: string }

/** Серия вместе: подряд идущие дни, в которые отметились оба. Сегодня не обрывает серию, пока друг не отметился. */
export function pairStreak(mine: Set<string>, theirs: Set<string>, today: string): number {
  const both = (d: string) => mine.has(d) && theirs.has(d);
  let day = both(today) ? today : shiftISO(today, -1);
  let n = 0;
  while (both(day)) { n++; day = shiftISO(day, -1); }
  return n;
}

/** Парные привычки (Buddy System). */
export default function BuddyHabits({ userId, lang, friends }: { userId: string; lang: Lang; friends: FriendOpt[] }) {
  const s = makeSocial(lang);
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [checks, setChecks] = useState<Checkin[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [withId, setWithId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("buddy_habits").select("*").order("created_at", { ascending: false });
    if (error) { setHabits([]); return; }
    const list = (data ?? []) as Habit[];
    setHabits(list);
    if (list.length === 0) { setChecks([]); return; }
    const since = shiftISO(todayISO(), -120);
    const { data: c } = await supabase!.from("buddy_checkins").select("*").in("habit_id", list.map((h) => h.id)).gte("day", since);
    setChecks((c ?? []) as Checkin[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (habits === null) return null;

  const today = todayISO();
  const nameOf = (id: string) => friends.find((f) => f.id === id)?.name || "—";
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";

  const create = async () => {
    const buddy = withId || friends[0]?.id;
    if (!buddy || !title.trim()) return;
    setBusy(true); setErr(false);
    const { error } = await supabase!.from("buddy_habits").insert({ owner: userId, buddy, title: title.trim() });
    setBusy(false);
    if (error) { setErr(true); return; }
    setComposing(false); setTitle("");
    load();
  };

  const toggle = async (habitId: string, done: boolean) => {
    setBusy(true);
    const q = supabase!.from("buddy_checkins");
    if (done) await q.delete().eq("habit_id", habitId).eq("user_id", userId).eq("day", today);
    else await q.insert({ habit_id: habitId, user_id: userId, day: today });
    setBusy(false);
    load();
  };

  const end = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    await supabase!.from("buddy_habits").delete().eq("id", id);
    setConfirmId(null);
    load();
  };

  return (
    <div className="mb-5 animate-rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">🤝 {s("buddyTitle")}</h3>
        {friends.length > 0 && !composing && (
          <button onClick={() => { setComposing(true); setWithId(friends[0].id); }} className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] hover:bg-[var(--accent-soft)]">+ {s("buddyAdd")}</button>
        )}
      </div>

      {composing && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-[var(--hover)] p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={s("buddyPh")} aria-label={s("buddyPh")} className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          <select value={withId} onChange={(e) => setWithId(e.target.value)} aria-label={s("memWith")} className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]">
            {friends.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {err && <p className="text-[12.5px] text-[var(--danger)]">{s("error")}</p>}
          <div className="flex gap-2">
            <button onClick={create} disabled={busy || !title.trim()} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{s("buddyStart")}</button>
            <button onClick={() => setComposing(false)} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--panel)]`}>✕</button>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-soft)]">{s("buddyEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {habits.map((h) => {
            const other = h.owner === userId ? h.buddy : h.owner;
            const mine = new Set(checks.filter((c) => c.habit_id === h.id && c.user_id === userId).map((c) => c.day));
            const theirs = new Set(checks.filter((c) => c.habit_id === h.id && c.user_id === other).map((c) => c.day));
            const iDone = mine.has(today);
            const theyDone = theirs.has(today);
            const streak = pairStreak(mine, theirs, today);
            const status = iDone && theyDone ? s("buddyBoth") : iDone ? s("buddyWaiting").replace("{name}", nameOf(other)) : "";
            return (
              <li key={h.id} className={`rounded-lg px-3 py-3 ${iDone && theyDone ? "bg-[var(--accent-soft)]" : "bg-[var(--hover)]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold">{h.title}</div>
                    <div className="text-[12px] text-[var(--ink-soft)]">{s("buddyWith").replace("{name}", nameOf(other))}</div>
                  </div>
                  <div className="shrink-0 rounded-full bg-[var(--panel)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent-deep)]" aria-label={s("buddyStreak").replace("{n}", String(streak))}>🔥 {streak}</div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button onClick={() => toggle(h.id, iDone)} disabled={busy} aria-pressed={iDone}
                    className={`${btn} ${iDone ? "border border-[var(--accent)] text-[var(--accent-deep)]" : "bg-[var(--accent)] text-[var(--accent-ink)]"}`}>
                    {iDone ? `✓ ${s("buddyChecked")}` : s("buddyDone")}
                  </button>
                  <span className={`text-[12.5px] ${theyDone && !iDone ? "font-semibold text-[var(--accent-deep)]" : "text-[var(--ink-soft)]"}`}>
                    {status || (theyDone ? `✓ ${nameOf(other)}` : "")}
                  </span>
                  <button onClick={() => end(h.id)} className={`ml-auto text-[11.5px] ${confirmId === h.id ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-faint)] hover:text-[var(--danger)]"}`}>
                    {confirmId === h.id ? s("buddyConfirm") : s("buddyLeave")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
