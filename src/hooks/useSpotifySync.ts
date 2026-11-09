import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { SPOTIFY_EVENT, getNowPlaying, spotifyConnected, syncEnabled } from "../lib/spotify";

const POLL_MS = 20_000;
const REFRESH_MS = 5 * 60_000;

/** Если Spotify подключён и включено «показывать, что я слушаю», пока приложение открыто, переносит играющий трек в профиль. */
export function useSpotifySync(userId: string | null) {
  useEffect(() => {
    if (!userId || !supabase) return;
    let lastId = "";
    let lastWrite = 0;
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden || !spotifyConnected() || !syncEnabled()) return;
      busy = true;
      try {
        const np = await getNowPlaying();
        if (!np?.playing) return;
        const now = Date.now();
        // пишем при смене трека и раз в 5 минут, чтобы подпись «сейчас играет» не уходила в «недавно»
        if (np.id === lastId && now - lastWrite < REFRESH_MS) return;
        const t = np.track;
        const { error } = await supabase!.from("profiles").update({ music_title: t.title, music_artist: t.artist, music_url: t.url, music_cover: t.cover, music_preview: null, music_at: new Date(now).toISOString() }).eq("id", userId);
        if (!error) { lastId = np.id; lastWrite = now; }
      } catch { /* нет сети, доступ отозван или лимит запросов: попробуем в следующий раз */ }
      finally { busy = false; }
    };
    const timer = window.setInterval(() => void tick(), POLL_MS);
    const onChange = () => { lastId = ""; void tick(); };
    window.addEventListener(SPOTIFY_EVENT, onChange);
    document.addEventListener("visibilitychange", onChange);
    void tick();
    return () => { window.clearInterval(timer); window.removeEventListener(SPOTIFY_EVENT, onChange); document.removeEventListener("visibilitychange", onChange); };
  }, [userId]);
}
