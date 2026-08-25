// Подготовка изображений перед загрузкой в Supabase Storage:
// кроп + сжатие на клиенте, чтобы не раздувать хранилище и не ждать аплоад.

export interface ProcessedImage {
  blob: Blob;
  ext: string;
}

const MAX_AVATAR = 256;
const MAX_BANNER = 1280;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not-image"));
    };
    img.src = url;
  });
}

export async function prepareImage(file: File, kind: "avatar" | "banner"): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  if (file.size > 8 * 1024 * 1024) throw new Error("too-big");

  const img = await loadImage(file);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) throw new Error("not-image");

  // Центральный кроп: квадрат для аватара, 3:1 для баннера
  let sw = nw;
  let sh = nh;
  if (kind === "avatar") {
    const side = Math.min(nw, nh);
    sw = side;
    sh = side;
  } else {
    const target = 3;
    if (nw / nh > target) sw = nh * target;
    else sh = nw / target;
  }
  const sx = (nw - sw) / 2;
  const sy = (nh - sh) / 2;

  const max = kind === "avatar" ? MAX_AVATAR : MAX_BANNER;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("encode-fail");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode-fail"))), "image/webp", 0.85);
  });
  const ext = blob.type === "image/webp" ? "webp" : "png";
  return { blob, ext };
}
