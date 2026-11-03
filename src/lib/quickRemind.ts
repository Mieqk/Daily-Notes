import { generateUUID } from "./uuid";

/**
 * Быстрые напоминания: одна строка текста, время берётся из самой фразы («завтра в 9 купить хлеб») или из кнопки.
 * Хранятся только на этом устройстве (ключ dn.quickReminders, входят в JSON-резервную копию).
 */
export interface QuickReminder {
  id: string;
  text: string;
  /** Когда напомнить, мс. */
  at: number;
  /** Уже сработало. */
  done: boolean;
}

export const QUICK_KEY = "dn.quickReminders";
export const QUICK_EVENT = "dn-quick-reminders-changed";
export const MAX_QUICK = 30;
export const MAX_QUICK_TEXT = 140;
/** Сработавшие напоминания остаются в списке столько, потом убираются сами. */
export const DONE_KEEP_MS = 24 * 60 * 60 * 1000;

const MIN = 60_000;
const HOUR = 60 * MIN;

export interface Parsed {
  /** Текст без слов о времени. */
  text: string;
  /** Время из фразы, мс; null, если во фразе времени нет. */
  at: number | null;
}

const DAYPART_HOUR = { morning: 9, afternoon: 14, evening: 19, night: 22 } as const;
type DayPart = keyof typeof DAYPART_HOUR;

// \b не работает с кириллицей, поэтому границы слов задаём сами
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const rx = (src: string) => new RegExp(src, "iu");

const WORDS = {
  today: "сегодня|сёння|сьогодні|today|heute|aujourd['’]hui|hoy",
  tomorrow: "завтра|заўтра|tomorrow|morgen|demain|mañana",
  after: "послезавтра|паслязаўтра|післязавтра|übermorgen|après-demain|pasado mañana",
  morning: "утром|зранку|уранці|раніцай|morning|morgens|früh|matin|por la mañana|de la mañana",
  afternoon: "днём|днем|вдень|удень|afternoon|nachmittags|après-midi|por la tarde|de la tarde",
  evening: "вечером|ввечері|вечарам|evening|abends|soir|ce soir|esta tarde",
  night: "ночью|вночі|уначы|tonight|nachts|cette nuit|esta noche|por la noche|de la noche",
};
const AM = "утра|ранку|ранку|раніцы|am|a\\.m\\.|morgens|du matin";
const PM = "вечера|дня|вечора|вечара|pm|p\\.m\\.|abends|du soir|de l['’]après-midi";
const NIGHT_W = "ночи|ночі|ночы|nachts|de la noche";

const PREP = "(?:в|во|ў|к|о|об|at|around|um|gegen|à|vers|a las)";

const reRelative = rx(`${B}(?:через|праз|in|dans|en)\\s+(?:(\\d{1,3})|(полчаса|півгодини|паўгадзіны|half an hour|eine halbe stunde|une demi-heure|media hora)|(час|годину|гадзіну|an hour|eine stunde|une heure|una hora))\\s*(мин\\p{L}*|хв\\p{L}*|хвіл\\p{L}*|min\\p{L}*|m|ч\\p{L}*|час\\p{L}*|год\\p{L}*|гадз\\p{L}*|h|hours?|hrs?|stunden?|std|heures?|horas?)?${E}`);
const reDay = (names: string) => rx(`${B}(?:${names})${E}`);
// группы: 1 — часы, 2 — минуты, 3 — «утра/вечера/pm…»
const SFX = `(${AM}|${PM}|${NIGHT_W})`;
const reClockStrict = rx(`(?:${B}${PREP}\\s*)?${B}(\\d{1,2})[:h](\\d{2})\\s*${SFX}?${E}`);
const reClockPrep = rx(`${B}${PREP}\\s*(\\d{1,2})(?:[:.h](\\d{2}))?\\s*${SFX}?${E}`);
const reClockSuffix = rx(`${B}(\\d{1,2})()\\s*${SFX}${E}`);
const rePart = (names: string) => rx(`${B}(?:${names})${E}`);

function cut(s: string, m: RegExpMatchArray): string {
  return `${s.slice(0, m.index)} ${s.slice(m.index! + m[0].length)}`;
}

function cleanText(s: string): string {
  return s
    .replace(/^\s*(?:напомни(?:ть)?(?:\s+мне)?|нагадай(?:те)?(?:\s+мені)?|remind\s+me(?:\s+to)?|erinnere\s+mich(?:\s+daran)?|rappelle-moi(?:\s+de)?|recuérdame(?:\s+que)?)\s+/iu, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "")
    .replace(/\s+(?:в|на|к|at|um|à|a|in|to|через|за)$/iu, "")
    .replace(/^(?:to|что|щоб|чтобы)\s+/iu, "")
    .trim();
}

function atHour(base: Date, dayOffset: number, h: number, m: number): number {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, h, m, 0, 0);
  return d.getTime();
}

