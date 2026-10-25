/** Пакет темы: то, что можно скачать файлом, передать кодом или выложить в галерею. */
import { DEFAULT_LOOK, sanitizeLook } from "./look";
import type { Look } from "./look";
import { THEMES } from "./themes";
import type { ThemeId } from "./themes";

export interface ThemePack {
  v: 1;
  name: string;
  theme: ThemeId;
  look: Look;
}

const PREFIX = "DNTHEME1:";

export const cleanName = (v: unknown, fallback = "") =>
  (typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40) : "") || fallback;

/** Принимает что угодно (чужой файл, код из чата, строку из базы) и возвращает безопасный пакет или null. */
export function sanitizePack(raw: unknown): ThemePack | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!r.look || typeof r.look !== "object") return null;
  const theme = THEMES.some((t) => t.id === r.theme) ? (r.theme as ThemeId) : "custom";
  return { v: 1, name: cleanName(r.name, "Theme"), theme, look: sanitizeLook(r.look) };
}

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

export function encodeTheme(pack: ThemePack): string {
  return PREFIX + toB64(JSON.stringify(pack));
}

/** Понимает и код DNTHEME1:…, и содержимое .json-файла. */
export function decodeTheme(text: string): ThemePack | null {
  const s = text.trim();
  if (s.length > 20000) return null;
  try {
    if (s.startsWith(PREFIX)) return sanitizePack(JSON.parse(fromB64(s.slice(PREFIX.length).replace(/\s+/g, ""))));
    if (s.startsWith("{")) return sanitizePack(JSON.parse(s));
  } catch {
    return null;
  }
  return null;
}

export function downloadTheme(pack: ThemePack) {
  const slug = pack.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "theme";
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}.dntheme.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const L = (p: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...p, colors: { ...p.colors } });

/** Встроенные примеры того, насколько далеко можно уйти от стандартного вида. */
export const STARTER_PACKS: ThemePack[] = [
  {
    v: 1, name: "Brutal", theme: "custom",
    look: L({ accent: "#ff5a1f", radius: "sharp", border: "bold", shadow: "hard", headFont: "mono", uiFont: "system", flat: true,
      colors: { bg: "#fff6d6", panel: "#ffffff", "panel-2": "#ffffff", ink: "#111111", line: "#111111", accent: "#ff5a1f", "accent-ink": "#111111", "accent-soft": "#ffd8c2" } }),
  },
  {
    v: 1, name: "Terminal", theme: "custom",
    look: L({ base: "dark", accent: "#39ff88", radius: "sharp", uiFont: "mono", headFont: "mono", density: "compact", border: "normal", shadow: "none", noCaps: true, flat: true,
      colors: { bg: "#050806", panel: "#0b120d", "panel-2": "#0f1912", hover: "#132117", line: "#1d3a25", ink: "#b8ffcf", "ink-soft": "#6fd394", "ink-faint": "#4a9a68", accent: "#39ff88", "accent-ink": "#03140a" } }),
  },
  {
    v: 1, name: "Newspaper", theme: "custom",
    look: L({ accent: "#8a1c1c", radius: "sharp", uiFont: "serif", headFont: "serif", border: "normal", shadow: "none", noCaps: true, flat: true, density: "airy",
      colors: { bg: "#f3efe4", panel: "#f8f5ec", "panel-2": "#fbf9f3", line: "#2a2722", ink: "#1a1814", accent: "#8a1c1c" } }),
  },
  {
    v: 1, name: "Candy", theme: "custom",
    look: L({ accent: "#e8459b", radius: "round", density: "airy", headFont: "unbounded", uiFont: "golos", shadow: "deep", tint: true,
      colors: { bg: "#ffe9f4", panel: "#fff7fb", "panel-2": "#ffffff", line: "#ffc4e1", accent: "#e8459b", "accent-ink": "#ffffff", "accent-soft": "#ffd3ea" } }),
  },
];
