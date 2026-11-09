/** Тексты песен через LRCLIB (бесплатно, без ключа). Есть версия с метками времени. */
export interface LyricLine { t: number; text: string }
export interface Lyrics { synced: LyricLine[] | null; plain: string | null }

const API = "https://lrclib.net/api";

/** Разбирает LRC: «[01:23.45] строка». Строки без метки пропускаем, несколько меток на строке поддерживаем. */
export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) {
      const frac = m[3] ? Number(`0.${m[3]}`) : 0;
      out.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, text });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Номер строки, которая звучит в момент `time`; -1, если ещё не началась. */
export function activeLine(lines: LyricLine[], time: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= time) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

interface Raw { syncedLyrics?: string | null; plainLyrics?: string | null; instrumental?: boolean }
export function toLyrics(r: Raw | null | undefined): Lyrics | null {
  if (!r || r.instrumental) return null;
  const synced = r.syncedLyrics ? parseLrc(r.syncedLyrics) : null;
  const plain = r.plainLyrics?.trim() || null;
  if (!(synced && synced.length) && !plain) return null;
  return { synced: synced && synced.length ? synced : null, plain };
}

const cache = new Map<string, Lyrics | null>();
const key = (title: string, artist: string | null) => `${artist ?? ""}\u0000${title}`.toLowerCase();

/** Чистит «(feat. …)», «- Remastered» и подобное, чтобы поиск находил больше. */
export const cleanTitle = (t: string) => t.replace(/\s*[([][^)\]]*(feat|ft|remaster|live|version)[^)\]]*[)\]]/gi, "").replace(/\s+-\s+(remaster|live|single).*$/i, "").trim();

export async function findLyrics(title: string, artist: string | null, signal?: AbortSignal): Promise<Lyrics | null> {
  const k = key(title, artist);
  if (cache.has(k)) return cache.get(k) ?? null;
  const clean = cleanTitle(title);
  let res: Lyrics | null = null;
  try {
    if (artist) {
      const r = await fetch(`${API}/get?${new URLSearchParams({ artist_name: artist, track_name: clean })}`, { signal });
      if (r.ok) res = toLyrics((await r.json()) as Raw);
    }
    if (!res) {
      const r = await fetch(`${API}/search?${new URLSearchParams({ q: artist ? `${artist} ${clean}` : clean })}`, { signal });
      if (r.ok) {
        const list = (await r.json()) as Raw[];
        res = toLyrics(list.find((x) => x.syncedLyrics) ?? list.find((x) => x.plainLyrics));
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return null; // сеть: не кэшируем, попробуем позже
  }
  cache.set(k, res);
  return res;
}
