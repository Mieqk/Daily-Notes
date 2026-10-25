import type { Lang } from "./i18n";
import { localeOf } from "./i18n";

/** Формы слова: славянские [1, 2–4, 5+], остальные [1, много]. */
const FORMS: Record<Lang, Record<"word" | "char" | "day", string[]>> = {
  ru: { word: ["слово", "слова", "слов"], char: ["символ", "символа", "символов"], day: ["день", "дня", "дней"] },
  be: { word: ["слова", "словы", "слоў"], char: ["сімвал", "сімвалы", "сімвалаў"], day: ["дзень", "дні", "дзён"] },
  uk: { word: ["слово", "слова", "слів"], char: ["символ", "символи", "символів"], day: ["день", "дні", "днів"] },
  en: { word: ["word", "words"], char: ["char", "chars"], day: ["day", "days"] },
  de: { word: ["Wort", "Wörter"], char: ["Zeichen", "Zeichen"], day: ["Tag", "Tage"] },
  fr: { word: ["mot", "mots"], char: ["caractère", "caractères"], day: ["jour", "jours"] },
  es: { word: ["palabra", "palabras"], char: ["carácter", "caracteres"], day: ["día", "días"] },
};

export function plural(lang: Lang, n: number, what: "word" | "char" | "day"): string {
  const forms = (FORMS[lang] ?? FORMS.en)[what];
  const cat = new Intl.PluralRules(localeOf(lang)).select(n);
  if (forms.length === 3) return forms[cat === "one" ? 0 : cat === "few" ? 1 : 2];
  return forms[cat === "one" ? 0 : 1];
}
