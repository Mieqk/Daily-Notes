import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { MusicNoteIcon } from "../icons";
import { MUSIC_ARTIST_MAX, MUSIC_TITLE_MAX, MUSIC_URL_MAX, safeMusicUrl } from "../lib/nowPlaying";
import { coverFromLink } from "../lib/musicEmbed";
import { searchTracks, type FoundTrack } from "../lib/trackSearch";
import { makeSearch } from "../music-search-strings";
import { makeNowPlaying } from "../now-playing-strings";

/** Обложка трека; без картинки или при ошибке загрузки показывает ноту на мягком фоне. */
export function Cover({ src, size = 48, className = "" }: { src: string | null | undefined; size?: number; className?: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--accent-soft)] text-[var(--accent-deep)] ${className}`} style={{ width: size, height: size }}>
      {src && !bad ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-full w-full object-cover" /> : <MusicNoteIcon className="h-1/2 w-1/2" />}
    </span>
  );
}

let current: HTMLAudioElement | null = null;

/** Кнопка плей/пауза для 30-секундного превью с тонкой полосой прогресса. Одновременно играет только одно превью. */
export function PreviewButton({ src, lang, size = 40 }: { src: string; lang: Lang; size?: number }) {
  const s = makeSearch(lang);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  useEffect(() => () => { audio.current?.pause(); if (current === audio.current) current = null; }, []);
  const toggle = () => {
    let a = audio.current;
    if (!a) {
      a = new Audio(src);
      a.preload = "none";
      a.onended = () => { setPlaying(false); setPct(0); };
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      a.ontimeupdate = () => setPct(a!.duration ? (a!.currentTime / a!.duration) * 100 : 0);
      audio.current = a;
    }
    if (a.paused) {
      if (current && current !== a) current.pause();
      current = a;
      void a.play().catch(() => setPlaying(false));
    } else a.pause();
  };
  return (
    <button
      onClick={toggle} aria-label={playing ? s("pause") : s("play")} aria-pressed={playing} title={s("preview")}
      className="relative grid shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] transition-transform active:scale-90"
      style={{ width: size, height: size, background: `conic-gradient(var(--accent-ink) ${pct}%, transparent 0)` }}
    >
      <span className="grid place-items-center rounded-full bg-[var(--accent)]" style={{ width: size - 6, height: size - 6 }}>
        {playing
          ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>}
      </span>
    </button>
  );
}

/**
 * Добавление трека одним тапом: поиск по названию (обложка и превью приходят сами) или ручной ввод.
 * onPick вызывается с выбранным треком; вернуть true при успехе, тогда строка поиска очищается.
 */
export function TrackSearch({ lang, onPick, actionLabel, autoFocus }: { lang: Lang; onPick: (t: FoundTrack) => Promise<boolean>; actionLabel?: string; autoFocus?: boolean }) {
  const s = makeSearch(lang);
  const np = makeNowPlaying(lang);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<FoundTrack[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "fail">("idle");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const country = (typeof navigator !== "undefined" && /^[a-z]{2}-([A-Z]{2})$/.exec(navigator.language)?.[1]) || "US";

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setRes(null); setState("idle"); return; }
    setState("loading");
    const ctl = new AbortController();
    const id = window.setTimeout(() => {
      searchTracks(text, country, ctl.signal).then((r) => { setRes(r); setState("idle"); }, () => { if (!ctl.signal.aborted) { setRes(null); setState("fail"); } });
    }, 400);
    return () => { window.clearTimeout(id); ctl.abort(); };
  }, [q, country]);

  const pick = async (t: FoundTrack, key: string) => {
    if (busyKey) return;
    setBusyKey(key);
    const ok = await onPick(t);
    setBusyKey(null);
    if (ok) { setDoneKey(key); window.setTimeout(() => setDoneKey((k) => (k === key ? null : k)), 1800); }
  };

  const manualAdd = async () => {
    const t = title.trim();
    if (!t) return;
    const link = safeMusicUrl(url);
    setBusyKey("manual");
    const ok = await onPick({ title: t, artist: artist.trim() || null, url: link, cover: coverFromLink(link), preview: null });
    setBusyKey(null);
    if (ok) { setTitle(""); setArtist(""); setUrl(""); }
  };

  const input = "h-10 w-full min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] outline-none transition-colors focus:border-[var(--accent)]";
  return (
    <div>
      <input
        type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s("search")} autoFocus={autoFocus}
        aria-label={s("search")} maxLength={80} className={input}
      />
      {state === "loading" && <p className="mt-2 text-[12px] text-[var(--ink-faint)]" role="status">{s("searching")}</p>}
      {state === "fail" && <p className="mt-2 text-[12px] font-semibold text-[var(--danger)]" role="status">{s("fail")}</p>}
      {state === "idle" && res && res.length === 0 && <p className="mt-2 text-[12px] text-[var(--ink-faint)]" role="status">{s("none")}</p>}
      {res && res.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {res.map((t, i) => {
            const key = `${i}-${t.title}`;
            return (
              <li key={key}>
                <button
                  onClick={() => pick(t, key)} disabled={busyKey !== null}
                  className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-[var(--hover)] active:scale-[0.99] disabled:opacity-60"
                >
                  <Cover src={t.cover} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{t.title}</span>
                    {t.artist && <span className="block truncate text-[12px] text-[var(--ink-soft)]">{t.artist}</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${doneKey === key ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"}`}>
                    {doneKey === key ? s("added") : actionLabel ?? s("add")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button onClick={() => setManual((v) => !v)} aria-expanded={manual} className="mt-2 text-[12px] font-semibold text-[var(--ink-faint)] underline-offset-2 hover:text-[var(--ink)] hover:underline">
        {manual ? s("manualHide") : s("manual")}
      </button>
      {manual && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={np("trackPh")} maxLength={MUSIC_TITLE_MAX} className={input} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={np("artistPh")} maxLength={MUSIC_ARTIST_MAX} className={input} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={np("urlPh")} maxLength={MUSIC_URL_MAX} inputMode="url" className={input} />
          <button onClick={manualAdd} disabled={busyKey !== null || !title.trim()} className="h-10 rounded-xl bg-[var(--accent)] text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-50">
            {actionLabel ?? s("add")}
          </button>
        </div>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-faint)]">{s("searchNote")}</p>
    </div>
  );
}
