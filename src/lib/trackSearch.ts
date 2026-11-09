/** Поиск трека по названию через бесплатный публичный поиск Apple (iTunes Search): даёт обложку и 30-секундное превью, ключи не нужны. */
export interface FoundTrack { title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }

const COVER_HOSTS = ["mzstatic.com", "ytimg.com"];
const AUDIO_HOSTS = ["apple.com", "mzstatic.com"];
const URL_MAX = 300;

function hostOk(raw: string | null | undefined, hosts: string[]): string | null {
  const s = (raw ?? "").trim();
  if (!s || s.length > URL_MAX) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    return hosts.some((d) => h === d || h.endsWith("." + d)) ? u.toString() : null;
  } catch { return null; }
}
/** Обложка: только https и только с хостов Apple или YouTube (чужие картинки друзьям не подсунуть). */
export const safeCoverUrl = (raw: string | null | undefined) => hostOk(raw, COVER_HOSTS);
/** Превью: только https и только с хостов Apple. */
export const safePreviewUrl = (raw: string | null | undefined) => hostOk(raw, AUDIO_HOSTS);

/** Обложка с размером побольше: Apple отдаёт 100x100, но по тому же адресу есть и 300x300. */
export const bigArt = (url: string) => url.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/i, "/300x300bb.$2");

interface RawItem { trackName?: unknown; artistName?: unknown; artworkUrl100?: unknown; previewUrl?: unknown; trackViewUrl?: unknown; kind?: unknown }

/** Разбор ответа iTunes Search; всё, что не строка или не прошло проверку хоста, отбрасывается. */
export function parseItunes(json: unknown): FoundTrack[] {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const out: FoundTrack[] = [];
  const seen = new Set<string>();
  for (const r of results as RawItem[]) {
    const title = typeof r.trackName === "string" ? r.trackName.trim().slice(0, 80) : "";
    if (!title) continue;
    const artist = typeof r.artistName === "string" ? r.artistName.trim().slice(0, 80) || null : null;
    const key = `${title}|${artist}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const art = typeof r.artworkUrl100 === "string" ? safeCoverUrl(r.artworkUrl100) : null;
    out.push({
      title, artist,
      cover: art ? bigArt(art) : null,
      preview: typeof r.previewUrl === "string" ? safePreviewUrl(r.previewUrl) : null,
      url: typeof r.trackViewUrl === "string" ? hostOk(r.trackViewUrl, ["apple.com"]) : null,
    });
  }
  return out;
}

export async function searchTracks(query: string, country: string, signal?: AbortSignal): Promise<FoundTrack[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const u = new URL("https://itunes.apple.com/search");
  u.searchParams.set("term", q);
  u.searchParams.set("media", "music");
  u.searchParams.set("entity", "song");
  u.searchParams.set("limit", "8");
  u.searchParams.set("country", country);
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`search ${res.status}`);
  return parseItunes(await res.json());
}

const norm = (x: string) => x.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Из результатов поиска берёт тот, что точно совпал по названию (и по исполнителю, если он указан); иначе null, чтобы не подставить чужой трек. */
export function bestMatch(found: FoundTrack[], title: string, artist: string | null): FoundTrack | null {
  const t = norm(title);
  const a = artist ? norm(artist) : "";
  if (!t) return null;
  for (const f of found) {
    if (norm(f.title) !== t) continue;
    if (a) {
      const fa = f.artist ? norm(f.artist) : "";
      if (!fa || !(fa.includes(a) || a.includes(fa))) continue;
    }
    return f;
  }
  return null;
}

/** Ищет обложку и превью для трека, добавленного без них (вручную или до появления обложек). */
export async function enrichTrack(title: string, artist: string | null, country: string, signal?: AbortSignal): Promise<FoundTrack | null> {
  const found = await searchTracks(`${title} ${artist ?? ""}`, country, signal);
  return bestMatch(found, title, artist);
}
