import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { MusicNoteIcon } from "../icons";
import { MUSIC_ARTIST_MAX, MUSIC_TITLE_MAX, MUSIC_URL_MAX, safeMusicUrl } from "../lib/nowPlaying";
import { coverFromLink, embedOf } from "../lib/musicEmbed";
import { safePreviewUrl } from "../lib/trackSearch";
import { makePlaylist } from "../music-playlist-strings";
import { searchTracks, type FoundTrack } from "../lib/trackSearch";
import { looksRelevant, searchYoutubeTracks, youtubeConfigured } from "../lib/youtubeSearch";
import { makeSearch } from "../music-search-strings";
import { makeNowPlaying } from "../now-playing-strings";
import { adhocTrack, api, useMusic, type PlayerTrack } from "../lib/musicStore";
import { Icon, PAUSE, PLAY } from "./PlayerControls";

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

/** Кнопка плей/пауза для 30-секундного превью с кольцом прогресса. Играет через общий плеер: звук не обрывается при переходе по экранам, внизу появляется мини-плеер. */
export function PreviewButton({ track, lang, size = 40 }: { track: PlayerTrack; lang: Lang; size?: number }) {
  const s = makeSearch(lang);
  const m = useMusic();
  const active = m.curId === track.id;
  const playing = active && m.playing;
  const pct = active && m.dur ? (m.time / m.dur) * 100 : 0;
  const toggle = () => { if (active) api.toggle(); else api.playQueue([track], track.id); };
  return (
    <button
      onClick={toggle} aria-label={playing ? s("pause") : s("play")} aria-pressed={playing} title={s("preview")}
      className="relative grid shrink-0 place-items-center rounded-full text-[var(--accent-ink)] transition-transform active:scale-90"
      style={{ width: size, height: size, background: `conic-gradient(var(--accent-ink) ${pct}%, transparent 0)` }}
    >
      <span className="grid place-items-center rounded-full bg-[var(--accent)]" style={{ width: size - 6, height: size - 6 }}>
        <Icon d={playing ? PAUSE : PLAY} size={16} />
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
  const [yt, setYt] = useState<FoundTrack[] | null>(null);
  const [ytState, setYtState] = useState<"idle" | "loading" | "fail">("idle");
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const country = (typeof navigator !== "undefined" && /^[a-z]{2}-([A-Z]{2})$/.exec(navigator.language)?.[1]) || "US";

  useEffect(() => {
    const text = q.trim();
    setYt(null);
    setYtState("idle");
    if (text.length < 2) { setRes(null); setState("idle"); return; }
    setState("loading");
    const ctl = new AbortController();
    const id = window.setTimeout(() => {
      searchTracks(text, country, ctl.signal).then((r) => { setRes(r); setState("idle"); }, () => { if (!ctl.signal.aborted) { setRes(null); setState("fail"); } });
    }, 400);
    return () => { window.clearTimeout(id); ctl.abort(); };
  }, [q, country]);

  const searchYt = async () => {
    setYtState("loading");
    try { setYt(await searchYoutubeTracks(q)); setYtState("idle"); } catch { setYt(null); setYtState("fail"); }
  };

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

  const renderList = (list: FoundTrack[], prefix: string) => (
    <ul className="mt-2 flex flex-col gap-1">
      {list.map((t, i) => {
        const key = `${prefix}${i}-${t.title}`;
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
  );
  const showYtBtn = youtubeConfigured() && state === "idle" && res !== null && q.trim().length >= 2 && yt === null;
  const noMatch = res !== null && !looksRelevant(q, res);

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
      {res && res.length > 0 && renderList(res, "a")}
      {showYtBtn && (
        <button onClick={() => void searchYt()} disabled={ytState === "loading"} className={`mt-2 h-9 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-95 disabled:opacity-60 ${noMatch ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
          {ytState === "loading" ? s("searching") : s("ytSearch")}
        </button>
      )}
      {ytState === "fail" && <p className="mt-2 text-[12px] font-semibold text-[var(--danger)]" role="status">{s("fail")}</p>}
      {yt && yt.length === 0 && <p className="mt-2 text-[12px] text-[var(--ink-faint)]" role="status">{s("none")}</p>}
      {yt && yt.length > 0 && (<><div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{s("fromYt")}</div>{renderList(yt, "y")}</>)}
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

/** Плеер трека: 30-секундное превью через общий плеер, иначе встроенный плеер сервиса (iframe), иначе ссылка. */
export function TrackPlayer({ url, preview, lang, title = "", artist = null, cover = null }: { url: string | null; preview?: string | null; lang: Lang; title?: string; artist?: string | null; cover?: string | null }) {
  const p = makePlaylist(lang);
  const s = makeSearch(lang);
  const e = embedOf(url);
  const pv = safePreviewUrl(preview);
  if (pv) {
    return (
      <div className="flex items-center gap-3">
        <PreviewButton track={adhocTrack({ title, artist, url, cover, preview: pv })} lang={lang} size={40} />
        <span className="text-[12px] text-[var(--ink-faint)]">{s("preview")}</span>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[12px] font-semibold text-[var(--accent-deep)] hover:underline">{s("full")} ›</a>}
      </div>
    );
  }
  if (!url) return null;
  if (!e) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[var(--accent-deep)] hover:underline">{p("open")} ›</a>;
  return (
    <iframe
      src={e.src} title="player" height={e.height} loading="lazy"
      allow="autoplay; encrypted-media; clipboard-write" referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
      className="w-full rounded-lg border-0 bg-[var(--panel-2)]"
    />
  );
}
