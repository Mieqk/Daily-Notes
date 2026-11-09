import type { Lang } from "../i18n";
import { api, isPlayable, useMusic } from "../lib/musicStore";
import { makeSearch } from "../music-search-strings";

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const Icon = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden><path d={d} /></svg>
);
export const PLAY = "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z";
export const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";
export const PREV = "M6 5h2v14H6zM9.5 12l9 6.5v-13z";
export const NEXT = "M16 5h2v14h-2zM14.5 12l-9 6.5v-13z";
export const REPEAT = "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z";
const SPEAKER = "M4 9v6h4l5 4V5L8 9H4z";
const WAVES = "M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12";
const CROSS = "M16 9l5 6M21 9l-5 6";

const fill = (v: number, max: number) => ({ ["--p" as string]: `${max > 0 ? Math.min(100, (v / max) * 100) : 0}%` });

/** Полоса перемотки с временем. active: играет ли именно этот трек (иначе показываем 0:00). */
export function SeekBar({ lang, active = true }: { lang: Lang; active?: boolean }) {
  const s = makeSearch(lang);
  const m = useMusic();
  const time = active ? m.time : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 text-right text-[11px] tabular-nums text-[var(--ink-faint)]">{fmtTime(time)}</span>
      <input
        type="range" min={0} max={m.dur} step={0.1} value={Math.min(time, m.dur)} disabled={!active}
        onChange={(e) => api.seek(Number(e.target.value))} aria-label={s("preview")}
        className="dn-range min-w-0 flex-1" style={fill(time, m.dur)}
      />
      <span className="w-9 text-[11px] tabular-nums text-[var(--ink-faint)]">{fmtTime(m.dur)}</span>
    </div>
  );
}

/** Громкость: значок с отключением звука и ползунок. На устройствах, где громкость из кода не меняется (iPhone), не показывается. */
export function VolumeControl({ lang, className = "" }: { lang: Lang; className?: string }) {
  const s = makeSearch(lang);
  const m = useMusic();
  if (!m.volumeSupported) return null;
  const v = m.muted ? 0 : m.volume;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button onClick={api.toggleMute} aria-pressed={m.muted} aria-label={s("mute")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] active:scale-90">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path d={SPEAKER} fill="currentColor" />
          {v === 0 ? <path d={CROSS} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d={WAVES} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={v < 0.5 ? 0.5 : 1} />}
        </svg>
      </button>
      <input
        type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => api.setVolume(Number(e.target.value))}
        aria-label={s("volume")} className="dn-range min-w-0 flex-1" style={fill(v, 1)}
      />
    </div>
  );
}

/** Повтор, назад, пауза, вперёд. */
export function Transport({ lang, big = false, active = true, onToggle }: { lang: Lang; big?: boolean; active?: boolean; onToggle?: () => void }) {
  const s = makeSearch(lang);
  const m = useMusic();
  const many = m.queue.filter(isPlayable).length > 1;
  const playing = active && m.playing;
  const btn = "grid place-items-center rounded-full text-[var(--ink)] transition-transform active:scale-90 disabled:opacity-40";
  const main = big ? 72 : 60;
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <button onClick={api.toggleRepeat} aria-pressed={m.repeat} aria-label={s("repeat")} className={`${btn} h-10 w-10 ${m.repeat ? "bg-[var(--accent-soft)] !text-[var(--accent-deep)]" : "text-[var(--ink-faint)]"}`}><Icon d={REPEAT} size={20} /></button>
      <button onClick={api.prev} disabled={!m.queue.length} aria-label={s("prev")} className={`${btn} h-12 w-12`}><Icon d={PREV} size={26} /></button>
      <button onClick={onToggle ?? api.toggle} aria-label={playing ? s("pause") : s("play")} className={`${btn} bg-[var(--accent)] !text-[var(--accent-ink)]`} style={{ width: main, height: main, boxShadow: "0 8px 22px -6px var(--accent)" }}><Icon d={playing ? PAUSE : PLAY} size={big ? 34 : 30} /></button>
      <button onClick={api.next} disabled={!many} aria-label={s("next")} className={`${btn} h-12 w-12`}><Icon d={NEXT} size={26} /></button>
      <span className="h-10 w-10" aria-hidden />
    </div>
  );
}
