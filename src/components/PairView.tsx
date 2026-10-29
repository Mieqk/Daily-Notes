import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import { PRESENCE_COLOR, type PresenceState } from "../lib/presence";
import { fmtMin, nightSpan, sleepState, syncedNights, toMin, typicalSleep, weekSummary, type NightLike } from "../lib/pairSleep";
import type { SleepData } from "../store";
import { fromISO, shiftISO, todayISO } from "../store";
import { makePair } from "../pair-strings";
import { makeSocial } from "../social-strings";
import { pairStreak } from "./BuddyHabits";
import FriendsSection from "./FriendsSection";
import PresenceDot from "./PresenceDot";
import SleepParty from "./SleepParty";

interface Party { id: string; owner: string; buddy: string }
interface Night extends NightLike { party_id: string; user_id: string }
interface Person {
  id: string; display_name: string | null; friend_code: string | null;
  avatar: string | null; avatar_url: string | null;
  presence_state?: PresenceState | null;
}

const HERO_KEY = "dn.pairHero";
const readHero = () => { try { return localStorage.getItem(HERO_KEY); } catch { return null; } };

const nameOf = (p?: Person) => p?.display_name || p?.friend_code || "—";

function Avatar({ p, size }: { p?: Person; size: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="block h-full w-full overflow-hidden rounded-xl">
        {p?.avatar_url
          ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          : <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)]" style={{ fontSize: size * 0.5 }}>{p?.avatar || "🙂"}</span>}
      </span>
    </span>
  );
}

