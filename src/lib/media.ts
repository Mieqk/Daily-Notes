import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { CHAT_BUCKET, MAX_VIDEO_MB, shrinkChatPhoto } from "./chat";
import { generateUUID } from "./uuid";

/** Вложения парных разделов и чата лежат в одном закрытом хранилище: <автор>/<друг | ch-челлендж>/<файл>. */
export type MediaType = "image" | "video" | "audio";
export const MAX_AUDIO_MB = 10;
export { MAX_VIDEO_MB };

export interface PendingMedia { file: File; kind: MediaType; preview: string }
export interface PreparedMedia { blob: Blob; kind: MediaType; ext: string; contentType: string }
export interface MediaRef { media_path: string | null; media_type: MediaType | null }

const VIDEO_EXT: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const AUDIO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac",
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
};

export const baseMime = (m: string) => m.split(";")[0].trim().toLowerCase();

export function kindOf(file: File): MediaType | null {
  const m = baseMime(file.type);
  if (m.startsWith("image/")) return "image";
  if (VIDEO_EXT[m]) return "video";
  if (AUDIO_EXT[m]) return "audio";
  return null;
}

/** Готовит файл к загрузке: фото сжимает, у видео и аудио проверяет размер и тип. Бросает too-big-video / too-big-audio / too-big-photo / bad-type. */
export async function prepareMedia(file: File): Promise<PreparedMedia> {
  const kind = kindOf(file);
  if (!kind) throw new Error("bad-type");
  const mime = baseMime(file.type);
  if (kind === "image") {
    try {
      return { blob: await shrinkChatPhoto(file), kind, ext: "jpg", contentType: "image/jpeg" };
    } catch (e) {
      throw new Error((e as Error).message === "too-big" ? "too-big-photo" : "bad-type");
    }
  }
  if (kind === "video") {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error("too-big-video");
    return { blob: file, kind, ext: VIDEO_EXT[mime], contentType: mime };
  }
  if (file.size > MAX_AUDIO_MB * 1024 * 1024) throw new Error("too-big-audio");
  return { blob: file, kind, ext: AUDIO_EXT[mime], contentType: mime };
}

/** Загружает файл; scope: id друга или `ch-<id челленджа>`. Возвращает путь в хранилище. */
export async function uploadMedia(userId: string, scope: string, m: PreparedMedia): Promise<string> {
  const path = `${userId}/${scope}/${generateUUID()}.${m.ext}`;
  const { error } = await supabase!.storage.from(CHAT_BUCKET).upload(path, m.blob, { contentType: m.contentType });
  if (error) throw new Error("upload");
  return path;
}

export async function removeMedia(path: string | null | undefined) {
  if (!path || !supabase) return;
  try { await supabase.storage.from(CHAT_BUCKET).remove([path]); } catch { /* файл мог уже исчезнуть */ }
}

export function mediaErrorKey(message: string): "tooBigVideo" | "tooBigAudio" | "tooBigPhoto" | "badType" | "uploadFail" {
  if (message === "too-big-video") return "tooBigVideo";
  if (message === "too-big-audio") return "tooBigAudio";
  if (message === "too-big-photo") return "tooBigPhoto";
  if (message === "bad-type") return "badType";
  return "uploadFail";
}

const URL_TTL = 3600;

/** Временные ссылки на вложения (хранилище закрытое). Ссылки обновляются, пока страница открыта. */
export function useMediaUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const asked = useRef(new Set<string>());
  const key = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort().join("|");

  useEffect(() => {
    if (!supabase || !key) return;
    const need = key.split("|").filter((p) => !asked.current.has(p));
    if (need.length === 0) return;
    need.forEach((p) => asked.current.add(p));
    supabase.storage.from(CHAT_BUCKET).createSignedUrls(need, URL_TTL).then(({ data }) => {
      const add: Record<string, string> = {};
      for (const r of data ?? []) if (r.path && r.signedUrl) add[r.path] = r.signedUrl;
      need.forEach((p) => { if (!add[p]) asked.current.delete(p); });
      setUrls((u) => ({ ...u, ...add }));
    });
  }, [key]);

  useEffect(() => {
    const id = window.setInterval(() => { asked.current.clear(); setUrls({}); }, (URL_TTL - 300) * 1000);
    return () => window.clearInterval(id);
  }, []);

  return urls;
}
