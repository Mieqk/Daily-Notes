import { supabase } from "./supabase";

/** Свои аудиофайлы в плейлисте: лежат в закрытом хранилище, слушать их могут хозяин и друзья (по временной ссылке). */
export const MUSIC_BUCKET = "music-files";
export const MAX_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_FILES = 10;
const EXT = ["mp3", "m4a", "aac", "ogg", "oga", "wav", "webm", "flac"];
const LINK_TTL = 6 * 3600;

const extOf = (name: string) => (/\.([A-Za-z0-9]{2,5})$/.exec(name)?.[1] ?? "").toLowerCase();

export type FileCheck = "ok" | "notAudio" | "tooBig";
export function checkMusicFile(f: { name: string; type: string; size: number }): FileCheck {
  if (!(f.type.startsWith("audio/") || EXT.includes(extOf(f.name)))) return "notAudio";
  if (f.size > MAX_FILE_BYTES) return "tooBig";
  return "ok";
}

/** «Исполнитель - Название.mp3» превращаем в название и исполнителя. */
export function titleFromFilename(name: string): { title: string; artist: string | null } {
  const base = name.replace(/\.[A-Za-z0-9]{2,5}$/, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const m = /^(.{1,80}?)\s+[-–—]\s+(.{1,80})$/.exec(base);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { title: base.slice(0, 80) || "Track", artist: null };
}

/** Ссылка на наш файл (временная ссылка хранилища): у такого трека играет весь файл, а не превью. */
export const isOwnFileUrl = (u: string | null | undefined): boolean => !!u && u.includes(`/object/sign/${MUSIC_BUCKET}/`);

export async function uploadMusicFile(userId: string, file: File): Promise<string | null> {
  if (!supabase) return null;
  const ext = EXT.includes(extOf(file.name)) ? extOf(file.name) : "mp3";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MUSIC_BUCKET).upload(path, file, { contentType: file.type || `audio/${ext === "mp3" ? "mpeg" : ext}` });
  return error ? null : path;
}

export async function removeMusicFile(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(MUSIC_BUCKET).remove([path]).then(() => {}, () => {});
}

/** Временные ссылки для списка файлов: путь -> адрес. */
export async function musicFileLinks(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!supabase || !paths.length) return out;
  const { data } = await supabase.storage.from(MUSIC_BUCKET).createSignedUrls(paths, LINK_TTL);
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}
