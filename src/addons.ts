/** Шаблоны дня и плагины-виджеты от пользователей. Только данные, никакого кода: всё проверяется перед применением. */

export interface DayTemplate {
  id: string;
  name: string;
  emoji: string;
  tasks: string[];
  prompt: string;
}

export type PluginKind = "counter" | "number" | "scale" | "check" | "checklist" | "question";
export const PLUGIN_KINDS: PluginKind[] = ["counter", "number", "scale", "check", "checklist", "question"];

export interface Plugin {
  id: string;
  name: string;
  emoji: string;
  kind: PluginKind;
  /** Цель в день для счётчика и числа (0 = без цели) */
  goal: number;
  /** Шаг кнопок счётчика */
  step: number;
  /** Подпись единиц: «стак.», «мин», «стр.» */
  unit: string;
  /** Пункты чек-листа */
  items: string[];
  /** Вопрос для «Свой вопрос» и «Да/нет» */
  question: string;
}

/** Значение плагина за день: число, да/нет, отметки чек-листа или текст ответа. */
export type PluginValue = number | boolean | boolean[] | string;
export type PluginData = Record<string, Record<string, PluginValue>>;

export type Addon = { kind: "template"; item: DayTemplate } | { kind: "plugin"; item: Plugin };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max) : "");
const line = (v: unknown, max: number) => str(v, max).replace(/[\r\n]+/g, " ").trim();
const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => line(x, max)).filter(Boolean).slice(0, n) : []);
const emoji = (v: unknown, d: string) => [...line(v, 16)].slice(0, 2).join("") || d;
export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
// id должен быть стабильным между рендерами, поэтому без случайности: новый id даёт только withNewId
const id = (v: unknown, name: string) => (typeof v === "string" && /^[\p{L}\p{N}_-]{1,64}$/u.test(v) ? v : `x-${name.slice(0, 40).replace(/[^\p{L}\p{N}]+/gu, "-")}`);

export function sanitizeTemplate(raw: unknown): DayTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = line(r.name, 40);
  if (!name) return null;
  return { id: id(r.id, name), name, emoji: emoji(r.emoji, "📋"), tasks: list(r.tasks, 12, 120), prompt: str(r.prompt, 2000).trim() };
}

export function sanitizePlugin(raw: unknown): Plugin | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = line(r.name, 40);
  const kind = PLUGIN_KINDS.includes(r.kind as PluginKind) ? (r.kind as PluginKind) : null;
  if (!name || !kind) return null;
  return {
    id: id(r.id, name),
    name,
    emoji: emoji(r.emoji, "✨"),
    kind,
    goal: Math.round(num(r.goal, 0, 100000, 0)),
    step: num(r.step, 0.1, 1000, 1),
    unit: line(r.unit, 12),
    items: list(r.items, 12, 80),
    question: line(r.question, 200),
  };
}

export const sanitizeTemplates = (v: unknown) => (Array.isArray(v) ? v.map(sanitizeTemplate).filter((x): x is DayTemplate => x !== null).slice(0, 30) : []);
export const sanitizePlugins = (v: unknown) => (Array.isArray(v) ? v.map(sanitizePlugin).filter((x): x is Plugin => x !== null).slice(0, 30) : []);

export function sanitizeAddon(raw: unknown): Addon | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind === "template") { const item = sanitizeTemplate(r.item); return item && { kind: "template", item }; }
  if (r.kind === "plugin") { const item = sanitizePlugin(r.item); return item && { kind: "plugin", item }; }
  return null;
}

const PREFIX = "DNADDON1:";
const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

export const encodeAddon = (a: Addon) => PREFIX + toB64(JSON.stringify({ v: 1, ...a }));

/** Понимает код DNADDON1:… и содержимое .json-файла. */
export function decodeAddon(text: string): Addon | null {
  const s = text.trim();
  if (s.length > 20000) return null;
  try {
    if (s.startsWith(PREFIX)) return sanitizeAddon(JSON.parse(fromB64(s.slice(PREFIX.length).replace(/\s+/g, ""))));
    if (s.startsWith("{")) return sanitizeAddon(JSON.parse(s));
  } catch {
    return null;
  }
  return null;
}

export function downloadAddon(a: Addon) {
  const slug = a.item.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || a.kind;
  const blob = new Blob([JSON.stringify({ v: 1, ...a }, null, 2)], { type: "application/json" });
  const el = document.createElement("a");
  el.href = URL.createObjectURL(blob);
  el.download = `${slug}.dn${a.kind}.json`;
  el.click();
  setTimeout(() => URL.revokeObjectURL(el.href), 1000);
}

/** Ставит копию с новым id, чтобы чужое не перезаписало своё. */
export const withNewId = <T extends { id: string }>(x: T): T => ({ ...x, id: newId() });

