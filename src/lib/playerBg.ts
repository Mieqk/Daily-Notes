/** Фон полноэкранного плеера. Выбор и свой файл хранятся только на этом устройстве. */
export type BgMode = "cover" | "color" | "file";
export interface BgPrefs { mode: BgMode; color: string; fileKind: "image" | "video" | null }

export const BG_COLORS = ["#1f6f54", "#2b4a8a", "#7a2f5e", "#a34a2a", "#1c1c24", "#c79a2e"] as const;
export const MAX_BG_IMAGE = 8 * 1024 * 1024;
export const MAX_BG_VIDEO = 25 * 1024 * 1024;

const PREFS_KEY = "dn.playerBg";
const DB = "dn-player-bg", STORE = "files", FILE_KEY = "bg";

export const DEFAULT_BG: BgPrefs = { mode: "cover", color: BG_COLORS[0], fileKind: null };

export function parsePrefs(raw: string | null): BgPrefs {
  try {
    const p = JSON.parse(raw ?? "null") as Partial<BgPrefs> | null;
    if (!p || typeof p !== "object") return DEFAULT_BG;
    const mode: BgMode = p.mode === "color" || p.mode === "file" ? p.mode : "cover";
    const color = typeof p.color === "string" && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : DEFAULT_BG.color;
    const fileKind = p.fileKind === "image" || p.fileKind === "video" ? p.fileKind : null;
    return { mode: mode === "file" && !fileKind ? "cover" : mode, color, fileKind };
  } catch { return DEFAULT_BG; }
}

/** Проверка выбранного файла: GIF и картинки считаем картинкой, mp4/webm — видео. */
export function checkBgFile(f: { type: string; size: number }): { ok: true; kind: "image" | "video" } | { ok: false; reason: "type" | "size" } {
  if (f.type.startsWith("image/")) return f.size <= MAX_BG_IMAGE ? { ok: true, kind: "image" } : { ok: false, reason: "size" };
  if (f.type.startsWith("video/")) return f.size <= MAX_BG_VIDEO ? { ok: true, kind: "video" } : { ok: false, reason: "size" };
  return { ok: false, reason: "type" };
}

export function loadPrefs(): BgPrefs {
  try { return parsePrefs(localStorage.getItem(PREFS_KEY)); } catch { return DEFAULT_BG; }
}
export function savePrefs(p: BgPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* приватный режим */ }
}

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req.result); };
    t.onerror = t.onabort = () => { db.close(); rej(t.error); };
  });
}
export const saveBgFile = (b: Blob) => tx("readwrite", (s) => s.put(b, FILE_KEY)).then(() => undefined);
export const loadBgFile = () => tx<Blob | undefined>("readonly", (s) => s.get(FILE_KEY) as IDBRequest<Blob | undefined>).catch(() => undefined);
export const removeBgFile = () => tx("readwrite", (s) => s.delete(FILE_KEY)).then(() => undefined).catch(() => undefined);
