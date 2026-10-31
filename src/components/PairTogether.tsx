import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { MOODS, localeOf } from "../i18n";
import { MoodVisual } from "../icons";
import { supabase } from "../lib/supabase";
import { sendPushEvent } from "../lib/push";
import { countdown, goalProgress, localInputToISO, moodAverage, moodByDay, monthExtras, monthRange, monthSummary, pairKey, suggestedTouch, type Mark, type MoodRow, type TouchKind } from "../lib/pairTogether";
import { makeTogether } from "../pair-together-strings";
import { fromISO, shiftISO, todayISO } from "../store";
import type { FriendOpt } from "./SharedMemories";
import FriendsSection, { EmptyState } from "./FriendsSection";
import PairPlant from "./PairPlant";

interface Goal { id: string; title: string; target: number; created_by: string }
interface PairEvent { id: string; title: string; emoji: string; starts_at: string }
interface Touch { sender: string; kind: TouchKind }

const HERO_KEY = "dn.pairHero";
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } };

const field = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]";
const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";
const TOUCHES: { kind: TouchKind; icon: string }[] = [
  { kind: "goodmorning", icon: "☀️" }, { kind: "goodnight", icon: "🌙" }, { kind: "thinking", icon: "💗" },
];
const EMOJIS = ["💞", "✈️", "🎂", "🏠", "🎉"];

