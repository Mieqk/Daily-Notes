import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { MusicNoteIcon } from "../icons";
import { supabase } from "../lib/supabase";
import { cleanMusic, MUSIC_ARTIST_MAX, MUSIC_TITLE_MAX, MUSIC_URL_MAX } from "../lib/nowPlaying";
import { embedOf } from "../lib/musicEmbed";
import { makePlaylist } from "../music-playlist-strings";
import { makeNowPlaying } from "../now-playing-strings";

export interface Track { id: string; title: string; artist: string | null; url: string | null }
const MAX = 50;

/** Встроенный плеер сервиса (iframe) или ссылка, если для сервиса плеера нет. */
export function TrackPlayer({ url, lang }: { url: string | null; lang: Lang }) {
  const p = makePlaylist(lang);
  const e = embedOf(url);
  if (!url) return null;
  if (!e) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[var(--accent-deep)] underline">{p("open")}</a>;
  return (
    <iframe
      src={e.src} title="player" height={e.height} loading="lazy"
      allow="autoplay; encrypted-media; clipboard-write" referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
      className="w-full rounded-lg border-0 bg-[var(--panel-2)]"
    />
  );
}

interface Props {
  viewerId: string; profileId: string; lang: Lang;
  /** Только для своего профиля: показать трек как «сейчас играет». */
  onSetNow?: (t: Track) => Promise<boolean>;
  /** Только для своего профиля: выложить трек на стену. */
  onToWall?: (t: Track) => Promise<boolean>;
}

export default function MusicPlaylist({ viewerId, profileId, lang, onSetNow, onToWall }: Props) {
  const isOwn = viewerId === profileId;
  const p = makePlaylist(lang);
  const np = makeNowPlaying(lang);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number>(0);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("profile_tracks").select("id, title, artist, url").eq("user_id", profileId).order("created_at", { ascending: true }).limit(MAX);
    setTracks((data ?? []) as Track[]);
  }, [profileId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 3000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const add = async () => {
    const c = cleanMusic(title, artist, url);
    if (!c || !supabase || busy) return;
    if ((tracks?.length ?? 0) >= MAX) { setMsg({ ok: false, text: p("full") }); return; }
    setBusy(true);
    const { error } = await supabase.from("profile_tracks").insert({ user_id: viewerId, title: c.title, artist: c.artist, url: c.url });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: p("err") }); return; }
    if (url.trim() && !c.url) setMsg({ ok: true, text: np("badUrl") });
    setTitle(""); setArtist(""); setUrl(""); setAdding(false);
    await load();
  };

  const remove = async (t: Track) => {
    if (confirmId !== t.id) {
      setConfirmId(t.id);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    setConfirmId(null);
    const { error } = await supabase!.from("profile_tracks").delete().eq("id", t.id);
    if (error) { setMsg({ ok: false, text: p("err") }); return; }
    setTracks((l) => (l ?? []).filter((x) => x.id !== t.id));
  };

  const act = async (fn: ((t: Track) => Promise<boolean>) | undefined, t: Track, okText: string) => {
    if (!fn) return;
    const ok = await fn(t);
    setMsg({ ok, text: ok ? okText : p("err") });
  };

  // у чужого пустого плейлиста карточку не рисуем: незачем занимать место
  if (!isOwn && tracks !== null && tracks.length === 0) return null;
  const input = "h-9 min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12.5px] outline-none focus:border-[var(--accent)]";
  const small = "h-9 shrink-0 rounded-lg border border-[var(--line)] px-2.5 text-[12px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{p("title")}</div>
        {isOwn && !adding && (
          <button onClick={() => setAdding(true)} className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">+ {p("add")}</button>
        )}
      </div>

      {isOwn && adding && (
        <div className="mb-3 flex flex-col gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={np("trackPh")} maxLength={MUSIC_TITLE_MAX} className={input} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={np("artistPh")} maxLength={MUSIC_ARTIST_MAX} className={input} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={np("urlPh")} maxLength={MUSIC_URL_MAX} inputMode="url" className={input} />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setAdding(false)} className={small}>{np("clear")}</button>
            <button onClick={add} disabled={busy || !title.trim()} className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-50">{p("add")}</button>
          </div>
        </div>
      )}

      {msg && <div role="status" className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${msg.ok ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{msg.text}</div>}

      {tracks === null ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">…</div>
      ) : tracks.length === 0 ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">{p("empty")}</div>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {tracks.map((t) => {
            const shown = open === t.id;
            return (
              <li key={t.id} className="py-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setOpen(shown ? null : t.id)} disabled={!t.url}
                    aria-label={`${shown ? p("hide") : p("play")}: ${t.title}`} aria-pressed={shown}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-deep)] transition-all active:scale-90 disabled:opacity-40"
                  >
                    {shown ? <span aria-hidden className="text-[13px] font-bold">❚❚</span> : <MusicNoteIcon className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold">{t.title}</div>
                    {t.artist && <div className="truncate text-[12px] text-[var(--ink-soft)]">{t.artist}</div>}
                  </div>
                  {isOwn && (
                    <button onClick={() => remove(t)} className={`${small} ${confirmId === t.id ? "!border-transparent !bg-[var(--danger)] !text-white" : ""}`}>
                      {confirmId === t.id ? p("delSure") : p("del")}
                    </button>
                  )}
                </div>
                {shown && <div className="mt-2"><TrackPlayer url={t.url} lang={lang} /></div>}
                {isOwn && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[52px]">
                    {onToWall && <button onClick={() => act(onToWall, t, p("onWall"))} className={small}>{p("toWall")}</button>}
                    {onSetNow && <button onClick={() => act(onSetNow, t, p("nowSet"))} className={small}>{p("setNow")}</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {tracks && tracks.some((t) => embedOf(t.url)) && <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{p("playerNote")}</p>}
    </div>
  );
}
