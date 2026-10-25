import { generateText } from "./_gemini.js";

// Приватность: сюда приходят только числовые агрегаты по дням (настроение, сон, задачи, число слов).
// Текстов записей, дат, имён и идентификаторов нет — и сервер отбрасывает всё, кроме чисел.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map();

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return list.length > MAX_PER_WINDOW;
}

const LANG_NAMES = { ru: "Russian", en: "English", be: "Belarusian", uk: "Ukrainian", de: "German", fr: "French", es: "Spanish" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const num = (v, min, max, digits = 1) => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const f = 10 ** digits;
  return Math.round(Math.max(min, Math.min(max, v)) * f) / f;
};

function sanitizeDays(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 31).map((d, i) => ({
    day: i + 1,
    weekday: WEEKDAYS[Math.max(0, Math.min(6, Math.floor(Number(d?.wd) || 0)))],
    mood: num(d?.mood, 0, 4, 0),
    sleepHours: num(d?.sleepH, 0, 24),
    sleepQuality: num(d?.sleepQ, 1, 5, 0),
    tasksDone: num(d?.done, 0, 200, 0),
    tasksTotal: num(d?.total, 0, 200, 0),
    wordsWritten: num(d?.words, 0, 100000, 0),
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (tooMany(ip)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "too many requests" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not configured", detail: "GEMINI_API_KEY is not set on the server" });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const lang = LANG_NAMES[body.lang] ? body.lang : "en";
  const days = sanitizeDays(body.days);
  const period = days.length > 10 ? "month" : "week";
  const filled = days.filter((d) => d.mood !== null || d.sleepHours !== null || d.tasksTotal || d.wordsWritten);
  if (filled.length < 3) return res.status(400).json({ error: "not enough data" });

  const prompt =
    `You are a kind, careful wellbeing coach inside a personal diary app. Below are anonymous daily numbers for the user's last ${period} (oldest day first). ` +
    `mood: 0 = rough … 4 = great; sleepQuality: 1–5; null means no data. You never see diary text.\n` +
    `Write 3 or 4 short insights (one sentence each) about patterns you can actually see in these numbers: mood trend, link between sleep and mood, tasks and mood, best and worst weekdays. ` +
    `Add one gentle, practical suggestion as the last line. Do not diagnose, do not give medical advice, do not invent data, and say so briefly if there is too little data for a claim. ` +
    `Reply in ${LANG_NAMES[lang]}, one insight per line, each starting with "- ", no intro, no headings.\n` +
    `Data (JSON): ${JSON.stringify(days)}`;

  const diag = [];
  // без отключения размышлений новые модели тратят лимит токенов на «мысли» и отвечают пусто или обрывком;
  // функция живёт 60 секунд (vercel.json), поэтому на все попытки не больше 45
  const out = await generateText(key, prompt, { temperature: 0.6, maxOutputTokens: 1024 }, diag, {
    timeoutMs: 15_000,
    deadlineMs: 45_000,
    thinking: [{ thinkingBudget: 0 }, { thinkingLevel: "minimal" }, { thinkingLevel: "low" }],
  });
  if (!out) return res.status(500).json({ error: "ai failed", detail: diag.join(" | ").slice(0, 400) });

  const insights = out.text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!insights.length) return res.status(500).json({ error: "ai failed", detail: `${out.model}: empty reply` });

  res.setHeader("Cache-Control", "no-store");
  return res.json({ insights, model: out.model });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
