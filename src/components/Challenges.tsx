import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { todayISO } from "../store";
import { makeSocial } from "../social-strings";
import type { FriendOpt } from "./SharedMemories";
import FriendsSection, { EmptyState } from "./FriendsSection";

interface Challenge { id: string; owner: string; title: string; goal_days: number; start_date: string }
interface Member { challenge_id: string; user_id: string }
interface Checkin { challenge_id: string; user_id: string; day: string }

const dayNumber = (start: string, today: string) => {
  const [a, b, c] = start.split("-").map(Number);
  const [x, y, z] = today.split("-").map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86400000) + 1;
};

/** Совместные челленджи: общая цель на N дней, у каждого участника свои отметки. */
export default function Challenges({ userId, lang, friends, myName }: { userId: string; lang: Lang; friends: FriendOpt[]; myName: string }) {
  const s = makeSocial(lang);
  const [list, setList] = useState<Challenge[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [checks, setChecks] = useState<Checkin[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState(7);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("challenges").select("*").order("created_at", { ascending: false });
    if (error) { setList([]); return; }
    const cs = (data ?? []) as Challenge[];
    setList(cs);
    if (cs.length === 0) { setMembers([]); setChecks([]); return; }
    const ids = cs.map((c) => c.id);
    const [m, k] = await Promise.all([
      supabase!.from("challenge_members").select("*").in("challenge_id", ids),
      supabase!.from("challenge_checkins").select("*").in("challenge_id", ids),
    ]);
    setMembers((m.data ?? []) as Member[]);
    setChecks((k.data ?? []) as Checkin[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (list === null) return null;

  const today = todayISO();
  const nameOf = (id: string) => (id === userId ? myName : friends.find((f) => f.id === id)?.name || "—");
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";

  const create = async () => {
    if (!title.trim()) return;
    if (invited.size === 0) { setErr(s("chNeedFriend")); return; }
    setBusy(true); setErr(null);
    const { data, error } = await supabase!.from("challenges").insert({ owner: userId, title: title.trim(), goal_days: days, start_date: today }).select().single();
    if (error || !data) { setBusy(false); setErr(s("error")); return; }
    const rows = [userId, ...invited].map((uid) => ({ challenge_id: (data as Challenge).id, user_id: uid }));
    const { error: mErr } = await supabase!.from("challenge_members").insert(rows);
    setBusy(false);
    if (mErr) { await supabase!.from("challenges").delete().eq("id", (data as Challenge).id); setErr(s("error")); return; }
    setComposing(false); setTitle(""); setInvited(new Set());
    load();
  };

  const toggle = async (cid: string, done: boolean) => {
    setBusy(true);
    const q = supabase!.from("challenge_checkins");
    if (done) await q.delete().eq("challenge_id", cid).eq("user_id", userId).eq("day", today);
    else await q.insert({ challenge_id: cid, user_id: userId, day: today });
    setBusy(false);
    load();
  };

  const leaveOrDelete = async (c: Challenge) => {
    if (confirmId !== c.id) { setConfirmId(c.id); return; }
    if (c.owner === userId) await supabase!.from("challenges").delete().eq("id", c.id);
    else await supabase!.from("challenge_members").delete().eq("challenge_id", c.id).eq("user_id", userId);
    setConfirmId(null);
    load();
  };

  return (
    <FriendsSection icon="🏆" title={s("chTitle")} action={
      friends.length > 0 && !composing && (
        <button onClick={() => setComposing(true)} className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] hover:bg-[var(--accent-soft)]">+ {s("chAdd")}</button>
      )
    }>

      {composing && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-[var(--hover)] p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={s("chPh")} aria-label={s("chPh")} className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          <label className="flex items-center gap-3 text-[12px] font-semibold text-[var(--ink-soft)]">
            {s("chDays")}
            <input type="range" min={3} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
            <span className="w-6 text-right tabular-nums text-[var(--ink)]">{days}</span>
          </label>
          <div className="text-[12px] font-semibold text-[var(--ink-soft)]">{s("chInvite")}</div>
          <div className="flex flex-wrap gap-1.5">
            {friends.map((f) => {
              const on = invited.has(f.id);
              return (
                <button key={f.id} aria-pressed={on} onClick={() => setInvited((p) => { const n = new Set(p); if (on) n.delete(f.id); else n.add(f.id); return n; })}
                  className={`h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${on ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--panel)] text-[var(--ink-soft)] hover:text-[var(--accent-deep)]"}`}>
                  {on ? "✓ " : ""}{f.name}
                </button>
              );
            })}
          </div>
          {err && <p className="text-[12.5px] text-[var(--danger)]">{err}</p>}
          <div className="flex gap-2">
            <button onClick={create} disabled={busy || !title.trim()} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{s("chStart")}</button>
            <button onClick={() => { setComposing(false); setErr(null); }} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--panel)]`}>✕</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon="🏆">{s("chEmpty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((c) => {
            const ms = members.filter((m) => m.challenge_id === c.id).map((m) => m.user_id);
            const cs = checks.filter((k) => k.challenge_id === c.id);
            const iDone = cs.some((k) => k.user_id === userId && k.day === today);
            const total = Math.max(1, ms.length) * c.goal_days;
            const pct = Math.min(100, Math.round((cs.length / total) * 100));
            const dayN = dayNumber(c.start_date, today);
            const finished = dayN > c.goal_days;
            return (
              <li key={c.id} className="rounded-lg bg-[var(--hover)] px-3 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[14px] font-bold">{c.title}</div>
                  <div className="shrink-0 text-[12px] text-[var(--ink-soft)]">{finished ? s("chFinished") : s("chDay").replace("{n}", String(Math.max(1, dayN))).replace("{total}", String(c.goal_days))}</div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--panel)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[12px] text-[var(--ink-soft)]">{s("chProgress").replace("{n}", String(pct))}</div>
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label={s("chMembers")}>
                  {ms.map((uid) => {
                    const n = cs.filter((k) => k.user_id === uid).length;
                    const doneToday = cs.some((k) => k.user_id === uid && k.day === today);
                    return (
                      <span key={uid} className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${doneToday ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--panel)] text-[var(--ink-soft)]"}`}>
                        {doneToday ? "✓ " : ""}{nameOf(uid)} · {n}/{c.goal_days}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  {!finished && (
                    <button onClick={() => toggle(c.id, iDone)} disabled={busy} aria-pressed={iDone}
                      className={`${btn} ${iDone ? "border border-[var(--accent)] text-[var(--accent-deep)]" : "bg-[var(--accent)] text-[var(--accent-ink)]"}`}>
                      {iDone ? `✓ ${s("chCheckedToday")}` : s("chToday")}
                    </button>
                  )}
                  <button onClick={() => leaveOrDelete(c)} className={`ml-auto text-[11.5px] ${confirmId === c.id ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-faint)] hover:text-[var(--danger)]"}`}>
                    {confirmId === c.id ? s("chConfirm") : c.owner === userId ? s("chDelete") : s("chLeave")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FriendsSection>
  );
}
