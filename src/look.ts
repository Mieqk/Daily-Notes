/** Настройки внешнего вида поверх выбранной темы: форма, плотность, шрифт, свои цвета. */
export type Radius = "auto" | "sharp" | "soft" | "round";
export type Density = "compact" | "normal" | "airy";
export type UiFont = "auto" | "golos" | "system" | "serif" | "mono";
export type Base = "light" | "dark";

export interface Look {
  /** Основа для темы «Своя» */
  base: Base;
  /** Акцентный цвет для темы «Своя», #rrggbb */
  accent: string;
  /** Слегка подкрасить фон в цвет акцента */
  tint: boolean;
  radius: Radius;
  density: Density;
  uiFont: UiFont;
  /** Без световых пятен, зерна и мягких теней */
  flat: boolean;
}

export const DEFAULT_LOOK: Look = {
  base: "light",
  accent: "#3d6b8f",
  tint: false,
  radius: "auto",
  density: "normal",
  uiFont: "auto",
  flat: false,
};

export const ACCENT_PRESETS = ["#3d6b8f", "#226b52", "#b5651d", "#c0453c", "#6a55c8", "#c2477a", "#2f2f2c"];

const RADII: Radius[] = ["auto", "sharp", "soft", "round"];
const DENSITIES: Density[] = ["compact", "normal", "airy"];
const FONTS: UiFont[] = ["auto", "golos", "system", "serif", "mono"];

/** Приводит что угодно (localStorage, чужие настройки из аккаунта) к корректному Look. */
export function sanitizeLook(raw: unknown): Look {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_LOOK;
  return {
    base: r.base === "dark" ? "dark" : "light",
    accent: typeof r.accent === "string" && /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent.toLowerCase() : d.accent,
    tint: r.tint === true,
    radius: RADII.includes(r.radius as Radius) ? (r.radius as Radius) : d.radius,
    density: DENSITIES.includes(r.density as Density) ? (r.density as Density) : d.density,
    uiFont: FONTS.includes(r.uiFont as UiFont) ? (r.uiFont as UiFont) : d.uiFont,
    flat: r.flat === true,
  };
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s * 100, l * 100];
}

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;

/** Читаемость текста поверх акцента: тёмный или светлый. */
function inkOn(l: number): string {
  return l > 55 ? "#16130c" : "#f8f8f4";
}

/** Палитра темы «Своя» из акцента и основы. Все значения — CSS-переменные темы. */
export function customVars(look: Look): Record<string, string> {
  const [h, sRaw] = hexToHsl(look.accent);
  const [, , lRaw] = hexToHsl(look.accent);
  const dark = look.base === "dark";
  const neutral = sRaw < 8; // серый акцент: фон не подкрашиваем
  const bgS = look.tint && !neutral ? (dark ? 16 : 18) : neutral ? 3 : 4;
  // акцент часто используется как цвет текста: держим его в читаемом диапазоне яркости
  const aL = dark ? Math.max(lRaw, 62) : Math.min(lRaw, 38);
  const aS = Math.min(sRaw, 85);
  const accent = hsl(h, aS, aL);
  const deep = hsl(h, aS, dark ? aL + 12 : aL - 9);
  const L = dark
    ? { bg: 9, panel: 12.5, panel2: 16, hover: 18, line: 22, ink: 93, soft: 72, faint: 60 }
    : { bg: 94, panel: 97, panel2: 99.5, hover: 90, line: 84, ink: 11, soft: 33, faint: 40 };
  const inkS = look.tint && !neutral ? 14 : 4;
  return {
    "--bg": hsl(h, bgS, L.bg),
    "--panel": hsl(h, bgS, L.panel),
    "--panel-2": hsl(h, bgS, L.panel2),
    "--ink": hsl(h, inkS, L.ink),
    "--ink-soft": hsl(h, inkS, L.soft),
    "--ink-faint": hsl(h, inkS, L.faint),
    "--line": hsl(h, bgS, L.line),
    "--hover": hsl(h, bgS, L.hover),
    "--accent": accent,
    "--accent-deep": deep,
    "--accent-ink": inkOn(aL),
    "--accent-soft": `color-mix(in srgb, ${accent} ${dark ? 22 : 14}%, ${hsl(h, bgS, L.panel)})`,
    "--danger": dark ? "#e5655c" : "#c0453c",
    "--danger-soft": dark ? "#3a2321" : "#f2dcd6",
    "--dot": dark ? "rgba(255,255,255,0.07)" : "rgba(20,20,20,0.1)",
    "--glow1": `color-mix(in srgb, ${accent} ${dark ? 13 : 16}%, transparent)`,
    "--glow2": `color-mix(in srgb, ${deep} 9%, transparent)`,
    "--shadow": dark ? "0 24px 50px -20px rgba(0,0,0,0.65)" : "0 22px 48px -20px rgba(20,20,20,0.3)",
    "--shadow-sm": dark ? "0 12px 26px -14px rgba(0,0,0,0.6)" : "0 10px 24px -14px rgba(20,20,20,0.26)",
  };
}

/** Цвета для кружков-образцов в списке тем. */
export function customSwatch(look: Look) {
  const v = customVars(look);
  return { bg: v["--bg"], panel: v["--panel"], accent: v["--accent"] };
}

let appliedKeys: string[] = [];

/** Применяет тему и оформление к <html>. */
export function applyLook(theme: string, look: Look) {
  const el = document.documentElement;
  el.setAttribute("data-theme", theme);
  const set = (name: string, on: boolean, val: string) => (on ? el.setAttribute(name, val) : el.removeAttribute(name));
  set("data-radius", look.radius !== "auto", look.radius);
  set("data-density", look.density !== "normal", look.density);
  set("data-ui-font", look.uiFont !== "auto", look.uiFont);
  set("data-flat", look.flat, "1");
  for (const k of appliedKeys) el.style.removeProperty(k);
  appliedKeys = [];
  if (theme === "custom") {
    const vars = customVars(look);
    for (const [k, val] of Object.entries(vars)) el.style.setProperty(k, val);
    appliedKeys = Object.keys(vars);
    el.style.colorScheme = look.base;
  } else {
    el.style.removeProperty("color-scheme");
  }
}