/** Достаёт время из фразы. Понимает «через 15 минут», «завтра», «в 9», «в 21:30», «вечером», «at 9pm» и их аналоги на всех языках приложения. */
export function parseQuick(input: string, nowMs: number): Parsed {
  const now = new Date(nowMs);
  let s = input;

  // 1. «через 15 минут / полчаса / час»
  const rel = s.match(reRelative);
  if (rel) {
    let minutes: number | null = null;
    if (rel[2]) minutes = 30;
    else if (rel[3]) minutes = 60;
    else if (rel[1]) {
      const n = Number(rel[1]);
      const unit = (rel[4] ?? "").toLowerCase();
      const isHour = /^(ч|час|год|гадз|h|hour|hr|stunde|std|heure|hora)/.test(unit);
      const isMin = unit === "" || /^(мин|хв|хвіл|min|m$)/.test(unit);
      if (isHour) minutes = n * 60;
      else if (isMin) minutes = n;
    }
    if (minutes !== null && minutes > 0 && minutes <= 7 * 24 * 60) {
      return { text: cleanText(cut(s, rel)), at: nowMs + minutes * MIN };
    }
  }

  // 2. день
  let dayOffset: number | null = null;
  for (const [offset, names] of [[2, WORDS.after], [1, WORDS.tomorrow], [0, WORDS.today]] as const) {
    const m = s.match(reDay(names));
    if (m) { dayOffset = offset; s = cut(s, m); break; }
  }

  // 3. часть суток
  let part: DayPart | null = null;
  for (const p of ["morning", "afternoon", "evening", "night"] as const) {
    const m = s.match(rePart(WORDS[p]));
    if (m) { part = p; s = cut(s, m); break; }
  }

  // 4. точное время. Голое число без предлога («купить 2 хлеба») временем не считается, только «9:30» или «в 9»
  let hour: number | null = null;
  let minute = 0;
  const loose = s.match(reClockStrict) ?? s.match(reClockPrep) ?? s.match(reClockSuffix);
  if (loose) {
    let h = Number(loose[1]);
    const mm = loose[2] ? Number(loose[2]) : 0;
    if (h <= 24 && mm < 60 && !(h === 24 && mm > 0)) {
      const sfx = (loose[3] ?? "").toLowerCase();
      const pm = !!sfx && new RegExp(`^(?:${PM})$`, "iu").test(sfx);
      const am = !!sfx && new RegExp(`^(?:${AM})$`, "iu").test(sfx);
      const nt = !!sfx && new RegExp(`^(?:${NIGHT_W})$`, "iu").test(sfx);
      const pmPart = part === "afternoon" || part === "evening";
      if ((pm || pmPart) && h < 12) h += 12;
      else if (nt && h === 12) h = 0;
      else if ((nt || part === "night") && h >= 6 && h < 12) h += 12;
      else if (am && h === 12) h = 0;
      if (h === 24) h = 0;
      hour = h;
      minute = mm;
      s = cut(s, loose);
    }
  }

  if (hour === null && dayOffset === null && part === null) return { text: cleanText(input), at: null };

  if (hour === null) {
    if (part) { hour = DAYPART_HOUR[part]; minute = 0; }
    else if (dayOffset === 0) {
      // «сегодня» без часа: вечером, а если вечер прошёл, через час
      const evening = atHour(now, 0, DAYPART_HOUR.evening, 0);
      return { text: cleanText(s), at: evening > nowMs + 5 * MIN ? evening : nowMs + HOUR };
    } else { hour = 9; minute = 0; }
  }

  let at = atHour(now, dayOffset ?? 0, hour, minute);
  // «в 9», когда сейчас уже позже, значит завтра в 9
  if (dayOffset === null && at <= nowMs) at = atHour(now, 1, hour, minute);
  if (dayOffset === 0 && at <= nowMs) return { text: cleanText(s), at: nowMs + 5 * MIN };
  return { text: cleanText(s), at };
}

export type PresetId = "m15" | "h1" | "evening" | "tomorrow";

/** Кнопки быстрого времени. Вечер показываем, только пока он не наступил. */
export function presets(nowMs: number): { id: PresetId; at: number }[] {
  const now = new Date(nowMs);
  const list: { id: PresetId; at: number }[] = [
    { id: "m15", at: nowMs + 15 * MIN },
    { id: "h1", at: nowMs + HOUR },
  ];
  const evening = atHour(now, 0, DAYPART_HOUR.evening, 0);
  if (evening > nowMs + 90 * MIN) list.push({ id: "evening", at: evening });
  list.push({ id: "tomorrow", at: atHour(now, 1, 9, 0) });
  return list;
}

export const DEFAULT_DELAY_MS = HOUR;

export function newQuick(text: string, at: number): QuickReminder {
  return { id: generateUUID(), text: text.trim().slice(0, MAX_QUICK_TEXT), at, done: false };
}

export function parseQuickList(raw: unknown): QuickReminder[] {
  if (!Array.isArray(raw)) return [];
  const out: QuickReminder[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.text !== "string" || typeof o.at !== "number" || !Number.isFinite(o.at)) continue;
    out.push({ id: o.id, text: o.text.slice(0, MAX_QUICK_TEXT), at: o.at, done: o.done === true });
  }
  return out;
}

export function loadQuick(): QuickReminder[] {
  try {
    const raw = localStorage.getItem(QUICK_KEY);
    return raw ? parseQuickList(JSON.parse(raw)) : [];
  } catch { return []; }
}

export function saveQuick(list: QuickReminder[]) {
  try { localStorage.setItem(QUICK_KEY, JSON.stringify(list)); } catch { /* квота: не страшно */ }
  window.dispatchEvent(new Event(QUICK_EVENT));
}

/** Чистая проверка: что пора показать и обновлённый список (сработавшие помечены, давно сработавшие убраны). */
export function dueQuick(list: QuickReminder[], nowMs: number): { list: QuickReminder[]; fire: QuickReminder[] } {
  const fire: QuickReminder[] = [];
  const next: QuickReminder[] = [];
  for (const r of list) {
    if (!r.done && r.at <= nowMs) { fire.push(r); next.push({ ...r, done: true }); continue; }
    if (r.done && nowMs - r.at > DONE_KEEP_MS) continue;
    next.push(r);
  }
  return { list: next, fire };
}
