import type { Lang } from "./i18n";

export type ThemeId = "day" | "night" | "ocean";

export interface ThemeMeta {
  id: ThemeId;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
  swatch: { bg: string; panel: string; accent: string; ink: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "day",
    name: { ru: "Светлая", en: "Light" },
    desc: { ru: "бумага и зелень", en: "paper & green" },
    swatch: { bg: "#edefe8", panel: "#f6f7f2", accent: "#226b52", ink: "#1b231e" },
  },
  {
    id: "night",
    name: { ru: "Ночная", en: "Night" },
    desc: { ru: "графит и янтарь", en: "graphite & amber" },
    swatch: { bg: "#12171b", panel: "#1a2126", accent: "#e3b455", ink: "#e7ede6" },
  },
  {
    id: "ocean",
    name: { ru: "Океан", en: "Ocean" },
    desc: { ru: "глубина и бирюза", en: "deep teal" },
    swatch: { bg: "#0e1720", panel: "#14202b", accent: "#43b3a7", ink: "#dfe9ef" },
  },
];

export const themeMeta = (id: ThemeId): ThemeMeta =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
