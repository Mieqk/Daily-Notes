/** Поиск полной версии трека на YouTube (Data API v3). Ключ публичный: в Google Cloud его нужно ограничить адресом сайта. */
export const YOUTUBE_KEY_DEFAULT = "AIzaSyDzOE3UM7PKCSmqwuBBjVKTlrYT1CPkhyg";
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

const ENT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };
const unescapeHtml = (t: string) => t.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENT[m] ?? m);

export interface YtTrack { title: string; artist: string | null; url: string; cover: string | null; preview: null }

/** Разбор ответа поиска YouTube в треки: канал «Исполнитель - Topic» превращаем в исполнителя. */
export function parseYoutubeTracks(j: unknown): YtTrack[] {
  const items = (j as { items?: { id?: { videoId?: unknown }; snippet?: { title?: unknown; channelTitle?: unknown; thumbnails?: { medium?: { url?: unknown }; default?: { url?: unknown } } } }[] } | null)?.items;
  const out: YtTrack[] = [];
  for (const it of items ?? []) {
    const id = it?.id?.videoId;
    const title = it?.snippet?.title;
    if (typeof id !== "string" || !ID_RE.test(id) || typeof title !== "string" || !title.trim()) continue;
    const ch = typeof it.snippet?.channelTitle === "string" ? unescapeHtml(it.snippet.channelTitle).replace(/\s*-\s*Topic$/i, "").trim() : "";
    const th = it.snippet?.thumbnails?.medium?.url ?? it.snippet?.thumbnails?.default?.url;
    out.push({
      title: unescapeHtml(title).trim().slice(0, 80),
      artist: ch ? ch.slice(0, 80) : null,
      url: `https://www.youtube.com/watch?v=${id}`,
      cover: typeof th === "string" ? th : null,
      preview: null,
    });
  }
  return out;
}

/** Поиск треков на YouTube (когда Apple Music трек не знает). */
export async function searchYoutubeTracks(query: string, signal?: AbortSignal): Promise<YtTrack[]> {
  if (!KEY) return [];
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoCategoryId=10&maxResults=8&q=${encodeURIComponent(query.trim())}&key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new YoutubeError(res.status);
  return parseYoutubeTracks(await res.json());
}

/** Есть ли среди результатов Apple что-то похожее на запрос (все слова запроса встречаются в названии или исполнителе). */
export function looksRelevant(query: string, res: { title: string; artist: string | null }[]): boolean {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length) return res.length > 0;
  return res.some((r) => { const hay = `${r.artist ?? ""} ${r.title}`.toLowerCase(); return words.every((w) => hay.includes(w)); });
}
