import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { embedOf } from "../lib/musicEmbed";
import { cleanMusic } from "../lib/nowPlaying";
import { safeCoverUrl, safePreviewUrl, type FoundTrack } from "../lib/trackSearch";
import { makePlaylist } from "../music-playlist-strings";
import { makeSearch } from "../music-search-strings";
import { Cover, PreviewButton, TrackSearch } from "./MusicParts";

export interface Track { id: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }
const MAX = 50;

/** Плеер трека: 30-секундное превью, если оно есть, иначе встроенный плеер сервиса (iframe), иначе ссылка. */
export function TrackPlayer({ url, preview, lang }: { url: string | null; preview?: string | null; lang: Lang }) {
  const p = makePlaylist(lang);
  const s = makeSearch(lang);
  const e = embedOf(url);
  const pv = safePreviewUrl(preview);
  if (pv) {
    return (
      <div className="flex items-center gap-3">
        <PreviewButton src={pv} lang={lang} size={40} />
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
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number>(0);

  const load = useCallback(async () => {
    if (!supabase) return;
    // cover и preview появились позже: если миграция ещё не выполнена, читаем без них
    const q = (cols: string) => supabase!.from("profile_tracks").select(cols).eq("user_id", profileId).order("created_at", { ascending: true }).limit(MAX);
    const full = await q("id, title, artist, url, cover, preview");
    const rows = (full.error ? (await q("id, title, artist, url")).data : full.data) as unknown as Partial<Track>[] | null;
    setTracks((rows ?? []).map((t) => ({ id: t.id!, title: t.title!, artist: t.artist ?? null, url: t.url ?? null, cover: safeCoverUrl(t.cover), preview: safePreviewUrl(t.preview) })));
  }, [profileId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 3000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const add = async (t: FoundTrack): Promise<boolean> => {
    const c = cleanMusic(t.title, t.artist ?? "", t.url ?? "", { cover: t.cover, preview: t.preview });
    if (!c || !supabase) return false;
    if ((tracks?.length ?? 0) >= MAX) { setMsg({ ok: false, text: p("full") }); return false; }
    const { error } = await supabase.from("profile_tracks").insert({ user_id: viewerId, title: c.title, artist: c.artist, url: c.url, cover: c.cover, preview: c.preview });
    if (error) { setMsg({ ok: false, text: p("err") }); return false; }
    await load();
    return true;
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
  const chip = "h-8 shrink-0 rounded-full border border-[var(--line)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] active:scale-95";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{p("title")}{tracks && tracks.length > 0 ? ` · ${tracks.length}` : ""}</div>
        {isOwn && (
          <button onClick={() => setAdding((v) => !v)} aria-expanded={adding} className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">
            {adding ? "×" : `+ ${p("add")}`}
          </button>
        )}
      </div>

      {isOwn && adding && <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3"><TrackSearch lang={lang} onPick={add} autoFocus /></div>}

      {msg && <div role="status" className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${msg.ok ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{msg.text}</div>}

      {tracks === null ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">…</div>
      ) : tracks.length === 0 ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">{p("empty")}</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tracks.map((t) => {
            const embed = !t.preview && !!embedOf(t.url);
            const shown = open === t.id;
            return (
              <li key={t.id} className="rounded-xl bg-[var(--panel-2)] p-2.5">
                <div className="flex items-center gap-3">
                  <Cover src={t.cover} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{t.title}</div>
                    {t.artist && <div className="truncate text-[12.5px] text-[var(--ink-soft)]">{t.artist}</div>}
                  </div>
                  {t.preview ? <PreviewButton src={t.preview} lang={lang} size={40} /> : embed ? (
                    <button onClick={() => setOpen(shown ? null : t.id)} aria-pressed={shown} className={chip}>{shown ? p("hide") : p("play")}</button>
                  ) : t.url ? <a href={t.url} target="_blank" rel="noopener noreferrer" className={`${chip} grid place-items-center`}>{p("open")}</a> : null}
                </div>
                {shown && embed && <div className="mt-2"><TrackPlayer url={t.url} lang={lang} /></div>}
                {isOwn && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {onToWall && <button onClick={() => act(onToWall, t, p("onWall"))} className={chip}>{p("toWall")}</button>}
                    {onSetNow && <button onClick={() => act(onSetNow, t, p("nowSet"))} className={chip}>{p("setNow")}</button>}
                    <button onClick={() => remove(t)} className={`${chip} ml-auto ${confirmId === t.id ? "!border-transparent !bg-[var(--danger)] !text-white" : ""}`}>{confirmId === t.id ? p("delSure") : p("del")}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
