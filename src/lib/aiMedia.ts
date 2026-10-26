import { loadImage } from "./images";

// Вложения для чата с ИИ. На Vercel тело запроса не больше 4,5 МБ, поэтому ничего не грузим как есть:
// фото сжимаем в JPEG, а из видео берём несколько кадров. Звук видео в ИИ не уходит.
export const MAX_PHOTOS = 4;
export const MAX_VIDEO_SEC = 60;
export const VIDEO_FRAMES = 6;
const MAX_FILE_MB = 25; // исходное фото (современные телефоны снимают до 10-15 МБ)
const MAX_VIDEO_MB = 300;

export interface AiImage { mime: "image/jpeg"; data: string }
export interface AiAttachment {
  id: string;
  kind: "photo" | "video";
  /** Готовые к отправке JPEG (для видео это кадры по порядку). */
  images: AiImage[];
  /** Маленькая картинка для превью и истории чата (data URL). */
  thumb: string;
}
export type AiMediaError = "not-media" | "too-big" | "too-long" | "unreadable";

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

function drawJpeg(src: CanvasImageSource, sw: number, sh: number, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unreadable");
  ctx.fillStyle = "#fff"; // прозрачные PNG иначе станут чёрными
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

const b64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

export async function preparePhoto(file: File): Promise<AiAttachment> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error("too-big");
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error("unreadable");
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("unreadable");
  return {
    id: uid(),
    kind: "photo",
    images: [{ mime: "image/jpeg", data: b64(drawJpeg(img, w, h, 1280, 0.72)) }],
    thumb: drawJpeg(img, w, h, 96, 0.5),
  };
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => { v.removeEventListener("seeked", done); clearTimeout(timer); resolve(); };
    const timer = setTimeout(() => { v.removeEventListener("seeked", done); reject(new Error("unreadable")); }, 8000);
    v.addEventListener("seeked", done);
    v.currentTime = t;
  });
}

export async function prepareVideo(file: File): Promise<AiAttachment> {
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error("too-big");
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error("unreadable"));
      setTimeout(() => reject(new Error("unreadable")), 15000);
    });
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0 || !v.videoWidth || !v.videoHeight) throw new Error("unreadable");
    if (dur > MAX_VIDEO_SEC + 0.5) throw new Error("too-long");
    const images: AiImage[] = [];
    let thumb = "";
    // кадры из середины каждого из N равных отрезков: так захватывается всё видео
    for (let i = 0; i < VIDEO_FRAMES; i++) {
      await seek(v, Math.min(dur - 0.05, ((i + 0.5) / VIDEO_FRAMES) * dur));
      images.push({ mime: "image/jpeg", data: b64(drawJpeg(v, v.videoWidth, v.videoHeight, 768, 0.65)) });
      if (i === 0) thumb = drawJpeg(v, v.videoWidth, v.videoHeight, 96, 0.5);
    }
    return { id: uid(), kind: "video", images, thumb };
  } catch (e) {
    throw e instanceof Error && ["too-long", "too-big"].includes(e.message) ? e : new Error("unreadable");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Фото и видео одним вызовом; бросает Error с кодом AiMediaError. */
export function prepareAiMedia(file: File): Promise<AiAttachment> {
  if (file.type.startsWith("image/")) return preparePhoto(file);
  if (file.type.startsWith("video/")) return prepareVideo(file);
  return Promise.reject(new Error("not-media"));
}
