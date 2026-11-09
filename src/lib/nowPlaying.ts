import { safeCoverUrl, safePreviewUrl } from "./trackSearch";

/** Плашка «сейчас играет» в профиле: трек, который человек выбрал вручную. */
export interface NowPlaying { title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null; at: string | null }

export const MUSIC_TITLE_MAX = 80;
export const MUSIC_ARTIST_MAX = 80;
export const MUSIC_URL_MAX = 300;
/** Столько минут трек считается «сейчас играет», потом «недавно слушал(а)». */
export const MUSIC_LIVE_MIN = 10;

const HOSTS = [
  "spotify.com", "spotify.link", "music.yandex.ru", "music.yandex.com", "music.yandex.by", "music.yandex.kz", "music.yandex.uz",
  "music.apple.com", "music.youtube.com", "youtube.com", "youtu.be", "soundcloud.com", "deezer.com", "zvuk.com", "sber-zvuk.com", "vk.com", "boom.ru", "tidal.com",
];

/** Ссылка на музыку: только https и только известные музыкальные сервисы (чтобы друг не мог подсунуть левую ссылку). */
export function safeMusicUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s.length > MUSIC_URL_MAX) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    return HOSTS.some((d) => h === d || h.endsWith("." + d)) ? u.toString() : null;
  } catch { return null; }
}

export function cleanMusic(title: string, artist: string, url: string, extra?: { cover?: string | null; preview?: string | null }): { title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null } | null {
  const t = title.trim().slice(0, MUSIC_TITLE_MAX);
  if (!t) return null;
  return { title: t, artist: artist.trim().slice(0, MUSIC_ARTIST_MAX) || null, url: safeMusicUrl(url), cover: safeCoverUrl(extra?.cover), preview: safePreviewUrl(extra?.preview) };
}

export function isLive(at: string | null | undefined, now = Date.now()): boolean {
  if (!at) return false;
  const t = new Date(at).getTime();
  return Number.isFinite(t) && now - t <= MUSIC_LIVE_MIN * 60_000;
}

/** Достаёт трек из строки профиля (колонки music_*); пустой трек даёт null. */
export function nowPlayingOf(p: { music_title?: string | null; music_artist?: string | null; music_url?: string | null; music_cover?: string | null; music_preview?: string | null; music_at?: string | null } | null | undefined): NowPlaying | null {
  const title = p?.music_title?.trim();
  if (!title) return null;
  return { title, artist: p?.music_artist?.trim() || null, url: safeMusicUrl(p?.music_url), cover: safeCoverUrl(p?.music_cover), preview: safePreviewUrl(p?.music_preview), at: p?.music_at ?? null };
}
