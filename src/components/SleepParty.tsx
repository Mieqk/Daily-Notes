import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import type { SleepData } from "../store";
import { shiftISO, todayISO } from "../store";
import { makeSocial } from "../social-strings";
import type { FriendOpt } from "./SharedMemories";
import { pairStreak } from "./BuddyHabits";
import FriendsSection, { EmptyState } from "./FriendsSection";
import MediaAttach from "./MediaAttach";
import MediaView from "./MediaView";
import { makeMedia } from "../media-strings";
import { mediaErrorKey, prepareMedia, removeMedia, uploadMedia, useMediaUrls, type MediaType, type PendingMedia } from "../lib/media";

interface Party { id: string; owner: string; buddy: string }
interface Night { party_id: string; user_id: string; day: string; hours: number; quality: number; bedtime: string | null; waketime: string | null; media_path?: string | null; media_type?: MediaType | null }

const toMin = (v?: string | null) => {
  if (!v || !v.includes(":")) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
};
/** Разница времени отбоя с учётом перехода через полночь, в минутах. */
const bedDiff = (a?: string | null, b?: string | null) => {
  const x = toMin(a), y = toMin(b);
  if (x === null || y === null) return null;
  const d = Math.abs(x - y);
  return Math.min(d, 1440 - d);
};

