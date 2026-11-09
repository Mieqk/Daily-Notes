import { useState } from "react";
import type { Lang } from "../i18n";
import { MusicNoteIcon } from "../icons";
import { cleanMusic, isLive, MUSIC_ARTIST_MAX, MUSIC_TITLE_MAX, MUSIC_URL_MAX, type NowPlaying } from "../lib/nowPlaying";
import { makeNowPlaying } from "../now-playing-strings";

/** Плашка как в Telegram: нота, трек жирным, исполнитель рядом; по тапу открывается ссылка, если она есть. */
export function MusicBar({ music, lang, className = "" }: { music: NowPlaying; lang: Lang; className?: string }) {
  const n = makeNowPlaying(lang);
  const body = (
    <>
      <MusicNoteIcon className="h-4 w-4 shrink-0 text-[var(--accent-deep)]" />
      <span className="min-w-0 truncate">
        <span className="font-bold">{music.title}</span>
        {music.artist && <span className="text-[var(--ink-soft)]"> {music.artist}</span>}
      </span>
    </>
  );
  const cls = `flex min-w-0 items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[13px] ${className}`;
  return (
    <div>
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{isLive(music.at) ? n("live") : n("recent")}</div>
      {music.url ? (
        <a href={music.url} target="_blank" rel="noopener noreferrer" aria-label={`${n("open")}: ${music.title}`} className={`${cls} transition-all active:scale-[0.98]`}>
          {body}<span aria-hidden className="ml-auto shrink-0 text-[var(--ink-faint)]">›</span>
        </a>
      ) : <div className={cls}>{body}</div>}
    </div>
  );
}

/** Редактор своего трека. onSave получает значения колонок music_*; вернуть true при успехе. */
export function MusicEditor({ lang, music, onSave }: {
  lang: Lang; music: NowPlaying | null;
  onSave: (v: { music_title: string | null; music_artist: string | null; music_url: string | null; music_at: string | null }) => Promise<boolean>;
}) {
  const n = makeNowPlaying(lang);
  const [title, setTitle] = useState(music?.title ?? "");
  const [artist, setArtist] = useState(music?.artist ?? "");
  const [url, setUrl] = useState(music?.url ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const c = cleanMusic(title, artist, url);
    if (!c) return;
    setBusy(true);
    const ok = await onSave({ music_title: c.title, music_artist: c.artist, music_url: c.url, music_at: new Date().toISOString() });
    setBusy(false);
    setMsg(ok ? { ok: true, text: url.trim() && !c.url ? n("badUrl") : n("saved") } : { ok: false, text: n("failed") });
    if (ok && !c.url) setUrl("");
  };
  const clear = async () => {
    setBusy(true);
    const ok = await onSave({ music_title: null, music_artist: null, music_url: null, music_at: null });
    setBusy(false);
    if (ok) { setTitle(""); setArtist(""); setUrl(""); setMsg({ ok: true, text: n("saved") }); } else setMsg({ ok: false, text: n("failed") });
  };
  const input = "h-9 min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12.5px] outline-none focus:border-[var(--accent)]";
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{n("title")}</div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{n("hint")}</p>
      <div className="flex flex-col gap-1.5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={n("trackPh")} maxLength={MUSIC_TITLE_MAX} className={input} />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={n("artistPh")} maxLength={MUSIC_ARTIST_MAX} className={input} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={n("urlPh")} maxLength={MUSIC_URL_MAX} inputMode="url" className={input} />
      </div>
      <div className="mt-2 flex gap-1.5">
        <button onClick={save} disabled={busy || !title.trim()} className="h-9 flex-1 rounded-lg bg-[var(--accent)] text-[12.5px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">{n("set")}</button>
        {music && <button onClick={clear} disabled={busy} className="h-9 shrink-0 rounded-lg border border-[var(--line)] px-3 text-[12px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]">{n("clear")}</button>}
      </div>
      {msg && <p className={`mt-2 text-[12px] font-semibold ${msg.ok ? "text-[var(--accent-deep)]" : "text-[var(--danger)]"}`} role="status">{msg.text}</p>}
    </div>
  );
}
