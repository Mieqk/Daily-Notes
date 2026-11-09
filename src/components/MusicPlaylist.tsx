import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { coverFromLink } from "../lib/musicEmbed";
import { cleanMusic } from "../lib/nowPlaying";
import { enrichTrack, safeCoverUrl, safePreviewUrl, type FoundTrack } from "../lib/trackSearch";
import { makePlaylist } from "../music-playlist-strings";
import { Cover, TrackSearch } from "./MusicParts";
import MusicPlayer from "./MusicPlayer";
import SpotifyImport from "./SpotifyImport";
import { api, isPlayable } from "../lib/musicStore";
import { MAX_FILES, checkMusicFile, musicFileLinks, removeMusicFile, titleFromFilename, uploadMusicFile } from "../lib/musicFiles";

export interface Track { id: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null; audio_path?: string | null }
const MAX = 50;

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
  const [selId, setSelId] = useState<string | null>(null);
  const tried = useRef<Set<string>>(new Set());
  const select = (id: string) => {
    setSelId(id);
    const t = tracks?.find((x) => x.id === id);
    if (t && isPlayable(t)) api.playQueue(tracks!.filter(isPlayable), id);
  };
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number>(0);

  const load = useCallback(async () => {
    if (!supabase) return;
    // cover, preview и audio_path появились позже: если миграции ещё не выполнены, читаем без них
    const q = (cols: string) => supabase!.from("profile_tracks").select(cols).eq("user_id", profileId).order("created_at", { ascending: true }).limit(MAX);
    let res = await q("id, title, artist, url, cover, preview, audio_path");
    if (res.error) res = await q("id, title, artist, url, cover, preview");
    if (res.error) res = await q("id, title, artist, url");
    const rows = (res.data ?? []) as unknown as Partial<Track>[];
    const links = await musicFileLinks(rows.map((t) => t.audio_path).filter((x): x is string => !!x));
    setTracks(rows.map((t) => ({
      id: t.id!, title: t.title!, artist: t.artist ?? null, url: t.url ?? null,
      cover: safeCoverUrl(t.cover) ?? coverFromLink(t.url ?? null),
      // свой файл играет по временной ссылке хранилища, остальное только с проверенных адресов
      preview: t.audio_path ? links[t.audio_path] ?? null : safePreviewUrl(t.preview),
      audio_path: t.audio_path ?? null,
    })));
  }, [profileId]);
  useEffect(() => { void load(); }, [load]);

  // старые треки без обложки или превью: ищем их по названию (только свои, по одному разу за сеанс)
  useEffect(() => {
    if (!isOwn || !tracks) return;
    const todo = tracks.filter((t) => (t.audio_path ? !t.cover : !t.preview || !t.cover || t.cover.includes("ytimg.com")) && !tried.current.has(t.id)).slice(0, 8);
    if (!todo.length) return;
    todo.forEach((t) => tried.current.add(t.id));
    const country = (/^[a-z]{2}-([A-Z]{2})$/.exec(navigator.language)?.[1]) || "US";
    let dead = false;
    (async () => {
      for (const t of todo) {
        try {
          const f = await enrichTrack(t.title, t.artist, country);
          if (dead || !f || (!f.cover && (t.audio_path || !f.preview))) continue;
          // у своего файла дополняем только обложку: в базу подмену ссылки не пишем
          const patch = t.audio_path ? { cover: f.cover ?? t.cover } : { cover: f.cover ?? t.cover, preview: f.preview ?? t.preview };
          setTracks((l) => (l ?? []).map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
          // если миграция с правом обновления ещё не выполнена, обложка просто не сохранится в базе
          void supabase!.from("profile_tracks").update(patch).eq("id", t.id).then(() => {}, () => {});
        } catch { /* поиск недоступен: оставляем как есть */ }
      }
    })();
    return () => { dead = true; };
  }, [tracks, isOwn]);
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

  /** Пачка треков из Spotify: без повторов и не больше свободных мест. Возвращает, сколько добавлено. */
  const importMany = async (list: FoundTrack[]): Promise<number> => {
    if (!supabase) return 0;
    const have = new Set((tracks ?? []).map((t) => `${t.title}|${t.artist ?? ""}`.toLowerCase()));
    const rows: { user_id: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }[] = [];
    for (const f of list) {
      const c = cleanMusic(f.title, f.artist ?? "", f.url ?? "", { cover: f.cover, preview: f.preview });
      if (!c) continue;
      const key = `${c.title}|${c.artist ?? ""}`.toLowerCase();
      if (have.has(key)) continue;
      have.add(key);
      rows.push({ user_id: viewerId, title: c.title, artist: c.artist, url: c.url, cover: c.cover, preview: c.preview });
      if ((tracks?.length ?? 0) + rows.length >= MAX) break;
    }
    if (!rows.length) return 0;
    const { error } = await supabase.from("profile_tracks").insert(rows);
    if (error) throw error;
    await load();
    return rows.length;
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
    if (t.audio_path) void removeMusicFile(t.audio_path);
    setTracks((l) => (l ?? []).filter((x) => x.id !== t.id));
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadFile = async (f: File) => {
    if (!supabase || uploading) return;
    const chk = checkMusicFile(f);
    if (chk !== "ok") { setMsg({ ok: false, text: p(chk) }); return; }
    if ((tracks?.length ?? 0) >= MAX) { setMsg({ ok: false, text: p("full") }); return; }
    if ((tracks ?? []).filter((t) => t.audio_path).length >= MAX_FILES) { setMsg({ ok: false, text: p("filesFull") }); return; }
    setUploading(true);
    const path = await uploadMusicFile(viewerId, f);
    if (!path) { setUploading(false); setMsg({ ok: false, text: p("uploadErr") }); return; }
    const { title, artist } = titleFromFilename(f.name);
    const { error } = await supabase.from("profile_tracks").insert({ user_id: viewerId, title, artist, audio_path: path });
    if (error) { void removeMusicFile(path); setUploading(false); setMsg({ ok: false, text: p("uploadErr") }); return; }
    await load();
    setUploading(false);
    setMsg({ ok: true, text: p("uploaded") });
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

      {isOwn && adding && <SpotifyImport lang={lang} onImport={importMany} />}
      {isOwn && adding && <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3"><TrackSearch lang={lang} onPick={add} autoFocus />
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadFile(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="h-9 rounded-full border border-[var(--line)] px-4 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] active:scale-95 disabled:opacity-60">{uploading ? p("uploading") : `♪ ${p("upload")}`}</button>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-faint)]">{p("uploadNote")}</p>
        </div>
      </div>}

      {msg && <div role="status" className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${msg.ok ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{msg.text}</div>}

      {tracks === null ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">…</div>
      ) : tracks.length === 0 ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">{p("empty")}</div>
      ) : (
        <>
        <MusicPlayer tracks={tracks} selId={selId} onSel={setSelId} lang={lang} />
        <ul className="flex flex-col gap-2">
          {tracks.map((t) => {
            const active = t.id === selId;
            return (
              <li key={t.id} className={`rounded-xl p-2.5 transition-colors ${active ? "bg-[var(--accent-soft)]" : "bg-[var(--panel-2)]"}`}>
                <button onClick={() => select(t.id)} aria-label={`${p("play")}: ${t.title}`} aria-current={active} className="flex w-full items-center gap-3 text-left active:scale-[0.99]">
                  <Cover src={t.cover} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] font-bold ${active ? "text-[var(--accent-deep)]" : ""}`}>{t.title}</span>
                    {t.artist && <span className="block truncate text-[12.5px] text-[var(--ink-soft)]">{t.artist}</span>}
                  </span>
                  <span aria-hidden className="shrink-0 text-[var(--accent-deep)]">{active ? "♪" : "▶"}</span>
                </button>
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
        </>
      )}
    </div>
  );
}
