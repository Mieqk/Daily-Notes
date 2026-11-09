import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { makeSearch } from "../music-search-strings";
import { Cover, TrackPlayer, claimAudio, releaseAudio } from "./MusicParts";

export interface PlayerTrack { id: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const Icon = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden><path d={d} /></svg>
);
const PLAY = "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z";
const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";
const PREV = "M6 5h2v14H6zM9.5 12l9 6.5v-13z";
const NEXT = "M16 5h2v14h-2zM14.5 12l-9 6.5v-13z";
const REPEAT = "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z";

/** Плеер как на музыкальных площадках: большая обложка, перемотка со временем, предыдущий, пауза и следующий, повтор. Играет 30-секундные превью. */
export default function MusicPlayer({ tracks, curId, nonce, onSelect, lang }: {
  tracks: PlayerTrack[]; curId: string | null; /** меняется при каждом выборе трека пользователем: тогда нужно начать играть */ nonce: number; onSelect: (id: string) => void; lang: Lang;
}) {
  const s = makeSearch(lang);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(30);
  const [repeat, setRepeat] = useState(false);
  const cur = tracks.find((t) => t.id === curId) ?? null;
  const playable = tracks.filter((t) => t.preview);
  const idx = cur ? playable.findIndex((t) => t.id === cur.id) : -1;
  const latest = useRef({ playable, idx, repeat, onSelect });
  latest.current = { playable, idx, repeat, onSelect };

  // один <audio> на весь плеер
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.ontimeupdate = () => setTime(a.currentTime);
    a.onloadedmetadata = () => setDur(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 30);
    a.onended = () => {
      const { playable: pl, idx: i, repeat: rep, onSelect: sel } = latest.current;
      if (rep) { a.currentTime = 0; void a.play().catch(() => {}); return; }
      setPlaying(false); setTime(0);
      if (i >= 0 && i < pl.length - 1) sel(pl[i + 1].id);
    };
    audio.current = a;
    return () => { a.pause(); releaseAudio(a); audio.current = null; };
  }, []);

  // выбор трека пользователем: загрузить и играть (nonce меняется только по клику)
  useEffect(() => {
    const a = audio.current;
    if (!a || !nonce) return;
    const t = tracks.find((x) => x.id === curId);
    if (!t?.preview) { a.pause(); return; }
    if (a.src !== t.preview) { a.src = t.preview; setTime(0); setDur(30); }
    claimAudio(a);
    void a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  // трек удалили: остановить
  useEffect(() => { if (!cur) audio.current?.pause(); }, [cur]);

  const toggle = () => {
    const a = audio.current;
    if (!a || !cur?.preview) return;
    if (!a.src || a.src !== cur.preview) { a.src = cur.preview; }
    if (a.paused) { claimAudio(a); void a.play().catch(() => {}); } else a.pause();
  };
  const go = (d: -1 | 1) => {
    if (!playable.length) return;
    const base = idx >= 0 ? idx : d === 1 ? -1 : playable.length;
    const n = (base + d + playable.length) % playable.length;
    onSelect(playable[n].id);
  };
  const seek = (v: number) => { if (audio.current) { audio.current.currentTime = v; setTime(v); } };

  if (!cur) {
    return <div className="mb-3 rounded-2xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-[13px] text-[var(--ink-faint)]">{s("pickOne")}</div>;
  }
  const btn = "grid place-items-center rounded-full text-[var(--ink)] transition-transform active:scale-90 disabled:opacity-40";
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--line)] p-4" style={{ background: "linear-gradient(135deg, var(--accent-soft), var(--panel-2) 80%)" }}>
      <div className="flex items-center gap-4">
        <Cover src={cur.cover} size={96} className="shadow-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">♪ {s("queue")} {idx >= 0 ? `${idx + 1}/${playable.length}` : ""}</div>
          <div className="truncate text-[17px] font-bold leading-tight">{cur.title}</div>
          {cur.artist && <div className="truncate text-[13.5px] text-[var(--ink-soft)]">{cur.artist}</div>}
        </div>
      </div>

      {cur.preview ? (
        <>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="w-9 text-right text-[11px] tabular-nums text-[var(--ink-faint)]">{fmt(time)}</span>
            <input
              type="range" min={0} max={dur} step={0.1} value={Math.min(time, dur)} onChange={(e) => seek(Number(e.target.value))}
              aria-label={s("preview")} className="h-6 min-w-0 flex-1 cursor-pointer" style={{ accentColor: "var(--accent)" }}
            />
            <span className="w-9 text-[11px] tabular-nums text-[var(--ink-faint)]">{fmt(dur)}</span>
          </div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <button onClick={() => setRepeat((v) => !v)} aria-pressed={repeat} aria-label={s("repeat")} className={`${btn} h-10 w-10 ${repeat ? "bg-[var(--accent)] !text-[var(--accent-ink)]" : "text-[var(--ink-faint)]"}`}><Icon d={REPEAT} size={20} /></button>
            <button onClick={() => go(-1)} disabled={playable.length < 2} aria-label={s("prev")} className={`${btn} h-11 w-11`}><Icon d={PREV} /></button>
            <button onClick={toggle} aria-label={playing ? s("pause") : s("play")} className={`${btn} h-14 w-14 bg-[var(--accent)] !text-[var(--accent-ink)] shadow-md`}><Icon d={playing ? PAUSE : PLAY} size={28} /></button>
            <button onClick={() => go(1)} disabled={playable.length < 2} aria-label={s("next")} className={`${btn} h-11 w-11`}><Icon d={NEXT} /></button>
            <span className="h-10 w-10" aria-hidden />
          </div>
          <p className="mt-1 text-center text-[11px] text-[var(--ink-faint)]">{s("preview")}</p>
          {cur.url && <div className="mt-1 text-center"><a href={cur.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[var(--accent-deep)] hover:underline">{s("full")} ›</a></div>}
        </>
      ) : (
        <div className="mt-3">
          <p className="mb-2 text-[12px] text-[var(--ink-faint)]">{s("noPreview")}</p>
          <TrackPlayer url={cur.url} lang={lang} />
        </div>
      )}
    </div>
  );
}
