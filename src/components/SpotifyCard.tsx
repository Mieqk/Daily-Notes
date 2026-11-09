import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { SPOTIFY_EVENT, setSyncEnabled, spotifyConfigured, spotifyConnected, spotifyDisconnect, spotifyLogin, syncEnabled } from "../lib/spotify";
import { makeSpotify } from "../spotify-strings";

/** Логотип Spotify: зелёный круг с тремя дугами. */
function SpotifyMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <circle cx="20" cy="20" r="20" fill="#1db954" />
      <g fill="none" stroke="#0b0b0b" strokeLinecap="round">
        <path d="M9.5 15.2c7.2-2.1 14.6-1.6 21 1.9" strokeWidth="3.2" />
        <path d="M10.8 21.1c6-1.6 12-1.2 17.2 1.7" strokeWidth="2.7" />
        <path d="M12 26.4c4.9-1.2 9.5-.9 13.6 1.4" strokeWidth="2.2" />
      </g>
    </svg>
  );
}

/** Подключение Spotify (раздел «Интеграции» в настройках). Если приложение Spotify не настроено (нет Client ID), карточка не показывается. */
export default function SpotifyCard({ lang, signedIn = true }: { lang: Lang; signedIn?: boolean }) {
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
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
      <div className="flex items-center gap-3">
        <SpotifyMark />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">{s("title")}</div>
          <div className="truncate text-[12px] text-[var(--ink-faint)]">{s("spSub")}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: connected ? "rgba(29,185,84,.15)" : "var(--hover)", color: connected ? "#1a9c47" : "var(--ink-faint)" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: connected ? "#1db954" : "var(--ink-faint)" }} aria-hidden />{connected ? s("statusOn") : s("statusOff")}
        </span>
      </div>
      {!signedIn ? (
        <p className="mt-3 text-[12.5px] text-[var(--ink-faint)]">{s("needLogin")}</p>
      ) : !connected ? (
        <>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{s("hint")}</p>
          <button onClick={() => void spotifyLogin()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1db954] text-[13.5px] font-bold text-black transition-all hover:brightness-110 active:scale-[0.98]">
            <SpotifyMark size={20} />{s("connect")}
          </button>
        </>
      ) : (
        <>
          <button role="switch" aria-checked={sync} onClick={() => setSyncEnabled(!sync)} className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--panel)] px-3 py-2.5 text-left">
            <span>
              <span className="block text-[13.5px] font-semibold">{s("sync")}</span>
              <span className="block text-[11.5px] text-[var(--ink-faint)]">{s("syncNote")}</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${sync ? "bg-[#1db954]" : "bg-[var(--hover)]"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${sync ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
          <button onClick={spotifyDisconnect} className="mt-2 h-9 rounded-full border border-[var(--line)] px-4 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]">{s("disconnect")}</button>
        </>
      )}
    </div>
  );
}
