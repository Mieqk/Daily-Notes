import type { Lang } from "../i18n";
import { makeFh } from "../friends-hub-strings";
import { makePresence } from "../presence-strings";
import { PRESENCE_COLOR, PRESENCE_MODES, type PresenceMode } from "../lib/presence";

interface Props {
  lang: Lang;
  name: string;
  avatar: string | null;
  avatarUrl: string | null;
  code: string | null;
  mode: PresenceMode;
  modeBusy: boolean;
  onMode: (m: PresenceMode) => void;
  friends: number;
  online: number;
  requests: number;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: () => void;
}

/** Шапка раздела «Друзья»: я, мой код, быстрые цифры и мой статус в сети. */
export default function FriendsHero(p: Props) {
  const f = makeFh(p.lang);
  const pr = makePresence(p.lang);
  const share = async () => {
    if (!p.code) return;
    const text = f("shareText").replace("{code}", p.code);
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch { /* пользователь закрыл окно */ }
  };
  const stat = (n: number, label: string, hot = false) => (
    <div className={`flex-1 rounded-2xl px-2 py-2 text-center ${hot ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--panel)]/80"}`}>
      <div className="text-[20px] font-bold leading-none tabular-nums">{n}</div>
      <div className={`mt-1 truncate text-[11px] font-semibold ${hot ? "" : "text-[var(--ink-faint)]"}`}>{label}</div>
    </div>
  );
  const colorOf = (m: PresenceMode) => (m === "auto" ? PRESENCE_COLOR.online : m === "away" ? PRESENCE_COLOR.away : m === "dnd" ? PRESENCE_COLOR.dnd : PRESENCE_COLOR.offline);

  return (
    <section className="animate-rise relative mb-4 overflow-hidden rounded-3xl border border-[var(--line)] p-5" style={{ background: "linear-gradient(160deg, var(--accent-soft) 0%, var(--panel) 75%)", boxShadow: "var(--shadow-sm)" }}>
      <span aria-hidden className="pointer-events-none absolute -right-1 top-1 text-[54px] opacity-20">💚</span>
      <div className="flex items-center gap-3.5">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--panel)]" style={{ boxShadow: "var(--shadow-sm)" }}>
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[30px]">{p.avatar || "🙂"}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-[20px] font-bold leading-tight">{p.name}</h2>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <button onClick={p.onCopy} aria-label={p.copyLabel} className="flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-[var(--panel)]/80 px-3.5 active:scale-[0.99]">
          <span className="font-mono text-[15px] font-bold tracking-[0.2em] text-[var(--accent-deep)]">{p.code ?? "…"}</span>
          <span className="text-[11.5px] font-semibold text-[var(--ink-soft)]">{p.copied ? p.copiedLabel : p.copyLabel}</span>
        </button>
        <button onClick={share} className="h-11 shrink-0 rounded-xl bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">{f("share")}</button>
      </div>
      <div className="mt-4 flex gap-2">
        {stat(p.friends, f("statFriends"))}
        {stat(p.online, f("statOnline"))}
        {stat(p.requests, f("statReq"), p.requests > 0)}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={pr("title")}>
        {PRESENCE_MODES.map((m) => {
          const active = p.mode === m;
          return (
            <button key={m} onClick={() => p.onMode(m)} aria-pressed={active} disabled={p.modeBusy}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-all active:scale-95 ${active ? "border-[var(--accent)] bg-[var(--panel)] text-[var(--accent-deep)]" : "border-transparent bg-[var(--panel)]/60 text-[var(--ink-soft)] hover:bg-[var(--panel)]"}`}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: colorOf(m) }} />
              {pr(m)}
            </button>
          );
        })}
      </div>
      {p.mode === "dnd" && <p className="mt-2 text-[12px] leading-snug text-[var(--ink-faint)]">{pr("dndNote")}</p>}
    </section>
  );
}