/** «Вдвоём»: тёплые слова, настроение, общие цели и обратный отсчёт. Видно только двоим из пары. */
export default function PairTogether({ userId, lang, friends, moods, moodEmoji }: {
  userId: string; lang: Lang; friends: FriendOpt[]; moods: Record<string, number>; moodEmoji: string[];
}) {
  const t = makeTogether(lang);
  const [otherId, setOtherId] = useState<string | null>(() => read(HERO_KEY));
  const other = friends.find((f) => f.id === otherId) ?? friends[0];
  const [linkId, setLinkId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // у каждой пары одна строка pair_links: находим или создаём
  useEffect(() => {
    setLinkId(null); setFailed(false);
    if (!supabase || !other) return;
    let off = false;
    const key = pairKey(userId, other.id);
    (async () => {
      const find = () => supabase!.from("pair_links").select("id").eq("user_a", key.user_a).eq("user_b", key.user_b).maybeSingle();
      let { data, error } = await find();
      if (!error && !data) {
        const ins = await supabase!.from("pair_links").insert(key).select("id").single();
        if (ins.error) ({ data, error } = await find()); else data = ins.data;
      }
      if (off) return;
      if (error || !data) setFailed(true); else setLinkId(data.id as string);
    })();
    return () => { off = true; };
  }, [userId, other?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (friends.length === 0 || !other) {
    return <FriendsSection icon="💞" title={t("title")} hint={t("hint")}><EmptyState icon="💞">{t("noFriend")}</EmptyState></FriendsSection>;
  }

  const pick = (id: string) => { setOtherId(id); write(HERO_KEY, id); };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <FriendsSection icon="💞" title={t("title")} hint={t("hint")}>
        {friends.length > 1 && (
          <label className="block text-[12px] font-semibold text-[var(--ink-soft)]">{t("pick")}
            <select value={other.id} onChange={(e) => pick(e.target.value)} className={`${field} mt-1 h-10`}>
              {friends.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        )}
        {failed && <p className="mt-3 rounded-lg bg-[var(--hover)] px-3 py-2.5 text-[12.5px] leading-snug text-[var(--ink-soft)]">{t("setup")}</p>}
        {!failed && !linkId && <p className="mt-3 text-[12.5px] text-[var(--ink-faint)]" aria-live="polite">…</p>}
      </FriendsSection>
      {linkId && (
        <>
          <Touches linkId={linkId} userId={userId} lang={lang} otherId={other.id} name={other.name} />
          <MoodShare linkId={linkId} userId={userId} lang={lang} otherId={other.id} name={other.name} moods={moods} moodEmoji={moodEmoji} />
          <PairPlant linkId={linkId} userId={userId} lang={lang} name={other.name} />
          <Goals linkId={linkId} userId={userId} lang={lang} name={other.name} />
          <Events linkId={linkId} userId={userId} lang={lang} />
          <MonthRecap linkId={linkId} userId={userId} lang={lang} otherId={other.id} name={other.name} moodEmoji={moodEmoji} />
        </>
      )}
    </div>
  );
}

interface SectionProps { linkId: string; userId: string; lang: Lang }
interface WithOther extends SectionProps { otherId: string; name: string }

/** Доброе утро / Спокойной ночи / Думаю о тебе: раз в день каждого вида. */
function Touches({ linkId, userId, lang, otherId, name }: WithOther) {
  const t = makeTogether(lang);
  const [rows, setRows] = useState<Touch[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const day = todayISO();
  const first = suggestedTouch(new Date().getHours());

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("pair_touches").select("sender,kind").eq("link_id", linkId).eq("day", todayISO());
    setRows((data ?? []) as Touch[]);
  }, [linkId]);
  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const send = async (kind: TouchKind) => {
    if (!supabase || busy) return;
    setBusy(true); setErr(false);
    // повторное касание в тот же день игнорируется и строку не возвращает, поэтому пуш уходит один раз
    const { data: added, error } = await supabase.from("pair_touches").upsert({ link_id: linkId, sender: userId, kind, day }, { onConflict: "link_id,sender,kind,day", ignoreDuplicates: true }).select("id");
    setBusy(false);
    if (error) { setErr(true); return; }
    const id = (added as { id?: string }[] | null)?.[0]?.id;
    if (id) sendPushEvent("touch", id);
    load();
  };

  const got = TOUCHES.filter((x) => rows.some((r) => r.sender === otherId && r.kind === x.kind));
  const gotKey = { goodmorning: "gotGoodmorning", goodnight: "gotGoodnight", thinking: "gotThinking" } as const;

  return (
    <FriendsSection icon="💌" title={t("tTitle")} hint={t("tHint").replace("{name}", name)}>
      {got.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1.5">
          {got.map((x) => (
            <li key={x.kind} className="flex items-center gap-2.5 rounded-xl bg-[var(--accent-soft)] px-3 py-2.5 text-[13.5px] font-semibold text-[var(--accent-deep)]">
              <span aria-hidden className="text-[18px]">{x.icon}</span><span className="min-w-0 break-words">{t(gotKey[x.kind]).replace("{name}", name)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mb-3 text-[12.5px] text-[var(--ink-faint)]">{t("tQuiet")}</p>}
      <div className="grid grid-cols-3 gap-2">
        {TOUCHES.map((x) => {
          const sent = rows.some((r) => r.sender === userId && r.kind === x.kind);
          const main = x.kind === first && !sent;
          return (
            <button key={x.kind} onClick={() => send(x.kind)} disabled={sent || busy} aria-label={`${t(x.kind)}${sent ? `: ${t("tSent")}` : ""}`}
              className={`flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition-all active:scale-95 ${main ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--hover)] text-[var(--ink-soft)]"} ${sent ? "opacity-60" : ""}`}>
              <span aria-hidden className="text-[20px] leading-none">{sent ? "✓" : x.icon}</span>
              <span className="w-full break-words text-[11.5px] font-semibold leading-tight">{sent ? t("tSent") : t(x.kind)}</span>
            </button>
          );
        })}
      </div>
      {err && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
    </FriendsSection>
  );
}

/** Настроение за неделю: уходит в базу только после явного включения «делиться». */
function MoodShare({ linkId, userId, lang, otherId, name, moods, moodEmoji }: WithOther & { moods: Record<string, number>; moodEmoji: string[] }) {
  const t = makeTogether(lang);
  const shareKey = `dn.pairMood.${linkId}`;
  const [share, setShare] = useState(() => read(shareKey) === "1");
  const [rows, setRows] = useState<MoodRow[]>([]);
  const [err, setErr] = useState(false);
  const today = todayISO();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftISO(today, i - 6)), [today]);
  const mineKey = days.map((d) => moods[d] ?? "-").join(",");

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("pair_moods").select("user_id,day,mood").eq("link_id", linkId).gte("day", days[0]);
    setRows((data ?? []) as MoodRow[]);
  }, [linkId, days]);

  // пока включено, свежие оценки недели отправляются; исчезнувшие у себя убираем и у пары
  useEffect(() => {
    if (!supabase || !share) { load(); return; }
    const mine = days.filter((d) => moods[d] !== undefined).map((d) => ({ link_id: linkId, user_id: userId, day: d, mood: moods[d], updated_at: new Date().toISOString() }));
    const gone = days.filter((d) => moods[d] === undefined);
    (async () => {
      if (mine.length) await supabase!.from("pair_moods").upsert(mine, { onConflict: "link_id,user_id,day" });
      if (gone.length) await supabase!.from("pair_moods").delete().eq("link_id", linkId).eq("user_id", userId).in("day", gone);
      load();
    })();
  }, [share, mineKey, linkId, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const toggle = async () => {
    if (!supabase) return;
    setErr(false);
    if (share) {
      const { error } = await supabase.from("pair_moods").delete().eq("link_id", linkId).eq("user_id", userId);
      if (error) { setErr(true); return; }
      write(shareKey, null); setShare(false);
    } else {
      write(shareKey, "1"); setShare(true);
    }
  };

  const mine = moodByDay(rows, userId, days);
  const theirs = moodByDay(rows, otherId, days);
  const theirAvg = moodAverage(theirs);
  const wd = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short" });
  const cell = (v: number | null, i: number) => (
    <div key={i} className="flex h-8 items-center justify-center" title={v === null ? undefined : MOODS[lang][v]}>
      {v === null ? <span aria-hidden className="h-1 w-3 rounded-full bg-[var(--line)]" /> : <MoodVisual level={v} emoji={moodEmoji[v]} className="h-5 w-5 text-[17px] text-[var(--accent)]" />}
    </div>
  );
  const grid = "grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] items-center gap-x-0.5";

  return (
    <FriendsSection icon="🫶" title={t("mTitle")} hint={t("mHint")}>
      <label className="flex min-h-[2.75rem] cursor-pointer items-start gap-3 rounded-xl bg-[var(--hover)] px-3 py-2.5">
        <input type="checkbox" checked={share} onChange={toggle} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold">{t("mShare").replace("{name}", name)}</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--ink-faint)]">{t("mShareHint")}</span>
        </span>
      </label>
      {err && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}

      <div className="mt-3" role="group" aria-label={t("mTitle")}>
        <div className={`${grid} mb-1 text-center text-[10.5px] text-[var(--ink-faint)]`} aria-hidden>
          <span />{days.map((d) => <span key={d} className="truncate">{wd.format(fromISO(d))}</span>)}
        </div>
        <div className={grid}>
          <span className="truncate text-[12px] font-semibold text-[var(--ink-soft)]">{t("mYou")}</span>
          {mine.map(cell)}
        </div>
        <div className={grid}>
          <span className="truncate text-[12px] font-semibold text-[var(--ink-soft)]">{name}</span>
          {theirs.map(cell)}
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-[var(--ink-faint)]">
        {theirAvg === null ? t("mOff").replace("{name}", name) : `${name}: ${t("mAvg")} ${MOODS[lang][Math.round(theirAvg)]}`}
        {!share && ` · ${t("mOffMine")}`}
        {share && Object.keys(moods).length === 0 && ` · ${t("mNoOwn")}`}
      </p>
    </FriendsSection>
  );
}

/** Общие цели: общий прогресс, каждый отмечает свой вклад не чаще раза в день. */
function Goals({ linkId, userId, lang, name }: SectionProps & { name: string }) {
  const t = makeTogether(lang);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("5");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const today = todayISO();

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("pair_goals").select("id,title,target,created_by").eq("link_id", linkId).order("created_at", { ascending: true });
    if (error) { setGoals([]); return; }
    const list = (data ?? []) as Goal[];
    setGoals(list);
    if (list.length === 0) { setMarks([]); return; }
    const { data: m } = await supabase.from("pair_goal_marks").select("goal_id,user_id,day").in("goal_id", list.map((g) => g.id));
    setMarks((m ?? []) as Mark[]);
  }, [linkId]);
  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const add = async () => {
    const n = Math.min(100, Math.max(1, Math.round(Number(target) || 1)));
    if (!supabase || !title.trim()) return;
    setBusy(true); setErr(false);
    const { error } = await supabase.from("pair_goals").insert({ link_id: linkId, title: title.trim().slice(0, 80), target: n, created_by: userId });
    setBusy(false);
    if (error) { setErr(true); return; }
    setComposing(false); setTitle(""); setTarget("5");
    load();
  };
  const tick = async (g: Goal, on: boolean) => {
    if (!supabase) return;
    setErr(false);
    const { error } = on
      ? await supabase.from("pair_goal_marks").upsert({ goal_id: g.id, user_id: userId, day: today }, { onConflict: "goal_id,user_id,day", ignoreDuplicates: true })
      : await supabase.from("pair_goal_marks").delete().eq("goal_id", g.id).eq("user_id", userId).eq("day", today);
    if (error) setErr(true);
    load();
  };
  const remove = async (g: Goal) => {
    if (confirmId !== g.id) { setConfirmId(g.id); return; }
    await supabase?.from("pair_goals").delete().eq("id", g.id);
    setConfirmId(null);
    load();
  };

  if (goals === null) return null;
  return (
    <FriendsSection icon="🎯" title={t("gTitle")} count={goals.length} action={
      !composing && <button onClick={() => setComposing(true)} className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] hover:bg-[var(--accent-soft)]">+ {t("gAdd")}</button>
    }>
      {composing && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-[var(--hover)] p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t("gPh")} aria-label={t("gPh")} className={`${field} h-10`} autoFocus />
          <label className="text-[12px] font-semibold text-[var(--ink-soft)]">{t("gTarget")}
            <input type="number" inputMode="numeric" min={1} max={100} value={target} onChange={(e) => setTarget(e.target.value)} className={`${field} mt-1 h-10`} />
          </label>
          <div className="flex gap-2">
            <button onClick={add} disabled={busy || !title.trim()} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{t("gCreate")}</button>
            <button onClick={() => { setComposing(false); setErr(false); }} aria-label="✕" className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--panel)]`}>✕</button>
          </div>
        </div>
      )}
      {err && <p className="mb-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
      {goals.length === 0 ? <EmptyState icon="🎯">{t("gEmpty")}</EmptyState> : (
        <ul className="flex flex-col gap-2.5">
          {goals.map((g) => {
            const p = goalProgress(marks, g.id, g.target, userId, today);
            return (
              <li key={g.id} className="rounded-xl bg-[var(--hover)] px-3 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 break-words text-[14px] font-bold">{g.title}</span>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--ink-soft)]">{t("gProgress").replace("{n}", String(Math.min(p.total, g.target))).replace("{m}", String(g.target))}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--panel)]" role="progressbar" aria-valuemin={0} aria-valuemax={g.target} aria-valuenow={Math.min(p.total, g.target)}>
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${p.ratio * 100}%` }} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-[var(--ink-faint)]">
                  <span>{t("gMine").replace("{n}", String(p.mine))}</span>
                  <span className="min-w-0 truncate">{t("gTheirs").replace("{name}", name).replace("{n}", String(p.theirs))}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {p.done ? <span className="text-[12.5px] font-bold text-[var(--accent-deep)]">{t("gDone")}</span>
                    : p.markedToday ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-[var(--accent-deep)]">✓ {t("gMarked")}</span>
                        <button onClick={() => tick(g, false)} className="h-8 rounded-lg px-2 text-[11.5px] text-[var(--ink-faint)] hover:text-[var(--ink-soft)]">{t("gUndo")}</button>
                      </div>
                    ) : <button onClick={() => tick(g, true)} className={`${btn} h-9 bg-[var(--accent)] text-[var(--accent-ink)]`}>{t("gMark")}</button>}
                  <button onClick={() => remove(g)} className={`h-8 rounded-lg px-2 text-[11.5px] ${confirmId === g.id ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-faint)] hover:text-[var(--danger)]"}`}>{confirmId === g.id ? t("gConfirm") : t("gDelete")}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FriendsSection>
  );
}

