// Генератор иконок приложения: из одного описания собирает SVG и все PNG-размеры.
// Запуск: node scripts/generate-icons.mjs  (нужен playwright: он уже есть в окружении разработчика/CI, в зависимости проекта не входит).
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => join(root, p);

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8b6bff"/>
      <stop offset="0.55" stop-color="#4a28c4"/>
      <stop offset="1" stop-color="#1b1046"/>
    </linearGradient>
    <radialGradient id="glow" cx="150" cy="110" r="360" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e6dfff"/>
    </linearGradient>
    <linearGradient id="spark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe08a"/>
      <stop offset="1" stop-color="#f2a53c"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0d0630" flood-opacity="0.45"/>
    </filter>
    <filter id="sparkglow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#f2a53c" flood-opacity="0.55"/>
    </filter>
  </defs>`;

// Листок дневника с «заголовком», строчками и золотой искрой в углу.
const art = `
    <g filter="url(#shadow)">
      <rect x="148" y="118" width="216" height="276" rx="36" fill="url(#page)"/>
    </g>
    <rect x="184" y="170" width="92" height="22" rx="11" fill="#4a28c4"/>
    <rect x="184" y="222" width="144" height="14" rx="7" fill="#4a28c4" opacity="0.32"/>
    <rect x="184" y="258" width="144" height="14" rx="7" fill="#4a28c4" opacity="0.32"/>
    <rect x="184" y="294" width="100" height="14" rx="7" fill="#4a28c4" opacity="0.32"/>
    <rect x="184" y="338" width="60" height="14" rx="7" fill="#f2a53c" opacity="0.9"/>
    <g filter="url(#sparkglow)">
      <path d="M352 96 C358 142 372 156 418 162 C372 168 358 182 352 228 C346 182 332 168 286 162 C332 156 346 142 352 96 Z" fill="url(#spark)"/>
    </g>`;

const svg = (inner, { size = 512 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${defs}${inner}\n</svg>\n`;

const bgFull = `
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#glow)"/>`;
const bgRound = `
    <rect width="512" height="512" rx="116" fill="url(#bg)"/>
    <rect width="512" height="512" rx="116" fill="url(#glow)"/>`;
// Android adaptive: безопасная зона ~61% холста, поэтому рисунок уменьшаем вокруг центра.
const scaled = (s) => `<g transform="translate(256 256) scale(${s}) translate(-256 -256)">${art}</g>`;

const files = {
  "public/icons/icon.svg": svg(bgRound + art),
  "public/icons/icon-maskable.svg": svg(bgFull + scaled(0.9)),
  "public/icons/icon-foreground.svg": svg(scaled(0.74)),
  "public/icons/icon-background.svg": svg(bgFull),
  "public/favicon.svg": svg(bgRound + scaled(1.12)),
};
for (const [p, s] of Object.entries(files)) writeFileSync(out(p), s);

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svgFile, dest, size, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  const body = files[svgFile].replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${body}</body></html>`);
  await page.screenshot({ path: out(dest), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}
const I = "public/icons/";
await png(I + "icon.svg", I + "icon-192.png", 192, true);
await png(I + "icon.svg", I + "icon-512.png", 512, true);
await png(I + "icon-maskable.svg", I + "icon-maskable-192.png", 192);
await png(I + "icon-maskable.svg", I + "icon-maskable-512.png", 512);
// iOS сам скругляет углы и не любит прозрачность: полноразмерный квадрат.
for (const s of [152, 167, 180]) await png(I + "icon-maskable.svg", `${I}apple-touch-icon-${s}.png`, s);
await png(I + "icon-maskable.svg", "public/apple-touch-icon.png", 180);
await png("public/favicon.svg", "public/favicon-32.png", 32, true);
// Для сборки APK (adaptive icon): слои 432x432 (108dp @ xxxhdpi).
await png(I + "icon-foreground.svg", I + "android-foreground-432.png", 432, true);
await png(I + "icon-background.svg", I + "android-background-432.png", 432);
await browser.close();
// eslint-disable-next-line no-undef
process.stdout.write("Иконки сгенерированы\n");
