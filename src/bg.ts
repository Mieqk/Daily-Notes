import type { BgId } from "./store";

/** Встроенные узоры. Все рисуются CSS/SVG, без внешних картинок. */
export const BUILTIN_BGS = [
  "dots", "grid", "paper", "space", "lines", "hex", "waves",
  "aurora", "stars", "rain", "snow", "leaves", "sakura", "mountains",
  "ocean", "city", "neon", "grain", "marble", "sand", "geometry", "fog",
] as const;
export type BuiltinBg = (typeof BUILTIN_BGS)[number];

export const isBuiltinBg = (id: string): id is BuiltinBg => (BUILTIN_BGS as readonly string[]).includes(id);
export const isCustomBg = (id: string) => id.startsWith("custom:");

/** Свой фон: картинка хранится на устройстве (localStorage), уже сжатая. */
export interface CustomBg { id: string; data: string }
export interface CustomBgOpts { dim: number; blur: number }
export const DEFAULT_CUSTOM_OPTS: CustomBgOpts = { dim: 35, blur: 0 };
export const MAX_CUSTOM_BGS = 4;

/** Если выбран фон, которого нет на этом устройстве (например, пришёл из облака), показываем точки. */
export function resolveBg(id: BgId, customs: CustomBg[]): BgId {
  if (isBuiltinBg(id)) return id;
  if (isCustomBg(id) && customs.some((c) => `custom:${c.id}` === id)) return id;
  return "dots";
}

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
const line = (d: string, sw = 1) => `<path d='${d}' fill='none' stroke='#000' stroke-width='${sw}' stroke-linecap='round' stroke-linejoin='round'/>`;
const fill = (d: string) => `<path d='${d}' fill='#000'/>`;

/** Маски-плитки: цвет берётся из темы, форма отсюда. size = размер плитки в px. */
export const MASKS: Record<string, { url: string; w: number; h: number }> = {
  lines: { w: 100, h: 28, url: svg(100, 28, line("M0 14H100", 1)) },
  hex: { w: 56, h: 100, url: svg(56, 100, line("M28 0l24 14v28l-24 14-24-14V14z", 1) + line("M28 56l24 14v28l-24 14-24-14V70z", 1) + line("M28 0V-14M52 14l24-14M4 14l-24-14", 1)) },
  waves: { w: 120, h: 36, url: svg(120, 36, line("M0 18Q30 2 60 18T120 18", 1.4)) },
  geometry: { w: 96, h: 96, url: svg(96, 96, line("M10 38L30 6l20 32z", 1.4) + line("M62 10h24v24H62z", 1.4) + `<circle cx='24' cy='72' r='14' fill='none' stroke='#000' stroke-width='1.4'/>` + line("M60 90l12-24 12 24z", 1.4) + line("M48 48l8 8M56 48l-8 8", 1.2)) },
  rainA: { w: 90, h: 140, url: svg(90, 140, line("M12 6l-6 24M52 60l-6 24M78 20l-6 24M30 100l-6 24M70 108l-6 24", 1.3)) },
  rainB: { w: 130, h: 190, url: svg(130, 190, line("M20 20l-9 36M92 80l-9 36M60 150l-9 36M118 10l-9 36", 1.8)) },
  snowA: { w: 160, h: 160, url: svg(160, 160, `<circle cx='20' cy='24' r='2.2'/><circle cx='86' cy='12' r='1.6'/><circle cx='132' cy='54' r='2.6'/><circle cx='54' cy='84' r='1.8'/><circle cx='110' cy='116' r='2.2'/><circle cx='18' cy='140' r='1.8'/><circle cx='146' cy='150' r='1.6'/>`) },
  snowB: { w: 240, h: 240, url: svg(240, 240, `<circle cx='40' cy='50' r='4.2'/><circle cx='170' cy='34' r='3.4'/><circle cx='110' cy='130' r='4.6'/><circle cx='210' cy='190' r='3.6'/><circle cx='30' cy='200' r='3.8'/>`) },
  leaves: { w: 240, h: 240, url: svg(240, 240, fill("M40 40c22-6 36 10 38 30-22 6-38-8-38-30z") + fill("M160 20c18-4 30 8 30 24-18 4-30-6-30-24z") + fill("M120 120c24-8 40 10 40 34-26 6-42-10-40-34z") + fill("M30 170c18-4 30 8 30 24-18 4-30-6-30-24z") + fill("M200 190c20-6 32 8 32 26-20 4-32-8-32-26z")) },
  petals: { w: 220, h: 220, url: svg(220, 220, fill("M40 30c8-16 22-16 28 0-10 8-20 8-28 0z") + fill("M150 60c8-16 22-16 28 0-10 8-20 8-28 0z") + fill("M90 130c8-16 22-16 28 0-10 8-20 8-28 0z") + fill("M20 170c8-16 22-16 28 0-10 8-20 8-28 0z") + fill("M180 180c8-16 22-16 28 0-10 8-20 8-28 0z")) },
  hillsFar: { w: 600, h: 200, url: svg(600, 200, fill("M0 200V120L60 70l50 40 70-80 80 90 60-40 90 70 70-60 80 70 40-30V200z")) },
  hillsNear: { w: 600, h: 200, url: svg(600, 200, fill("M0 200V150L90 90l70 60 60-50 110 90 90-70 90 60 90-40V200z")) },
  oceanA: { w: 240, h: 60, url: svg(240, 60, fill("M0 30Q30 6 60 30T120 30T180 30T240 30V60H0z")) },
  oceanB: { w: 320, h: 60, url: svg(320, 60, fill("M0 34Q40 8 80 34T160 34T240 34T320 34V60H0z")) },
  city: { w: 520, h: 220, url: svg(520, 220, fill("M0 220V120h30V80h40v50h24V50h46v70h26V100h34V30h36v90h30V90h40v40h26V60h44v70h30V110h34V220z")) },
  marble: { w: 520, h: 520, url: `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'><filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.006 0.012' numOctaves='5' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -6.4'/></filter><rect width='520' height='520' filter='url(#m)'/></svg>")}")` },
  sand: { w: 200, h: 200, url: `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='s' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.4 -0.8'/></filter><rect width='200' height='200' filter='url(#s)'/></svg>")}")` },
};

/** Сколько места займёт сжатая картинка и как её уменьшаем перед сохранением. */
const MAX_SIDE = 1280;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad-image")); };
    img.src = url;
  });
}

/** Уменьшает картинку до ~1280px по длинной стороне и жмёт в JPEG (обычно 80–250 КБ). */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("bad-image");
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("bad-image");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  let q = 0.72;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length > 380_000 && q > 0.4) { q -= 0.1; out = canvas.toDataURL("image/jpeg", q); }
  return out;
}