/** Обратный отсчёт до встречи, поездки или годовщины. */
function Events({ linkId, userId, lang }: SectionProps) {
  const t = makeTogether(lang);
  const [events, setEvents] = useState<PairEvent[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("pair_events").select("id,title,emoji,starts_at").eq("link_id", linkId).order("starts_at", { ascending: true });
    setEvents(error ? [] : ((data ?? []) as PairEvent[]));
  }, [linkId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) { setNowMs(Date.now()); load(); } }, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const add = async () => {
    const iso = localInputToISO(when);
    if (!supabase || !title.trim() || !iso) return;
    setBusy(true); setErr(false);
    const { error } = await supabase.from("pair_events").insert({ link_id: linkId, title: title.trim().slice(0, 60), emoji, starts_at: iso, created_by: userId });
    setBusy(false);
    if (error) { setErr(true); return; }
    setComposing(false); setTitle(""); setWhen("");
    load();
  };
  const remove = async (e: PairEvent) => {
    if (confirmId !== e.id) { setConfirmId(e.id); return; }
    await supabase?.from("pair_events").delete().eq("id", e.id);
    setConfirmId(null);
    load();
  };

  if (events === null) return null;
  // ближайшие впереди; прошедшие за последний месяц уходят в конец
  const MONTH = 30 * 86_400_000;
  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= nowMs - 3_600_000);
  const past = events.filter((e) => { const ms = Date.parse(e.starts_at); return ms < nowMs - 3_600_000 && ms > nowMs - MONTH; }).reverse();
  const shown = [...upcoming, ...past];
  const fmt = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const unit = (k: "unitD" | "unitH" | "unitM") => <span className="text-[11px] font-semibold text-[var(--ink-faint)]"> {t(k)}</span>;

  return (
    <FriendsSection icon="⏳" title={t("eTitle")} count={upcoming.length} action={
      !composing && <button onClick={() => setComposing(true)} className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] hover:bg-[var(--accent-soft)]">+ {t("eAdd")}</button>
    }>
      {composing && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-[var(--hover)] p-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("eAdd")}>
            {EMOJIS.map((x) => (
              <button key={x} role="radio" aria-checked={emoji === x} onClick={() => setEmoji(x)}
                className={`grid h-10 w-10 place-items-center rounded-lg text-[19px] transition-all active:scale-95 ${emoji === x ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]" : "bg-[var(--panel)]"}`}>{x}</button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={t("ePh")} aria-label={t("ePh")} className={`${field} h-10`} autoFocus />
          <label className="text-[12px] font-semibold text-[var(--ink-soft)]">{t("eWhen")}
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${field} mt-1 h-10`} />
          </label>
          <div className="flex gap-2">
            <button onClick={add} disabled={busy || !title.trim() || !localInputToISO(when)} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{t("eSave")}</button>
            <button onClick={() => { setComposing(false); setErr(false); }} aria-label="✕" className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--panel)]`}>✕</button>
          </div>
        </div>
      )}
      {err && <p className="mb-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
      {shown.length === 0 ? <EmptyState icon="⏳">{t("eEmpty")}</EmptyState> : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((e) => {
            const c = countdown(Date.parse(e.starts_at), nowMs);
            const justNow = c.past && c.days === 0 && c.hours === 0;
            return (
              <li key={e.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${c.past ? "bg-[var(--hover)] opacity-70" : "bg-[var(--accent-soft)]"}`}>
                <span aria-hidden className="text-[24px]">{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="break-words text-[14px] font-bold leading-tight">{e.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--ink-faint)]">{fmt.format(new Date(e.starts_at))}</div>
                  <button onClick={() => remove(e)} className={`mt-1 text-[11.5px] ${confirmId === e.id ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-faint)] hover:text-[var(--danger)]"}`}>{confirmId === e.id ? t("gConfirm") : t("eDelete")}</button>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  {justNow ? <span className="text-[13px] font-bold text-[var(--accent-deep)]">{t("eToday")}</span> : (
                    <>
                      <div className="text-[18px] font-extrabold leading-none text-[var(--accent-deep)]">
                        {c.days > 0 && <>{c.days}{unit("unitD")} </>}{c.hours}{unit("unitH")}
                      </div>
                      {c.days === 0 && <div className="mt-0.5 text-[12px] font-semibold text-[var(--ink-soft)]">{c.minutes}{unit("unitM")}</div>}
                      {c.past && <div className="mt-0.5 text-[11px] text-[var(--ink-faint)]">{t("eAgo")}</div>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FriendsSection>
  );
}


/** Итог месяца пары: тёплые слова, отметки, достигнутые цели и настроение (если поделились оба). */
function MonthRecap({ linkId, userId, lang, otherId, name, moodEmoji }: WithOther & { moodEmoji: string[] }) {
  const t = makeTogether(lang);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ touches: { sender: string; day: string }[]; goals: { id: string; target: number }[]; marks: Mark[]; moods: MoodRow[]; nights: { user_id: string; day: string; hours: number }[]; checkins: { user_id: string; day: string }[] } | null>(null);
  const range = useMemo(() => monthRange(todayISO(), offset), [offset]);

  useEffect(() => {
    if (!supabase) return;
    let off = false;
    setData(null);
    (async () => {
      const [tc, gl, md] = await Promise.all([
        supabase!.from("pair_touches").select("sender,day").eq("link_id", linkId).gte("day", range.start).lt("day", range.end),
        supabase!.from("pair_goals").select("id,target").eq("link_id", linkId),
        supabase!.from("pair_moods").select("user_id,day,mood").eq("link_id", linkId).gte("day", range.start).lt("day", range.end),
      ]);
      const goals = (gl.data ?? []) as { id: string; target: number }[];
      const mk = goals.length ? await supabase!.from("pair_goal_marks").select("goal_id,user_id,day").in("goal_id", goals.map((g) => g.id)) : { data: [] };
      if (off) return;
      // сон и привычки пары: берём только то, чем вы уже делитесь в «Парных» разделах
      const parties = await supabase!.from("sleep_parties").select("id,owner,buddy");
      const party = ((parties.data ?? []) as { id: string; owner: string; buddy: string }[]).find((p) => (p.owner === userId && p.buddy === otherId) || (p.owner === otherId && p.buddy === userId));
      const sl = party ? await supabase!.from("sleep_party_nights").select("user_id,day,hours").eq("party_id", party.id).gte("day", range.start).lt("day", range.end) : { data: [] };
      const hb = await supabase!.from("buddy_habits").select("id,owner,buddy");
      const habitIds = ((hb.data ?? []) as { id: string; owner: string; buddy: string }[]).filter((h) => (h.owner === userId && h.buddy === otherId) || (h.owner === otherId && h.buddy === userId)).map((h) => h.id);
      const ck = habitIds.length ? await supabase!.from("buddy_checkins").select("user_id,day").in("habit_id", habitIds).gte("day", range.start).lt("day", range.end) : { data: [] };
      if (off) return;
      setData({
        touches: (tc.data ?? []) as { sender: string; day: string }[], goals, marks: (mk.data ?? []) as Mark[], moods: (md.data ?? []) as MoodRow[],
        nights: (sl.data ?? []) as { user_id: string; day: string; hours: number }[], checkins: (ck.data ?? []) as { user_id: string; day: string }[],
      });
    })();
    return () => { off = true; };
  }, [linkId, userId, otherId, range.start, range.end]);

  const sum = useMemo(() => data && monthSummary(range, userId, otherId, data.touches, data.goals, data.marks, data.moods), [data, range, userId, otherId]);
  const extra = useMemo(() => data && monthExtras(range, userId, otherId, data.nights, data.checkins), [data, range, userId, otherId]);
  const label = new Intl.DateTimeFormat(localeOf(lang), { month: "long", year: "numeric" }).format(fromISO(range.start));
  const nav = "grid h-9 w-9 place-items-center rounded-lg text-[16px] text-[var(--ink-soft)] hover:bg-[var(--hover)] disabled:opacity-30";
  const hasSleep = !!extra && (extra.sleepMine !== null || extra.sleepTheirs !== null);
  const hasHabits = !!extra && extra.habitsMine + extra.habitsTheirs > 0;
  const empty = !!sum && sum.touchesMine + sum.touchesTheirs + sum.marksMine + sum.marksTheirs + sum.goalsDone === 0 && !hasSleep && !hasHabits;
  const moodLabel = (v: number) => `${moodEmoji[Math.round(v)] ?? ""} ${MOODS[lang][Math.round(v)]}`;

  const row = (title: string, mine: number, theirs: number) => (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-[var(--hover)] px-3 py-2.5">
      <span className="min-w-0 text-[13px] font-semibold">{title}</span>
      <span className="shrink-0 text-right text-[12px] tabular-nums text-[var(--ink-soft)]">
        {t("mYou")}: <b className="text-[var(--ink)]">{mine}</b> · <span className="inline-block max-w-[7rem] truncate align-bottom">{name}</span>: <b className="text-[var(--ink)]">{theirs}</b>
      </span>
    </li>
  );

  return (
    <FriendsSection icon="📅" title={t("sTitle")} hint={t("sHint")} action={
      <div className="flex items-center gap-1">
        <button onClick={() => setOffset(offset - 1)} aria-label={t("sPrev")} className={nav}>‹</button>
        <button onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset >= 0} aria-label={t("sNext")} className={nav}>›</button>
      </div>
    }>
      <div className="mb-3 text-[14px] font-bold capitalize" aria-live="polite">{label}</div>
      {!sum ? <p className="text-[12.5px] text-[var(--ink-faint)]">…</p> : empty ? <EmptyState icon="📅">{t("sEmpty")}</EmptyState> : (
        <>
          <ul className="flex flex-col gap-2">
            {row(t("sTouches"), sum.touchesMine, sum.touchesTheirs)}
            {row(t("sMarks"), sum.marksMine, sum.marksTheirs)}
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[var(--hover)] px-3 py-2.5">
              <span className="text-[13px] font-semibold">{t("sGoals")}</span>
              <b className="text-[14px] tabular-nums">{sum.goalsDone}</b>
            </li>
            {hasHabits && extra && row(t("sHabits"), extra.habitsMine, extra.habitsTheirs)}
            {hasSleep && extra && (
              <li className="flex items-center justify-between gap-3 rounded-xl bg-[var(--hover)] px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{t("sSleep")}</span>
                  {extra.sleepBoth > 0 && <span className="block text-[11px] text-[var(--ink-faint)]">{t("sSleepNights").replace("{n}", String(extra.sleepBoth))}</span>}
                </span>
                <span className="shrink-0 text-right text-[12px] tabular-nums text-[var(--ink-soft)]">
                  {t("mYou")}: <b className="text-[var(--ink)]">{extra.sleepMine ?? "–"}</b> {t("sHoursUnit")} · <span className="inline-block max-w-[7rem] truncate align-bottom">{name}</span>: <b className="text-[var(--ink)]">{extra.sleepTheirs ?? "–"}</b> {t("sHoursUnit")}
                </span>
              </li>
            )}
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[var(--hover)] px-3 py-2.5">
              <span className="min-w-0 text-[13px] font-semibold">{t("sMood")}</span>
              {sum.moodMine !== null && sum.moodTheirs !== null
                ? <span className="shrink-0 text-right text-[12px] text-[var(--ink-soft)]">{t("mYou")}: {moodLabel(sum.moodMine)} · {name}: {moodLabel(sum.moodTheirs)}</span>
                : <span className="max-w-[60%] text-right text-[11.5px] leading-snug text-[var(--ink-faint)]">{t("sMoodOff")}</span>}
            </li>
          </ul>
          <p className="mt-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2.5 text-[13px] font-semibold text-[var(--accent-deep)]">
            {sum.activeDays > 0 ? `${t("sDays").replace("{n}", String(sum.activeDays))} · ${t("sWarm")}` : t("sWarmQuiet")}
          </p>
        </>
      )}
    </FriendsSection>
  );
}
