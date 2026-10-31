import { useState } from "react";
import type { Lang } from "../i18n";
import { PRESENCE_COLOR, type PresenceState } from "../lib/presence";
import { makeHub } from "../pair-hub-strings";
import type { SleepData } from "../store";
import { useStored } from "../store";
import BuddyHabits from "./BuddyHabits";
import Challenges from "./Challenges";
import { EmptyState } from "./FriendsSection";
import PairTogether from "./PairTogether";
import PairView from "./PairView";
import SharedEntries from "./SharedEntries";
import SharedMemories from "./SharedMemories";

export interface PairFriend {
  id: string; name: string; avatar: string | null; avatarUrl: string | null;
  presence: string | null; presenceState: PresenceState | null;
}

type Tab = "today" | "sleep" | "plans" | "memories";
const TABS: { id: Tab; icon: string }[] = [
  { id: "today", icon: "☀️" }, { id: "sleep", icon: "🌙" }, { id: "plans", icon: "🎯" }, { id: "memories", icon: "📖" },
];
const HERO_KEY = "dn.pairHero";
const readHero = () => { try { return localStorage.getItem(HERO_KEY); } catch { return null; } };

function Face({ avatar, url, size, ring }: { avatar: string | null; url: string | null; size: number; ring?: boolean }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-[1.1rem] ${ring ? "ring-[3px] ring-[var(--panel)]" : ""}`} style={{ width: size, height: size, boxShadow: "var(--shadow-sm)" }}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)]" style={{ fontSize: size * 0.5 }}>{avatar || "🙂"}</span>}
    </span>
  );
}

/** Вкладка «Парное»: шапка пары и четыре раздела вместо одной длинной ленты. */
export default function PairHub({ userId, lang, friends, me, sleep, moods, moodEmoji, myName }: {
  userId: string; lang: Lang; friends: PairFriend[]; me: { avatar: string | null; avatarUrl: string | null };
  sleep: Record<string, SleepData>; moods: Record<string, number>; moodEmoji: string[]; myName: string;
}) {
  const h = makeHub(lang);
  const [savedId, setSavedId] = useState<string | null>(readHero);
  const [saved, setTab] = useStored<Tab>("dn.pairTab", "today");
  const tab: Tab = TABS.some((x) => x.id === saved) ? saved : "today";
  const partner = friends.find((f) => f.id === savedId) ?? friends[0];
  const opts = friends.map((f) => ({ id: f.id, name: f.name }));
  const pick = (id: string) => { setSavedId(id); try { localStorage.setItem(HERO_KEY, id); } catch { /* ignore */ } };

  if (!partner) {
    return <div className="mx-auto w-full max-w-2xl"><EmptyState icon="💞">{h("empty")}</EmptyState></div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {friends.length > 1 && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={h("pick")}>
          {friends.map((f) => {
            const on = f.id === partner.id;
            return (
              <button key={f.id} role="tab" aria-selected={on} onClick={() => pick(f.id)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[13px] font-semibold transition-all active:scale-95 ${on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)]"}`}>
                <span className="block h-8 w-8 overflow-hidden rounded-full">
                  {f.avatarUrl ? <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[16px]">{f.avatar || "🙂"}</span>}
                </span>
                <span className="max-w-[8rem] truncate">{f.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* шапка пары: два аватара, сердце между ними, статус в сети */}
      <section className="animate-rise relative mb-4 overflow-hidden rounded-3xl border border-[var(--line)] px-4 pb-5 pt-6 text-center"
        style={{ background: "linear-gradient(160deg, var(--accent-soft) 0%, var(--panel) 75%)", boxShadow: "var(--shadow-sm)" }}>
        <span aria-hidden className="pointer-events-none absolute -left-6 -top-6 text-[88px] opacity-[0.07]">💞</span>
        <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-4 text-[96px] opacity-[0.07]">🌿</span>
        <div className="relative flex items-center justify-center">
          <Face avatar={me.avatar} url={me.avatarUrl} size={68} ring />
          <span aria-hidden className="relative z-10 -mx-2.5 grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-[var(--panel)] text-[17px]" style={{ boxShadow: "var(--shadow-sm)" }}>💗</span>
          <Face avatar={partner.avatar} url={partner.avatarUrl} size={68} ring />
        </div>
        <h2 className="font-display relative mt-3.5 break-words text-[19px] font-semibold leading-tight">{h("with").replace("{name}", partner.name)}</h2>
        <p className="relative mt-1 flex items-center justify-center gap-1.5 text-[12.5px] text-[var(--ink-soft)]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRESENCE_COLOR[partner.presenceState ?? "offline"] }} aria-hidden />
          <span className="truncate">{partner.presence ?? h("offline")}</span>
        </p>
        <span className="sr-only">{myName}</span>
      </section>

      {/* разделы, как в «Хобби» */}
      <div className="sticky -top-6 z-30 mb-4 rounded-xl bg-[var(--bg)] sm:-top-8">
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" style={{ boxShadow: "var(--shadow-sm)" }}>
          {TABS.map(({ id, icon }) => (
            <button key={id} role="tab" aria-label={h(id)} title={h(id)} aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1 text-[12px] font-semibold transition-all sm:gap-1.5 sm:text-[13px] ${tab === id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
              <span aria-hidden className={`text-[14px] leading-none ${tab === id ? "max-[359px]:hidden" : ""}`}>{icon}</span>
              <span className={`truncate ${tab === id ? "" : "max-[359px]:hidden"}`}>{h(id)}</span>
            </button>
          ))}
        </div>
      </div>

      <div key={tab + partner.id} className="animate-rise">
        {tab === "today" && <PairTogether userId={userId} lang={lang} other={partner} section="today" moods={moods} moodEmoji={moodEmoji} />}
        {tab === "sleep" && <PairView userId={userId} lang={lang} sleep={sleep} partnerId={partner.id} />}
        {tab === "plans" && (
          <>
            <PairTogether userId={userId} lang={lang} other={partner} section="plans" moods={moods} moodEmoji={moodEmoji} />
            <BuddyHabits userId={userId} lang={lang} friends={opts} />
            <Challenges userId={userId} lang={lang} friends={opts} myName={myName} />
          </>
        )}
        {tab === "memories" && (
          <>
            <PairTogether userId={userId} lang={lang} other={partner} section="memories" moods={moods} moodEmoji={moodEmoji} />
            <SharedMemories userId={userId} lang={lang} friends={opts} />
            <SharedEntries userId={userId} lang={lang} friends={opts} moodEmoji={moodEmoji} />
          </>
        )}
      </div>
    </div>
  );
}
