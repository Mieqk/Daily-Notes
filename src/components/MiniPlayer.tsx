import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "../i18n";
import { api, isPlayable, useMusic } from "../lib/musicStore";
import { makeSearch } from "../music-search-strings";
import { Cover } from "./MusicParts";
import { Icon, NEXT, PAUSE, PLAY, PREV, SeekBar, Transport, VolumeControl } from "./PlayerControls";

/** Полноэкранный плеер: размытая обложка на фоне, большая обложка, перемотка, управление, громкость и очередь. */
function FullPlayer({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const s = makeSearch(lang);
  const m = useMusic();
  const cur = m.queue.find((t) => t.id === m.curId) ?? null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { if (!cur) onClose(); }, [cur, onClose]);
  if (!cur) return null;
  return createPortal(
    <div className="fixed inset-0 z-[75] overflow-y-auto overscroll-contain bg-[var(--bg)]" role="dialog" aria-modal="true" aria-label={s("openPlayer")}>
      {cur.cover && <img src={cur.cover} alt="" aria-hidden referrerPolicy="no-referrer" className="pointer-events-none fixed inset-0 h-full w-full scale-150 object-cover opacity-45 blur-3xl" />}
      <div className="pointer-events-none fixed inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--bg) 40%, transparent), var(--bg) 95%)" }} />
      <div className="safe-top safe-bottom relative mx-auto flex min-h-full max-w-md flex-col px-5 pb-6 pt-3">
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label={s("collapse")} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--panel)]/70 text-[var(--ink-soft)] backdrop-blur transition-transform active:scale-90">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">♪ {m.kind === "yt" ? s("fullTrack") : s("preview")}</span>
          <button onClick={() => { api.close(); onClose(); }} aria-label={s("closePlayer")} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--panel)]/70 text-[var(--ink-soft)] backdrop-blur transition-transform active:scale-90">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <Cover src={cur.cover} size={Math.min(300, typeof window === "undefined" ? 300 : window.innerWidth - 56)} className="!rounded-3xl shadow-2xl" />
        </div>
        <div className="mt-6 text-center">
          <div className="text-[22px] font-bold leading-tight">{cur.title}</div>
          {cur.artist && <div className="mt-0.5 text-[15px] text-[var(--ink-soft)]">{cur.artist}</div>}
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <SeekBar lang={lang} />
          <Transport lang={lang} big />
          <VolumeControl lang={lang} className="mx-auto w-full max-w-xs" />
          {cur.url && <div className="text-center"><a href={cur.url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-[var(--accent-deep)] hover:underline">{s("full")} ›</a></div>}
        </div>

        {m.queue.length > 1 && (
          <div className="mt-6">
            <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{s("queue")}</div>
            <ul className="flex flex-col gap-1">
              {m.queue.map((t) => (
                <li key={t.id}>
                  <button onClick={() => api.play(t.id)} disabled={!isPlayable(t)} aria-current={t.id === m.curId}
                    className={`flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors active:scale-[0.99] disabled:opacity-40 ${t.id === m.curId ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--hover)]"}`}>
                    <Cover src={t.cover} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13.5px] font-bold ${t.id === m.curId ? "text-[var(--accent-deep)]" : ""}`}>{t.title}</span>
                      {t.artist && <span className="block truncate text-[12px] text-[var(--ink-soft)]">{t.artist}</span>}
                    </span>
                    {t.id === m.curId && <span aria-hidden className="text-[var(--accent-deep)]">{m.playing ? "♪" : "❚❚"}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Окно YouTube: оно остаётся видно, пока играет полный трек (так требуют правила YouTube). Управляют им наши кнопки. */
function YouTubeWindow({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api.attachYtHost(ref.current);
    return () => api.attachYtHost(null);
  }, []);
  return (
    <div
      ref={ref}
      className={`fixed right-3 z-[80] overflow-hidden rounded-xl border border-[var(--line)] bg-black shadow-2xl ${visible ? "" : "pointer-events-none invisible"}`}
      style={{ width: 176, height: 99, bottom: "calc(76px + env(safe-area-inset-bottom))" }}
    />
  );
}

/** Мини-плеер внизу приложения: виден на любом экране, пока есть трек. По тапу открывается полный плеер. */
export default function MiniPlayer({ lang }: { lang: Lang }) {
  const s = makeSearch(lang);
  const m = useMusic();
  const [full, setFull] = useState(false);
  const cur = m.queue.find((t) => t.id === m.curId) ?? null;
  if (!cur) return null;
  const pct = m.dur ? Math.min(100, (m.time / m.dur) * 100) : 0;
  const many = m.queue.filter(isPlayable).length > 1;
  const btn = "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-40";
  return (
    <>
      <div className="safe-bottom relative z-20 shrink-0 border-t border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur" role="region" aria-label={s("openPlayer")} style={{ boxShadow: "0 -6px 24px -12px rgba(0,0,0,.35)" }}>
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--line)]" aria-hidden><div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} /></div>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:px-8">
          <button onClick={() => setFull(true)} aria-label={s("openPlayer")} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]">
            <Cover src={cur.cover} size={44} />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-bold">{cur.title}</span>
              {cur.artist && <span className="block truncate text-[12px] text-[var(--ink-soft)]">{cur.artist}</span>}
            </span>
          </button>
          <button onClick={api.prev} aria-label={s("prev")} className={`${btn} hidden text-[var(--ink-soft)] sm:grid`}><Icon d={PREV} size={20} /></button>
          <button onClick={api.toggle} aria-label={m.playing ? s("pause") : s("play")} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}><Icon d={m.playing ? PAUSE : PLAY} size={20} /></button>
          <button onClick={api.next} disabled={!many} aria-label={s("next")} className={`${btn} text-[var(--ink-soft)]`}><Icon d={NEXT} size={20} /></button>
          <button onClick={api.close} aria-label={s("closePlayer")} className={`${btn} text-[var(--ink-faint)] hover:text-[var(--ink)]`}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      <YouTubeWindow visible={m.kind === "yt"} />
      {full && <FullPlayer lang={lang} onClose={() => setFull(false)} />}
    </>
  );
}
