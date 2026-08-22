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
    name: { ru: "Светлая", en: "Light", be: "Светлая", uk: "Світла", de: "Hell", fr: "Clair", es: "Claro" },
    desc: { ru: "бумага и зелень", en: "paper & green", be: "папера і зеляніна", uk: "папір і зелень", de: "Papier & Grün", fr: "papier & vert", es: "papel y verde" },
    swatch: { bg: "#edefe8", panel: "#f6f7f2", accent: "#226b52" },
  },
  {
    id: "night",
    name: { ru: "Ночная", en: "Night", be: "Начная", uk: "Нічна", de: "Nacht", fr: "Nuit", es: "Noche" },
    desc: { ru: "графит и янтарь", en: "graphite & amber", be: "графіт і бурштын", uk: "графіт і бурштин", de: "Graphit & Bernstein", fr: "graphite & ambre", es: "grafito y ámbar" },
    swatch: { bg: "#12171b", panel: "#1a2126", accent: "#e3b455" },
  },
  {
    id: "ocean",
    name: { ru: "Океан", en: "Ocean", be: "Акіян", uk: "Океан", de: "Ozean", fr: "Océan", es: "Océano" },
    desc: { ru: "глубина и бирюза", en: "deep teal", be: "глыбіня і бірюза", uk: "глибина і бірюза", de: "Tiefe & Türkis", fr: "profondeur & turquoise", es: "profundidad y turquesa" },
    swatch: { bg: "#0e1720", panel: "#14202b", accent: "#43b3a7" },
  },
  {
    id: "lavender",
    name: { ru: "Лаванда", en: "Lavender", be: "Лаванда", uk: "Лаванда", de: "Lavendel", fr: "Lavande", es: "Lavanda" },
    desc: { ru: "сирень и чернила", en: "lilac & ink", be: "бэз і чарніла", uk: "бузок і чорнило", de: "Flieder & Tinte", fr: "lilas & encre", es: "lila y tinta" },
    swatch: { bg: "#eceaf2", panel: "#f4f2f8", accent: "#6a55c8" },
  },
  {
    id: "cherry",
    name: { ru: "Вишня", en: "Cherry", be: "Вішня", uk: "Вишня", de: "Kirsche", fr: "Cerise", es: "Cereza" },
    desc: { ru: "уголь и роза", en: "charcoal & rose", be: "вугаль і ружа", uk: "вугілля і троянда", de: "Kohle & Rose", fr: "charbon & rose", es: "carbón y rosa" },
    swatch: { bg: "#16121a", panel: "#1e1823", accent: "#e0637c" },
  },
];

export const themeMeta = (id: ThemeId): ThemeMeta =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