/** Sleep Party: пара друзей делится ночами, серия растёт, когда сон записали оба. */
export default function SleepParty({ userId, lang, friends, sleep }: { userId: string; lang: Lang; friends: FriendOpt[]; sleep: Record<string, SleepData> }) {
  const s = makeSocial(lang);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [nights, setNights] = useState<Night[]>([]);
  const [composing, setComposing] = useState(false);
  const [withId, setWithId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [attach, setAttach] = useState<Record<string, PendingMedia | null>>({});
  const [attachErr, setAttachErr] = useState<string | null>(null);
  const m = makeMedia(lang);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("sleep_parties").select("*").order("created_at", { ascending: false });
    if (error) { setParties([]); return; }
    const list = (data ?? []) as Party[];
    setParties(list);
    if (list.length === 0) { setNights([]); return; }
    const since = shiftISO(todayISO(), -60);
    const { data: n } = await supabase!.from("sleep_party_nights").select("*").in("party_id", list.map((p) => p.id)).gte("day", since);
    setNights((n ?? []) as Night[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const urls = useMediaUrls(nights.map((n) => n.media_path));
  if (parties === null) return null;

  const today = todayISO();
  const mine = sleep[today];
  const hasMine = Boolean(mine && (mine.hours > 0 || mine.bedtime));
  const nameOf = (id: string) => friends.find((f) => f.id === id)?.name || "—";
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";
  const taken = new Set(parties.map((p) => (p.owner === userId ? p.buddy : p.owner)));
  const available = friends.filter((f) => !taken.has(f.id));

  const create = async () => {
    const buddy = withId || available[0]?.id;
    if (!buddy) return;
    setBusy(true); setErr(false);
    const { error } = await supabase!.from("sleep_parties").insert({ owner: userId, buddy });
    setBusy(false);
    if (error) { setErr(true); return; }
    setComposing(false);
    load();
  };

  const share = async (partyId: string, other: string, shared: boolean) => {
    setBusy(true); setErr(false); setAttachErr(null);
    if (shared) {
      const prev = nights.find((n) => n.party_id === partyId && n.user_id === userId && n.day === today);
      await supabase!.from("sleep_party_nights").delete().eq("party_id", partyId).eq("user_id", userId).eq("day", today);
      removeMedia(prev?.media_path);
    } else if (mine) {
      const pend = attach[partyId];
      let path: string | null = null;
      try {
        if (pend) path = await uploadMedia(userId, other, await prepareMedia(pend.file));
      } catch (e) {
        setBusy(false); setAttachErr(m(mediaErrorKey((e as Error).message))); return;
      }
      const { error } = await supabase!.from("sleep_party_nights").upsert({
        party_id: partyId, user_id: userId, day: today,
        hours: mine.hours || 0, quality: mine.quality || 0,
        bedtime: mine.bedtime || null, waketime: mine.waketime || null, updated_at: new Date().toISOString(),
        media_path: path, media_type: path ? pend!.kind : null,
      });
      if (error) { removeMedia(path); setErr(true); }
      else setAttach((a) => ({ ...a, [partyId]: null }));
    }
    setBusy(false);
    load();
  };

  const end = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    await supabase!.from("sleep_parties").delete().eq("id", id);
    setConfirmId(null);
    load();
  };

  return (
    <FriendsSection icon="🌙" title={s("spTitle")} hint={s("spHint")} action={
      available.length > 0 && !composing && (
        <button onClick={() => { setComposing(true); setWithId(available[0].id); }} className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] hover:bg-[var(--accent-soft)]">+ {s("spAdd")}</button>
      )
    }>

      {composing && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-[var(--hover)] p-3">
          <select value={withId} onChange={(e) => setWithId(e.target.value)} aria-label={s("memWith")} className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]">
            {available.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {err && <p className="text-[12.5px] text-[var(--danger)]">{s("error")}</p>}
          <div className="flex gap-2">
            <button onClick={create} disabled={busy} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{s("spStart")}</button>
            <button onClick={() => setComposing(false)} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--panel)]`}>✕</button>
          </div>
        </div>
      )}

      {parties.length === 0 ? (
        <EmptyState icon="🌙">{friends.length === 0 ? s("memNoFriends") : s("spEmpty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {parties.map((p) => {
            const other = p.owner === userId ? p.buddy : p.owner;
            const my = nights.filter((n) => n.party_id === p.id && n.user_id === userId);
            const their = nights.filter((n) => n.party_id === p.id && n.user_id === other);
            const myDays = new Set(my.map((n) => n.day));
            const theirDays = new Set(their.map((n) => n.day));
            const streak = pairStreak(myDays, theirDays, today);
            const iShared = myDays.has(today);
            const common = [...myDays].filter((d) => theirDays.has(d)).sort().pop();
            const a = my.find((n) => n.day === common);
            const b = their.find((n) => n.day === common);
            let verdict = "";
            let synced = false;
            if (a && b) {
              const diff = Math.round((a.hours - b.hours) * 10) / 10;
              verdict = diff === 0 ? s("spEqual")
                : diff > 0 ? s("spLonger").replace("{h}", String(diff))
                : s("spBetter").replace("{name}", nameOf(other)).replace("{h}", String(-diff));
              const bd = bedDiff(a.bedtime, b.bedtime);
              synced = bd !== null && bd <= 30;
            }
            const week = Array.from({ length: 7 }, (_, i) => shiftISO(today, i - 6));
            const hoursOn = (list: Night[], d: string) => list.find((n) => n.day === d)?.hours ?? 0;
            const maxH = Math.max(8, ...week.map((d) => Math.max(hoursOn(my, d), hoursOn(their, d))));
            const row = (label: string, n: Night | undefined) => (
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate font-semibold">{label}</span>
                <span className="shrink-0 tabular-nums text-[var(--ink-soft)]">
                  {n ? `${n.hours} ${s("spHours")}${n.quality ? ` · ${"★".repeat(n.quality)}` : ""}${n.bedtime && n.waketime ? ` · ${n.bedtime}–${n.waketime}` : ""}` : "—"}
                </span>
              </div>
            );
            return (
              <li key={p.id} className="rounded-lg bg-[var(--hover)] px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold">{s("spWith").replace("{name}", nameOf(other))}</div>
                    {a && b ? <div className="text-[12px] text-[var(--ink-soft)]">{verdict}{synced ? ` · ${s("spSynced")}` : ""}</div>
                      : <div className="text-[12px] text-[var(--ink-soft)]">{s("spWaiting").replace("{name}", nameOf(other))}</div>}
                  </div>
                  <div className="shrink-0 rounded-full bg-[var(--panel)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent-deep)]" aria-label={s("spStreak").replace("{n}", String(streak))}>🔥 {streak}</div>
                </div>

                <div className="mt-2.5 flex flex-col gap-1">
                  {row(s("spYou"), a ?? [...my].sort((x, y) => y.day.localeCompare(x.day))[0])}
                  {row(nameOf(other), b ?? [...their].sort((x, y) => y.day.localeCompare(x.day))[0])}
                </div>

                <div className="mt-2.5" aria-label={s("spNights")}>
                  <div className="flex h-10 items-end gap-1.5">
                    {week.map((d) => (
                      <div key={d} className="flex h-full flex-1 items-end justify-center gap-0.5">
                        <span className="w-1/2 rounded-sm bg-[var(--accent)]" style={{ height: `${(hoursOn(my, d) / maxH) * 100}%`, opacity: hoursOn(my, d) ? 1 : 0.15, minHeight: 2 }} />
                        <span className="w-1/2 rounded-sm bg-[var(--ink-faint)]" style={{ height: `${(hoursOn(their, d) / maxH) * 100}%`, opacity: hoursOn(their, d) ? 0.8 : 0.15, minHeight: 2 }} />
                      </div>
                    ))}
                  </div>
                </div>

                {!iShared && hasMine && (
                  <MediaAttach lang={lang} value={attach[p.id] ?? null} onChange={(v) => setAttach((a) => ({ ...a, [p.id]: v }))} onError={setAttachErr} disabled={busy} className="mt-2.5" />
                )}
                {[...my, ...their].filter((n) => n.day === today && n.media_path && n.media_type).map((n) => (
                  <div key={n.user_id} className="mt-2.5">
                    <p className="mb-1 text-[11.5px] font-semibold text-[var(--ink-soft)]">{n.user_id === userId ? s("spYou") : nameOf(n.user_id)}</p>
                    <MediaView url={urls[n.media_path!]} type={n.media_type!} />
                  </div>
                ))}

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {hasMine || iShared ? (
                    <button onClick={() => share(p.id, other, iShared)} disabled={busy} aria-pressed={iShared}
                      className={`${btn} ${iShared ? "border border-[var(--accent)] text-[var(--accent-deep)]" : "bg-[var(--accent)] text-[var(--accent-ink)]"}`}>
                      {iShared ? `✓ ${s("spShared")} · ${s("spUnshare")}` : s("spShare")}
                    </button>
                  ) : (
                    <span className="text-[12.5px] text-[var(--ink-faint)]">{s("spNoSleep")}</span>
                  )}
                  <button onClick={() => end(p.id)} className={`ml-auto text-[11.5px] ${confirmId === p.id ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-faint)] hover:text-[var(--danger)]"}`}>
                    {confirmId === p.id ? s("spConfirm") : s("spEnd")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {err && !composing && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{s("error")}</p>}
      {attachErr && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{attachErr}</p>}
    </FriendsSection>
  );
}
