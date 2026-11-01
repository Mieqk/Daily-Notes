import { useState } from "react";
import type { Lang } from "../i18n";
import { makeFh } from "../friends-hub-strings";
import { makeUI } from "../ui-strings";
import { useStored, todayISO } from "../store";
import { HeartIcon, LeafIcon, SunIcon, UsersIcon } from "../icons";
import FriendsSection, { EmptyState } from "./FriendsSection";
import SosPanel from "./SosPanel";
import FriendsAnswers from "./FriendsAnswers";
import GratitudeFeed from "./GratitudeFeed";
import Breathing from "./Breathing";

export interface CareFriend { id: string; name: string; avatar: string | null; avatarUrl: string | null }
type Sec = "say" | "sos" | "feed" | "calm";
const SECS: { id: Sec; icon: (p: { className?: string }) => React.ReactNode; label: "secSay" | "secSos" | "secFeed" | "secCalm" }[] = [
  { id: "say", icon: HeartIcon, label: "secSay" },
  { id: "sos", icon: SunIcon, label: "secSos" },
  { id: "feed", icon: UsersIcon, label: "secFeed" },
  { id: "calm", icon: LeafIcon, label: "secCalm" },
];
const PHRASES = ["p0", "p1", "p2", "p3", "p4", "p5"] as const;
const TIPS = ["tip0", "tip1", "tip2", "tip3", "tip4", "tip5", "tip6"] as const;

/** «Забота и поддержка»: шапка с идеей дня и четыре раздела. */
export default function CareHub({ userId, lang, friends, feedKey, onThank }: {
  userId: string; lang: Lang; friends: CareFriend[]; feedKey: number;
  onThank: (toId: string, text: string) => Promise<boolean>;
}) {
  const f = makeFh(lang);
  const u = makeUI(lang);
  const [saved, setSec] = useStored<Sec>("dn.careSec", "say");
  const sec: Sec = SECS.some((s) => s.id === saved) ? saved : "say";
  const [to, setTo] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = friends.some((x) => x.id === to) ? to : friends[0]?.id ?? null;

  const dayNum = Math.floor(new Date(todayISO()).getTime() / 86_400_000);
  const tip = TIPS[dayNum % TIPS.length];

  const send = async () => {
    const body = text.trim();
    if (!pick || !body || busy) return;
    setBusy(true);
    const ok = await onThank(pick, body);
    setBusy(false);
    if (ok) setText("");
  };

  const ava = (p: CareFriend) => p.avatarUrl
    ? <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
    : <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[20px]">{p.avatar || "🙂"}</span>;

  return (
    <div>
      <section className="animate-rise relative mb-4 overflow-hidden rounded-3xl border border-[var(--line)] p-5" style={{ background: "linear-gradient(160deg, var(--accent-soft) 0%, var(--panel) 75%)", boxShadow: "var(--shadow-sm)" }}>
        <span aria-hidden className="pointer-events-none absolute -right-2 top-1 text-[56px] opacity-20">🫶</span>
        <h2 className="font-display text-[22px] font-bold leading-tight">{f("careTitle")}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-[var(--ink-soft)]">{f("careSub")}</p>
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[var(--panel)]/80 px-3.5 py-3">
          <span aria-hidden className="text-[18px]">💡</span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{f("tipLabel")}</div>
            <p className="mt-0.5 text-[14px] font-medium leading-snug">{f(tip)}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto mb-4 w-full max-w-xl rounded-xl bg-[var(--bg)]">
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist">
          {SECS.map(({ id, icon: Icon, label }) => (
            <button key={id} role="tab" aria-label={f(label)} title={f(label)} aria-selected={sec === id} onClick={() => setSec(id)}
              className={`flex h-9 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold transition-all ${sec === id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className={`truncate ${sec === id ? "" : "max-[419px]:hidden"}`}>{f(label)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        {sec === "say" && (
          <FriendsSection icon="💌" title={f("sayTitle")} hint={f("sayHint")}>
            {friends.length === 0 ? <EmptyState icon="💌">{f("noFriends")}</EmptyState> : (
              <>
                <div className="mb-1.5 text-[11.5px] font-semibold text-[var(--ink-faint)]">{f("pickFriend")}</div>
                <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
                  {friends.map((p) => (
                    <button key={p.id} onClick={() => setTo(p.id)} aria-pressed={pick === p.id} className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 transition-all active:scale-95 ${pick === p.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:bg-[var(--hover)]"}`}>
                      <span className="block h-10 w-10 overflow-hidden rounded-xl">{ava(p)}</span>
                      <span className="w-full truncate text-center text-[11px] font-semibold">{p.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PHRASES.map((k) => (
                    <button key={k} onClick={() => setText(f(k))} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[12.5px] text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-deep)]">{f(k)}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} maxLength={280} placeholder={u("gPlaceholder")} aria-label={u("gPlaceholder")}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 text-sm outline-none focus:border-[var(--accent)]" />
                  <button onClick={send} disabled={busy || !text.trim()} className="h-11 shrink-0 rounded-xl bg-[var(--accent)] px-5 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-50">{u("gSend")}</button>
                </div>
              </>
            )}
          </FriendsSection>
        )}
        {sec === "sos" && <SosPanel userId={userId} lang={lang} />}
        {sec === "feed" && <>
          <FriendsAnswers userId={userId} lang={lang} />
          <GratitudeFeed userId={userId} lang={lang} refreshKey={feedKey} />
        </>}
        {sec === "calm" && (
          <FriendsSection icon="🌿" title={f("calmTitle")} hint={f("calmHint")}>
            <Breathing lang={lang} />
          </FriendsSection>
        )}
      </div>
    </div>
  );
}