/** Вкладка «Пара»: сон любимого человека и друзей из Sleep Party рядом с вашим. */
export default function PairView({ userId, lang, sleep }: { userId: string; lang: Lang; sleep: Record<string, SleepData> }) {
  const pr = makePair(lang);
  const s = makeSocial(lang);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [nights, setNights] = useState<Night[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [heroId, setHeroId] = useState<string | null>(readHero);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!supabase) { setParties([]); return; }
    const { data, error } = await supabase.from("sleep_parties").select("*").order("created_at", { ascending: true });
    if (error) { setParties([]); return; }
    const list = (data ?? []) as Party[];
    setParties(list);
    if (list.length === 0) { setNights([]); return; }
    const { data: n } = await supabase.from("sleep_party_nights").select("party_id,user_id,day,hours,quality,bedtime,waketime")
      .in("party_id", list.map((p) => p.id)).gte("day", shiftISO(todayISO(), -30));
    setNights((n ?? []) as Night[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  // друзья нужны и для списка «с кем начать», и для имён и статуса в сети
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const loadPeople = useCallback(async () => {
    if (!supabase) return;
    const { data: rows } = await supabase.from("friendships").select("user_a,user_b,status").or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const ids = ((rows ?? []) as { user_a: string; user_b: string; status: string }[])
      .filter((r) => r.status === "accepted").map((r) => (r.user_a === userId ? r.user_b : r.user_a));
    setFriendIds(ids);
    setPeople(await fetchProfiles<Person>(ids));
  }, [userId]);
  useEffect(() => { loadPeople(); }, [loadPeople]);

  // раз в минуту обновляем часы и статус «в сети»
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setNowMs(Date.now());
      loadPeople();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadPeople]);

  const friendOpts = useMemo(() => people.filter((p) => friendIds.includes(p.id)).map((p) => ({ id: p.id, name: nameOf(p) })), [people, friendIds]);
  const person = (id: string) => people.find((p) => p.id === id);

  const pairs = (parties ?? []).map((p) => ({ party: p, otherId: p.owner === userId ? p.buddy : p.owner }));
  const hero = pairs.find((x) => x.otherId === heroId) ?? pairs[0];
  const pickHero = (id: string) => { setHeroId(id); try { localStorage.setItem(HERO_KEY, id); } catch { /* ignore */ } };

  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => shiftISO(today, i - 6));
  const card = "rounded-xl bg-[var(--hover)]";

  const body = (() => {
    if (!parties) return null;
    if (!hero) {
      return (
        <FriendsSection icon="🌙" title={pr("emptyTitle")}>
          <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">{friendOpts.length === 0 ? pr("needFriend") : pr("emptyBody")}</p>
        </FriendsSection>
      );
    }
    const other = person(hero.otherId);
    const name = nameOf(other);
    const my = nights.filter((n) => n.party_id === hero.party.id && n.user_id === userId);
    const their = nights.filter((n) => n.party_id === hero.party.id && n.user_id === hero.otherId);
    const myDays = new Set(my.map((n) => n.day)), theirDays = new Set(their.map((n) => n.day));
    const streak = pairStreak(myDays, theirDays, today);
    const common = [...myDays].filter((d) => theirDays.has(d)).sort().pop();
    const a = my.find((n) => n.day === common), b = their.find((n) => n.day === common);
    const lastTheirs = [...their].sort((x, y) => y.day.localeCompare(x.day))[0];

    // статус «спит / проснулся»
    const now = new Date(nowMs);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const wokeToday = their.find((n) => n.day === today)?.waketime ?? null;
    const st = sleepState({ nowMin, typical: typicalSleep(their.filter((n) => n.day >= shiftISO(today, -14))), online: other?.presence_state === "online", wokeToday });
    const stText = st === "asleep" ? pr("stAsleep") : st === "awake" ? pr("stAwake") : st === "up" ? pr("stUp").replace("{t}", wokeToday ?? "") : pr("stUnknown");
    const stIcon = st === "asleep" ? "😴" : st === "awake" ? "👀" : st === "up" ? "☀️" : "🌙";

    // сравнение последней общей ночи
    let verdict = "";
    let synced = false;
    if (a && b) {
      const diff = Math.round((a.hours - b.hours) * 10) / 10;
      verdict = diff === 0 ? pr("verdictEqual") : diff > 0 ? pr("verdictYou").replace("{h}", String(diff)) : pr("verdictThem").replace("{name}", name).replace("{h}", String(-diff));
      const x = toMin(a.bedtime), y = toMin(b.bedtime);
      synced = x !== null && y !== null && Math.min(Math.abs(x - y), 1440 - Math.abs(x - y)) <= 30;
    }

    const wk = { me: weekSummary(my, days), them: weekSummary(their, days) };
    const sy = syncedNights(my, their, days);
    const hoursOn = (list: Night[], d: string) => list.find((n) => n.day === d)?.hours ?? 0;
    const maxH = Math.max(8, ...days.map((d) => Math.max(hoursOn(my, d), hoursOn(their, d))));
    const wd = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short" });

    const nightLine = (n?: Night) => n ? `${n.hours} ${pr("h")}${n.quality ? ` · ${"★".repeat(n.quality)}` : ""}` : pr("nothing");
    const bars: { label: string; n?: Night; color: string; op: number }[] = [
      { label: s("spYou"), n: a ?? my.find((x) => x.day === (common ?? "")), color: "var(--accent)", op: 1 },
      { label: name, n: b ?? lastTheirs, color: "var(--ink-soft)", op: 0.75 },
    ];
    const dot = (color: string, op: number) => <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color, opacity: op }} />;
    const avgRow = (label: string, x: string, y: string) => (
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-2 py-1.5 text-[13px]">
        <span className="text-[12px] text-[var(--ink-soft)]">{label}</span>
        <span className="font-semibold tabular-nums">{x}</span>
        <span className="font-semibold tabular-nums">{y}</span>
      </div>
    );

    return (
      <>
        <FriendsSection icon="🌙" title={name} hint={a && b ? `${verdict}${synced ? ` · ${pr("synced")}` : ""}` : b || a ? pr("waiting").replace("{name}", name) : undefined}
          action={<div className="rounded-full bg-[var(--hover)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent-deep)]" aria-label={`${pr("streak")}: ${streak}`}>🔥 {streak}</div>}>
          {/* статус */}
          <div className={`flex items-center gap-3 px-3 py-3 ${card}`}>
            <span className="relative shrink-0"><Avatar p={other} size={48} /><PresenceDot state={other?.presence_state} label={other?.presence_state ?? undefined} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[14px] font-bold"><span aria-hidden>{stIcon}</span><span>{stText}</span></div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ink-faint)]">{pr("stHint")}</p>
            </div>
            {other?.presence_state && other.presence_state !== "offline" && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRESENCE_COLOR[other.presence_state] }} aria-hidden />}
          </div>

          {/* последняя общая ночь на шкале времени */}
          <h4 className="mb-1.5 mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{pr("night")}{common ? ` · ${new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "short" }).format(fromISO(common))}` : ""}</h4>
          <div className={`px-3 py-3 ${card}`} role="img" aria-label={pr("axis")}>
            {bars.map((r) => {
              const span = nightSpan(r.n?.bedtime, r.n?.waketime);
              return (
                <div key={r.label} className="mb-2.5 last:mb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[13px]">
                    <span className="flex min-w-0 max-w-full items-center gap-1.5 font-semibold">{dot(r.color, r.op)}<span className="truncate">{r.label}</span></span>
                    <span className="shrink-0 tabular-nums text-[var(--ink-soft)]">{nightLine(r.n)}{r.n?.bedtime && r.n?.waketime ? ` · ${r.n.bedtime}–${r.n.waketime}` : ""}</span>
                  </div>
                  <div className="relative mt-1.5 h-2.5 rounded-full bg-[var(--panel)]">
                    {span && <span className="absolute inset-y-0 rounded-full" style={{ left: `${span.left * 100}%`, width: `${span.width * 100}%`, background: r.color, opacity: r.op }} />}
                  </div>
                </div>
              );
            })}
            <div className="mt-1 flex justify-between text-[10.5px] tabular-nums text-[var(--ink-faint)]" aria-hidden>
              {["18", "22", "02", "06", "10", "14"].map((h) => <span key={h}>{h}:00</span>)}
            </div>
            {!a && b && <p className="mt-2 text-[12px] text-[var(--ink-faint)]">{pr("waitingYou")}</p>}
          </div>

          {/* неделя вдвоём */}
          <h4 className="mb-1 mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{pr("week")}</h4>
          <div className={`px-3 py-2 ${card}`}>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-[var(--line)] pb-1.5 text-[11.5px] font-bold">
              <span />
              <span className="flex min-w-0 items-center gap-1.5">{dot("var(--accent)", 1)}<span className="truncate">{s("spYou")}</span></span>
              <span className="flex min-w-0 items-center gap-1.5">{dot("var(--ink-soft)", 0.75)}<span className="truncate">{name}</span></span>
            </div>
            {avgRow(pr("avgSleep"), wk.me.avgHours === null ? "—" : `${wk.me.avgHours} ${pr("h")}`, wk.them.avgHours === null ? "—" : `${wk.them.avgHours} ${pr("h")}`)}
            {avgRow(pr("usualBed"), wk.me.avgBed === null ? "—" : fmtMin(wk.me.avgBed), wk.them.avgBed === null ? "—" : fmtMin(wk.them.avgBed))}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-[var(--line)] pt-1.5 text-[12.5px]">
              <span className="text-[var(--ink-soft)]">{pr("together")}</span>
              <span className="font-semibold tabular-nums">{pr("ofNights").replace("{n}", String(sy.synced)).replace("{m}", String(sy.both))}</span>
            </div>
          </div>

          {/* 7 дней */}
          <div className="mt-3" role="img" aria-label={pr("chart")}>
            <div className="flex h-16 items-end gap-1.5">
              {days.map((d) => (
                <div key={d} className="flex h-full flex-1 items-end justify-center gap-0.5">
                  <span className="w-1/2 rounded-sm bg-[var(--accent)]" style={{ height: `${(hoursOn(my, d) / maxH) * 100}%`, opacity: hoursOn(my, d) ? 1 : 0.15, minHeight: 2 }} />
                  <span className="w-1/2 rounded-sm bg-[var(--ink-soft)]" style={{ height: `${(hoursOn(their, d) / maxH) * 100}%`, opacity: hoursOn(their, d) ? 0.75 : 0.15, minHeight: 2 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1.5 text-center text-[10.5px] text-[var(--ink-faint)]" aria-hidden>
              {days.map((d) => <span key={d} className="flex-1 truncate">{wd.format(fromISO(d))}</span>)}
            </div>
          </div>
        </FriendsSection>
      </>
    );
  })();

  return (
    <div className="mx-auto w-full max-w-2xl">
      {pairs.length > 1 && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
          {pairs.map(({ otherId }) => {
            const p = person(otherId);
            const on = otherId === hero?.otherId;
            return (
              <button key={otherId} role="tab" aria-selected={on} onClick={() => pickHero(otherId)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[13px] font-semibold transition-all active:scale-95 ${on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)]"}`}>
                <Avatar p={p} size={30} />
                <span className="max-w-[8rem] truncate">{nameOf(p)}</span>
              </button>
            );
          })}
        </div>
      )}
      {body}
      <SleepParty userId={userId} lang={lang} friends={friendOpts} sleep={sleep} onChanged={load} />
    </div>
  );
}
