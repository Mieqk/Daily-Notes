/** Тексты песен через LRCLIB (бесплатно, без ключа). Есть версия с метками времени. */
export interface LyricLine { t: number; text: string }
export interface Lyrics { synced: LyricLine[] | null; plain: string | null; duration: number | null }

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

interface Raw { id?: number; trackName?: string; artistName?: string; duration?: number; syncedLyrics?: string | null; plainLyrics?: string | null; instrumental?: boolean }
export function toLyrics(r: Raw | null | undefined): Lyrics | null {
  if (!r || r.instrumental) return null;
  const synced = r.syncedLyrics ? parseLrc(r.syncedLyrics) : null;
  const plain = r.plainLyrics?.trim() || null;
  if (!(synced && synced.length) && !plain) return null;
  return { synced: synced && synced.length ? synced : null, plain, duration: typeof r.duration === "number" ? r.duration : null };
}

/** Доля кириллических букв среди всех букв (0..1). */
export function cyrillicShare(s: string): number {
  const letters = s.match(/\p{L}/gu);
  if (!letters) return 0;
  return letters.filter((c) => /[\u0400-\u04FF]/.test(c)).length / letters.length;
}

/** Выбирает лучший вариант текста: язык оригинала (кириллица для русских песен, не транслит), совпадение длины, наличие меток времени. */
export function pickBest(list: Raw[], want: { title: string; artist: string | null; dur: number | null }): Raw | null {
  const cyr = cyrillicShare(`${want.title} ${want.artist ?? ""}`) > 0.5;
  let best: Raw | null = null, bestScore = -Infinity;
  for (const r of list) {
    if (r.instrumental || !(r.syncedLyrics || r.plainLyrics)) continue;
    const body = r.syncedLyrics || r.plainLyrics || "";
    let score = r.syncedLyrics ? 10 : 0;
    const share = cyrillicShare(body.replace(/\[[^\]]*\]/g, ""));
    if (cyr) score += share > 0.5 ? 20 : -20; // русская песня: нужен кириллический текст, не транслит
    else score += share > 0.5 ? -20 : 0;
    if (want.dur && want.dur > 40 && typeof r.duration === "number") {
      const diff = Math.abs(r.duration - want.dur);
      score += diff <= 2 ? 12 : diff <= 6 ? 6 : diff <= 15 ? 0 : -8;
    }
    if (r.trackName && cleanTitle(r.trackName).toLowerCase() === cleanTitle(want.title).toLowerCase()) score += 4;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

/** Чистит «(feat. …)», «- Remastered» и подобное, чтобы поиск находил больше. */
export const cleanTitle = (t: string) => t.replace(/\s*[([][^)\]]*(feat|ft|remaster|live|version)[^)\]]*[)\]]/gi, "").replace(/\s+-\s+(remaster|live|single).*$/i, "").trim();

const cache = new Map<string, Lyrics | null>();
const key = (title: string, artist: string | null, dur: number | null) => `${artist ?? ""}\u0000${title}\u0000${dur && dur > 40 ? Math.round(dur / 5) : 0}`.toLowerCase();

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const r = await fetch(url, { signal });
  return r.ok ? ((await r.json()) as T) : null;
}

export async function findLyrics(title: string, artist: string | null, dur: number | null, signal?: AbortSignal): Promise<Lyrics | null> {
  const k = key(title, artist, dur);
  if (cache.has(k)) return cache.get(k) ?? null;
  const clean = cleanTitle(title);
  let res: Lyrics | null = null;
  try {
    const urls = [
      `${API}/search?${new URLSearchParams({ q: artist ? `${artist} ${clean}` : clean })}`,
      `${API}/search?${new URLSearchParams({ track_name: clean, ...(artist ? { artist_name: artist } : {}) })}`,
    ];
    const lists = await Promise.all(urls.map((u) => getJson<Raw[]>(u, signal).catch((e) => { if ((e as Error).name === "AbortError") throw e; return null; })));
    const seen = new Set<number | undefined>();
    const all = lists.flatMap((l) => l ?? []).filter((r) => (r.id == null || !seen.has(r.id)) && (seen.add(r.id), true));
    res = toLyrics(pickBest(all, { title, artist, dur }));
    if (!res && artist) res = toLyrics(await getJson<Raw>(`${API}/get?${new URLSearchParams({ artist_name: artist, track_name: clean })}`, signal));
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return null; // сеть: не кэшируем, попробуем позже
  }
  cache.set(k, res);
  return res;
}

const OFFSETS_KEY = "dn.lyricOffsets";
const offKey = (title: string, artist: string | null) => `${artist ?? ""}|${title}`.toLowerCase().slice(0, 120);
/** Ручной сдвиг текста для трека (секунды): видео на YouTube может начинаться не с той же секунды, что студийная запись. */
export function getOffset(title: string, artist: string | null): number {
  try { const v = Number((JSON.parse(localStorage.getItem(OFFSETS_KEY) ?? "{}") as Record<string, number>)[offKey(title, artist)]); return Number.isFinite(v) ? v : 0; } catch { return 0; }
}
export function setOffset(title: string, artist: string | null, v: number) {
  try {
    const all = JSON.parse(localStorage.getItem(OFFSETS_KEY) ?? "{}") as Record<string, number>;
    if (v === 0) delete all[offKey(title, artist)]; else all[offKey(title, artist)] = Math.round(v * 10) / 10;
    localStorage.setItem(OFFSETS_KEY, JSON.stringify(all));
  } catch { /* приватный режим */ }
}
