import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { SPOTIFY_EVENT, SpotifyError, getLikedTracks, getMyPlaylists, getPlaylistTracks, spotifyConnected, type SpPlaylist } from "../lib/spotify";
import type { FoundTrack } from "../lib/trackSearch";
import { makeSpotify } from "../spotify-strings";
import { Cover } from "./MusicParts";

/** Добавление треков из Spotify: плейлисты и понравившиеся. onImport получает треки и возвращает, сколько добавлено. */
export default function SpotifyImport({ lang, onImport }: { lang: Lang; onImport: (tracks: FoundTrack[]) => Promise<number> }) {
  const s = makeSpotify(lang);
  const [connected, setConnected] = useState(spotifyConnected());
  const [lists, setLists] = useState<SpPlaylist[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    const f = () => setConnected(spotifyConnected());
    window.addEventListener(SPOTIFY_EVENT, f);
    return () => window.removeEventListener(SPOTIFY_EVENT, f);
  }, []);
  if (!connected) return null;

  const fail = (e: unknown) => setMsg({ ok: false, text: `${e instanceof SpotifyError && e.status === 403 ? s("denied") : s("failed")}${e instanceof SpotifyError ? ` (${e.status})` : ""}` });
  const toggle = async () => {
    setOpen((v) => !v);
    if (!open && !lists) {
      setBusy("lists");
      try { setLists(await getMyPlaylists()); } catch (e) { fail(e); }
      setBusy(null);
    }
  };
  const run = async (key: string, load: () => Promise<FoundTrack[]>) => {
    if (busy) return;
    setBusy(key);
    setMsg(null);
    try {
      const n = await onImport(await load());
      setMsg({ ok: n > 0, text: n > 0 ? s("imported").replace("{n}", String(n)) : s("noneNew") });
    } catch (e) { fail(e); }
    setBusy(null);
  };

  return (
    <div className="mb-3">
      <button onClick={() => void toggle()} aria-expanded={open} className="h-9 rounded-full bg-[#1db954]/15 px-4 text-[12.5px] font-bold text-[#1a9c47] transition-all hover:bg-[#1db954]/25 active:scale-95">+ {s("import")}</button>
      {open && (
        <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2">
          <button onClick={() => void run("liked", getLikedTracks)} disabled={!!busy} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-[var(--hover)] disabled:opacity-60">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[20px] text-white" style={{ background: "linear-gradient(135deg, #5b3df5, #b8a9f5)" }} aria-hidden>♥</span>
            <span className="text-[13.5px] font-bold">{busy === "liked" ? s("loading") : s("liked")}</span>
          </button>
          {busy === "lists" && <p className="p-2 text-[12px] text-[var(--ink-faint)]">{s("loading")}</p>}
          {lists && lists.length === 0 && <p className="p-2 text-[12px] text-[var(--ink-faint)]">{s("noPlaylists")}</p>}
          {lists?.map((p) => (
            <button key={p.id} onClick={() => void run(p.id, () => getPlaylistTracks(p.id))} disabled={!!busy} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-[var(--hover)] disabled:opacity-60">
              <Cover src={p.image} size={44} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{busy === p.id ? s("loading") : p.name}</span>
            </button>
          ))}
        </div>
      )}
      {msg && <p role="status" className={`mt-2 text-[12px] font-semibold ${msg.ok ? "text-[var(--accent-deep)]" : "text-[var(--danger)]"}`}>{msg.text}</p>}
    </div>
  );
}
