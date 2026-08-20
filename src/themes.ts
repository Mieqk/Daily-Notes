import type { Lang } from "./i18n";

export type ThemeId = "day" | "night" | "ocean" | "lavender" | "cherry";

export interface ThemeMeta {
  id: ThemeId;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
  swatch: { bg: string; panel: string; accent: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "day",
    name: { ru: "Светлая", en: "Light" },
    desc: { ru: "бумага и зелень", en: "paper & green" },
    swatch: { bg: "#edefe8", panel: "#f6f7f2", accent: "#226b52" },
  },
  {
    id: "night",
    name: { ru: "Ночная", en: "Night" },
    desc: { ru: "графит и янтарь", en: "graphite & amber" },
    swatch: { bg: "#12171b", panel: "#1a2126", accent: "#e3b455" },
  },
  {
    id: "ocean",
    name: { ru: "Океан", en: "Ocean" },
    desc: { ru: "глубина и бирюза", en: "deep teal" },
    swatch: { bg: "#0e1720", panel: "#14202b", accent: "#43b3a7" },
  },
  {
    id: "lavender",
    name: { ru: "Лаванда", en: "Lavender" },
    desc: { ru: "сирень и чернила", en: "lilac & ink" },
    swatch: { bg: "#eceaf2", panel: "#f4f2f8", accent: "#6a55c8" },
  },
  {
    id: "cherry",
    name: { ru: "Вишня", en: "Cherry" },
    desc: { ru: "уголь и роза", en: "charcoal & rose" },
    swatch: { bg: "#16121a", panel: "#1e1823", accent: "#e0637c" },
  },
];

export const themeMeta = (id: ThemeId): ThemeMeta =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
