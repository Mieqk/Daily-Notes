/** Настройки внешнего вида поверх выбранной темы: форма, плотность, шрифт, свои цвета. */
export type Radius = "auto" | "sharp" | "soft" | "round";
export type Density = "compact" | "normal" | "airy";
export type UiFont = "auto" | "golos" | "system" | "serif" | "mono";
export type Base = "light" | "dark";
export type HeadFont = "auto" | "unbounded" | "golos" | "system" | "serif" | "mono";
export type Border = "normal" | "bold" | "none";
export type Shadow = "auto" | "none" | "hard" | "deep";

/** Цвета темы «Своя», которые можно задать вручную, каждый по отдельности. */
export const COLOR_TOKENS = ["bg", "panel", "panel-2", "hover", "line", "ink", "ink-soft", "ink-faint", "accent", "accent-deep", "accent-ink", "accent-soft", "danger"] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

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
  /** Свой цвет фона для темы «Своя», #rrggbb или "" (из акцента) */
  bgColor: string;
  /** Свой цвет текста для темы «Своя», #rrggbb или "" */
  inkColor: string;
  /** Подписи без КАПСА */
  noCaps: boolean;
  /** Без анимаций и дрейфующих пятен */
  calm: boolean;
  /** Усиленный контраст текста */
  contrast: boolean;
  /** Шрифт заголовков, отдельно от интерфейса */
  headFont: HeadFont;
  /** Толщина рамок у карточек и полей */
  border: Border;
  /** Тени: как в теме, без теней, жёсткие (смещённые) или глубокие */
  shadow: Shadow;
  /** Ручные цвета отдельных переменных темы «Своя», #rrggbb */
  colors: Partial<Record<ColorToken, string>>;
}

export const DEFAULT_LOOK: Look = {
  base: "light",
  accent: "#3d6b8f",
  tint: false,
  radius: "auto",
  density: "normal",
  uiFont: "auto",
  flat: false,
  bgColor: "",
  inkColor: "",
  noCaps: false,
  calm: false,
  contrast: false,
  headFont: "auto",
  border: "normal",
  shadow: "auto",
  colors: {},
};

export const ACCENT_PRESETS = ["#3d6b8f", "#226b52", "#b5651d", "#c0453c", "#6a55c8", "#c2477a", "#2f2f2c"];

const RADII: Radius[] = ["auto", "sharp", "soft", "round"];
const DENSITIES: Density[] = ["compact", "normal", "airy"];
const FONTS: UiFont[] = ["auto", "golos", "system", "serif", "mono"];
const HEAD_FONTS: HeadFont[] = ["auto", "unbounded", "golos", "system", "serif", "mono"];
const BORDERS: Border[] = ["normal", "bold", "none"];
const SHADOWS: Shadow[] = ["auto", "none", "hard", "deep"];

const hexOrEmpty = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : "");

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
    bgColor: hexOrEmpty(r.bgColor),
    inkColor: hexOrEmpty(r.inkColor),
    noCaps: r.noCaps === true,
    calm: r.calm === true,
    contrast: r.contrast === true,
    headFont: HEAD_FONTS.includes(r.headFont as HeadFont) ? (r.headFont as HeadFont) : d.headFont,
    border: BORDERS.includes(r.border as Border) ? (r.border as Border) : d.border,
    shadow: SHADOWS.includes(r.shadow as Shadow) ? (r.shadow as Shadow) : d.shadow,
    colors: sanitizeColors(r.colors),
  };
}

function sanitizeColors(raw: unknown): Look["colors"] {
  const out: Look["colors"] = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of COLOR_TOKENS) {
    const v = hexOrEmpty((raw as Record<string, unknown>)[k]);
    if (v) out[k] = v;
  }
  return out;
}

