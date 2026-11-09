/** Встроенный плеер по ссылке на трек. Поддержаны Spotify, YouTube и Яндекс Музыка; для остальных сервисов плеера нет, трек открывается ссылкой. */
export type EmbedKind = "spotify" | "youtube" | "yandex";
export interface Embed { kind: EmbedKind; src: string; height: number }

export function embedOf(raw: string | null | undefined): Embed | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase().replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  if (h === "open.spotify.com") {
    // /track/ID, /intl-xx/track/ID
    const i = parts.findIndex((p) => p === "track" || p === "album" || p === "playlist");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (!id || !/^[A-Za-z0-9]{10,30}$/.test(id)) return null;
    return { kind: "spotify", src: `https://open.spotify.com/embed/${parts[i]}/${id}`, height: parts[i] === "track" ? 80 : 152 };
  }
  let yt: string | null = null;
  if (h === "youtu.be") yt = parts[0] ?? null;
  else if (h === "youtube.com" || h === "music.youtube.com") {
    yt = parts[0] === "watch" ? u.searchParams.get("v") : parts[0] === "shorts" || parts[0] === "embed" ? parts[1] ?? null : null;
  }
  if (yt) return /^[A-Za-z0-9_-]{11}$/.test(yt) ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt}`, height: 200 } : null;
  if (/^music\.yandex\.(ru|com|by|kz|uz)$/.test(h)) {
    // /album/A/track/T
    const a = parts.indexOf("album");
    const t = parts.indexOf("track");
    if (a >= 0 && t >= 0 && /^\d+$/.test(parts[a + 1] ?? "") && /^\d+$/.test(parts[t + 1] ?? "")) {
      return { kind: "yandex", src: `https://music.yandex.ru/iframe/track/${parts[t + 1]}/${parts[a + 1]}`, height: 100 };
    }
  }
  return null;
}
