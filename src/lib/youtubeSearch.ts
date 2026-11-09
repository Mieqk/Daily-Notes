/** Поиск полной версии трека на YouTube (Data API v3). Ключ публичный: в Google Cloud его нужно ограничить адресом сайта. */
export const YOUTUBE_KEY_DEFAULT = "";
const KEY: string = (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined) || YOUTUBE_KEY_DEFAULT;
export const youtubeConfigured = () => KEY.length > 0;

const CACHE_KEY = "dn.ytMap";
const norm = (title: string, artist: string | null) => `${title}|${artist ?? ""}`.toLowerCase().trim().slice(0, 160);
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

let mem: Record<string, string> | null = null;
function readCache(): Record<string, string> {
  if (mem) return mem;
  try { const j = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as unknown; mem = j && typeof j === "object" ? (j as Record<string, string>) : {}; } catch { mem = {}; }
  return mem;
}
/** Уже найденное видео для трека (ищем один раз, потом берём из памяти устройства). */
export function cachedYoutube(title: string, artist: string | null): string | null {
  const v = readCache()[norm(title, artist)];
  return v && ID_RE.test(v) ? v : null;
}
export function cacheYoutube(title: string, artist: string | null, id: string) {
  if (!ID_RE.test(id)) return;
  const c = readCache();
  const keys = Object.keys(c);
  if (keys.length > 300) delete c[keys[0]];
  c[norm(title, artist)] = id;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/** Первое подходящее видео из ответа поиска. */
export function pickVideoId(j: unknown): string | null {
  const items = (j as { items?: { id?: { videoId?: unknown } }[] } | null)?.items;
  for (const it of items ?? []) {
    const id = it?.id?.videoId;
    if (typeof id === "string" && ID_RE.test(id)) return id;
  }
  return null;
}

export class YoutubeError extends Error { constructor(public status: number) { super(`youtube ${status}`); } }

/** Ищет трек на YouTube. null, если не нашли; YoutubeError при ошибке ключа или лимита. */
export async function findYoutube(title: string, artist: string | null): Promise<string | null> {
  const hit = cachedYoutube(title, artist);
  if (hit) return hit;
  if (!KEY) return null;
  const q = `${artist ?? ""} ${title}`.trim();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoCategoryId=10&maxResults=3&q=${encodeURIComponent(q)}&key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new YoutubeError(res.status);
  const id = pickVideoId(await res.json());
  if (id) cacheYoutube(title, artist, id);
  return id;
}
