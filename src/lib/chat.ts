import { supabase } from "./supabase";
import { loadImage } from "./images";

export const CHAT_BUCKET = "chat-media";
export const MAX_VIDEO_MB = 25;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const MAX_PHOTO_SRC_BYTES = 30 * 1024 * 1024;

export const CHAT_COLS = "id,sender,recipient,body,media_path,media_type,created_at,read_at";
/** Событие «переписка прочитана»: счётчики непрочитанных обновляются сразу. */
export const CHAT_READ_EVENT = "dn-chat-read";

export interface ChatMessage {
  id: string;
  sender: string;
  recipient: string;
  body: string | null;
  media_path: string | null;
  media_type: "image" | "video" | "audio" | null;
  created_at: string;
  read_at: string | null;
}

/** Непрочитанные сообщения по отправителям. */
export async function fetchUnread(userId: string): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("chat_messages").select("sender").eq("recipient", userId).is("read_at", null).limit(500);
  if (error) return {};
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.sender as string] = (out[r.sender as string] ?? 0) + 1;
  return out;
}

/** Фото уходит в чат уменьшенным: до 1600 px по длинной стороне, JPEG. */
export async function shrinkChatPhoto(file: File): Promise<Blob> {
  if (file.size > MAX_PHOTO_SRC_BYTES) throw new Error("too-big");
  const img = await loadImage(file);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) throw new Error("not-image");
  const k = Math.min(1, 1600 / Math.max(nw, nh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(nw * k));
  canvas.height = Math.max(1, Math.round(nh * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("encode-fail");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode-fail"))), "image/jpeg", 0.82);
  });
}

export function videoExt(file: File): string {
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}