export function hexToHsl(hex: string): [number, number, number] {
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
  const accentHex = look.colors.accent || look.accent;
  const [h, sRaw] = hexToHsl(accentHex);
  const [, , lRaw] = hexToHsl(accentHex);
  const ownBg = look.colors.bg || look.bgColor;
  const own = ownBg ? hexToHsl(ownBg) : null;
  const dark = own ? own[2] < 50 : look.base === "dark";
  const neutral = sRaw < 8; // серый акцент: фон не подкрашиваем
  const bgS = own ? Math.min(own[1], 45) : look.tint && !neutral ? (dark ? 16 : 18) : neutral ? 3 : 4;
  const bgH = own ? own[0] : h;
  // акцент часто используется как цвет текста: держим его в читаемом диапазоне яркости
  const aL = dark ? Math.max(lRaw, 62) : Math.min(lRaw, 38);
  const aS = Math.min(sRaw, 85);
  const accent = hsl(h, aS, aL);
  const deep = hsl(h, aS, dark ? aL + 12 : aL - 9);
  const L = dark
    ? { bg: 9, panel: 12.5, panel2: 16, hover: 18, line: 22, ink: 93, soft: 72, faint: 60 }
    : { bg: 94, panel: 97, panel2: 99.5, hover: 90, line: 84, ink: 11, soft: 33, faint: 40 };
  if (own) {
    const b = Math.min(Math.max(own[2], dark ? 3 : 80), dark ? 30 : 99);
    const up = (n: number) => Math.min(Math.max(b + n, 0), 100);
    Object.assign(L, dark
      ? { bg: b, panel: up(3.5), panel2: up(7), hover: up(9), line: up(13) }
      : { bg: b, panel: up(3), panel2: up(5.5), hover: up(-4), line: up(-10) });
  }
  const inkS = look.tint && !neutral ? 14 : 4;
  const bgCss = hsl(bgH, bgS, L.bg);
  const ink = look.colors.ink || look.inkColor || hsl(h, inkS, L.ink);
  const vars: Record<string, string> = {
    "--bg": bgCss,
    "--panel": hsl(bgH, bgS, L.panel),
    "--panel-2": hsl(bgH, bgS, L.panel2),
    "--ink": ink,
    "--ink-soft": (look.colors.ink || look.inkColor) ? `color-mix(in srgb, ${ink} 78%, ${bgCss})` : hsl(h, inkS, L.soft),
    "--ink-faint": (look.colors.ink || look.inkColor) ? `color-mix(in srgb, ${ink} 62%, ${bgCss})` : hsl(h, inkS, L.faint),
    "--line": hsl(bgH, bgS, L.line),
    "--hover": hsl(bgH, bgS, L.hover),
    "--accent": accent,
    "--accent-deep": deep,
    "--accent-ink": inkOn(look.colors.accent ? lRaw : aL),
    "--accent-soft": `color-mix(in srgb, ${accent} ${dark ? 22 : 14}%, ${hsl(bgH, bgS, L.panel)})`,
    "--danger": dark ? "#e5655c" : "#c0453c",
    "--danger-soft": dark ? "#3a2321" : "#f2dcd6",
    "--dot": dark ? "rgba(255,255,255,0.07)" : "rgba(20,20,20,0.1)",
    "--glow1": `color-mix(in srgb, ${accent} ${dark ? 13 : 16}%, transparent)`,
    "--glow2": `color-mix(in srgb, ${deep} 9%, transparent)`,
    "--shadow": dark ? "0 24px 50px -20px rgba(0,0,0,0.65)" : "0 22px 48px -20px rgba(20,20,20,0.3)",
    "--shadow-sm": dark ? "0 12px 26px -14px rgba(0,0,0,0.6)" : "0 10px 24px -14px rgba(20,20,20,0.26)",
  };
  // ручные цвета побеждают всё рассчитанное
  for (const [k, v] of Object.entries(look.colors)) if (v) vars[`--${k}`] = v;
  return vars;
}

/** Тёмная ли получилась тема «Своя» (для color-scheme и образцов). */
export function isDarkLook(look: Look): boolean {
  const bg = look.colors.bg || look.bgColor;
  return bg ? hexToHsl(bg)[2] < 50 : look.base === "dark";
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
  set("data-caps", look.noCaps, "off");
  set("data-calm", look.calm, "1");
  set("data-contrast", look.contrast, "high");
  set("data-head-font", look.headFont !== "auto", look.headFont);
  set("data-border", look.border !== "normal", look.border);
  set("data-shadow", look.shadow !== "auto", look.shadow);
  for (const k of appliedKeys) el.style.removeProperty(k);
  appliedKeys = [];
  if (theme === "custom") {
    const vars = customVars(look);
    for (const [k, val] of Object.entries(vars)) el.style.setProperty(k, val);
    appliedKeys = Object.keys(vars);
    el.style.colorScheme = isDarkLook(look) ? "dark" : "light";
  } else {
    el.style.removeProperty("color-scheme");
  }
}
