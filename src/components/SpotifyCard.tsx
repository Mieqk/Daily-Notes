import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { SPOTIFY_EVENT, setSyncEnabled, spotifyConfigured, spotifyConnected, spotifyDisconnect, spotifyLogin, syncEnabled } from "../lib/spotify";
import { makeSpotify } from "../spotify-strings";

/** Подключение Spotify в своём профиле. Если приложение Spotify не настроено (нет Client ID), карточка не показывается. */
export default function SpotifyCard({ lang }: { lang: Lang }) {
  const s = makeSpotify(lang);
  const [connected, setConnected] = useState(spotifyConnected());
  const [sync, setSync] = useState(syncEnabled());
  useEffect(() => {
    const f = () => { setConnected(spotifyConnected()); setSync(syncEnabled()); };
    window.addEventListener(SPOTIFY_EVENT, f);
    return () => window.removeEventListener(SPOTIFY_EVENT, f);
  }, []);
  if (!spotifyConfigured()) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        <span className="h-2 w-2 rounded-full" style={{ background: connected ? "#1db954" : "var(--ink-faint)" }} aria-hidden />{connected ? s("connected") : s("title")}
      </div>
      {!connected ? (
        <>
          <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{s("hint")}</p>
          <button onClick={() => void spotifyLogin()} className="h-10 w-full rounded-xl bg-[#1db954] text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-95">{s("connect")}</button>
        </>
      ) : (
        <>
          <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
            <span className="text-[13.5px] font-semibold">{s("sync")}</span>
            <input type="checkbox" checked={sync} onChange={(e) => setSyncEnabled(e.target.checked)} className="h-5 w-5 shrink-0" style={{ accentColor: "var(--accent)" }} />
          </label>
          <p className="mb-3 text-[11.5px] text-[var(--ink-faint)]">{s("syncNote")}</p>
          <button onClick={spotifyDisconnect} className="h-9 rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]">{s("disconnect")}</button>
        </>
      )}
    </div>
  );
}