export const blankPlugin = (kind: PluginKind): Plugin => ({ id: newId(), name: "", emoji: "✨", kind, goal: 0, step: 1, unit: "", items: [], question: "" });

/** Значение плагина пустое (не считать день отмеченным). */
export function isEmptyValue(v: PluginValue | undefined): boolean {
  if (v === undefined || v === "" || v === 0 || v === false) return true;
  return Array.isArray(v) && !v.some(Boolean);
}

const P = (p: Partial<Plugin> & Pick<Plugin, "name" | "emoji" | "kind">): Plugin => ({ ...blankPlugin(p.kind), ...p, id: `starter-${p.name}` });

/** Встроенные примеры плагинов на русском и английском. */
export const STARTER_PLUGINS: Record<"ru" | "en", Plugin[]> = {
  ru: [
    P({ name: "Вода", emoji: "💧", kind: "counter", goal: 8, unit: "стак." }),
    P({ name: "Энергия", emoji: "⚡", kind: "scale" }),
    P({ name: "Медитация", emoji: "🧘", kind: "number", goal: 10, unit: "мин" }),
    P({ name: "Чтение", emoji: "📚", kind: "number", goal: 20, unit: "стр." }),
    P({ name: "Витамины", emoji: "💊", kind: "checklist", items: ["Витамин D", "Омега-3", "Магний"] }),
    P({ name: "Без сахара", emoji: "🍬", kind: "check", question: "Обошёлся без сладкого?" }),
    P({ name: "Маленькая радость", emoji: "🌼", kind: "question", question: "Что сегодня порадовало?" }),
  ],
  en: [
    P({ name: "Water", emoji: "💧", kind: "counter", goal: 8, unit: "glasses" }),
    P({ name: "Energy", emoji: "⚡", kind: "scale" }),
    P({ name: "Meditation", emoji: "🧘", kind: "number", goal: 10, unit: "min" }),
    P({ name: "Reading", emoji: "📚", kind: "number", goal: 20, unit: "pages" }),
    P({ name: "Vitamins", emoji: "💊", kind: "checklist", items: ["Vitamin D", "Omega-3", "Magnesium"] }),
    P({ name: "No sugar", emoji: "🍬", kind: "check", question: "Skipped sweets today?" }),
    P({ name: "Small joy", emoji: "🌼", kind: "question", question: "What made you smile today?" }),
  ],
};

const T = (t: Omit<DayTemplate, "id">): DayTemplate => ({ ...t, id: `starter-${t.name}` });

export const STARTER_TEMPLATES: Record<"ru" | "en", DayTemplate[]> = {
  ru: [
    T({ name: "Спорт", emoji: "🏃", tasks: ["Разминка 10 минут", "Основная тренировка", "Растяжка", "2 литра воды"], prompt: "Тренировка: \n\nКак ощущало себя тело: \n\nЧто улучшить в следующий раз: " }),
    T({ name: "Учёба", emoji: "🎓", tasks: ["Повторить вчерашнее", "2 помодоро новой темы", "Сделать конспект", "Объяснить тему своими словами"], prompt: "Что я сегодня понял(а): \n\nЧто осталось непонятным: " }),
    T({ name: "Цифровой детокс", emoji: "📵", tasks: ["Телефон в другой комнате до обеда", "Прогулка без наушников", "Бумажная книга"], prompt: "Без экранов я заметил(а): \n\nЧего не хватало: " }),
    T({ name: "Итоги недели", emoji: "🗓️", tasks: ["Разобрать заметки недели", "Отметить 3 победы", "Наметить 3 цели"], prompt: "Главное за неделю: \n\nЧему научился(ась): \n\nФокус на следующую неделю: " }),
  ],
  en: [
    T({ name: "Sport", emoji: "🏃", tasks: ["10-minute warm-up", "Main workout", "Stretching", "2 liters of water"], prompt: "Workout: \n\nHow my body felt: \n\nWhat to improve next time: " }),
    T({ name: "Study", emoji: "🎓", tasks: ["Review yesterday", "2 pomodoros on the new topic", "Write a summary", "Explain it in my own words"], prompt: "What I understood today: \n\nWhat is still unclear: " }),
    T({ name: "Digital detox", emoji: "📵", tasks: ["Phone in another room till noon", "Walk without headphones", "A paper book"], prompt: "Without screens I noticed: \n\nWhat I missed: " }),
    T({ name: "Weekly review", emoji: "🗓️", tasks: ["Go through this week's notes", "Write down 3 wins", "Set 3 goals"], prompt: "The main thing this week: \n\nWhat I learned: \n\nFocus for next week: " }),
  ],
};

export const starterLang = (lang: string): "ru" | "en" => (["ru", "be", "uk"].includes(lang) ? "ru" : "en");
