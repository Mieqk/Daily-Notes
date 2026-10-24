import { generateText } from "./_gemini.js";

// Чат-помощник (тренер или диетолог). Приватность: приходят только последние реплики диалога и короткая сводка
// за сегодня, которую собирает клиент (ккал или упражнения). Записей дневника, имён и идентификаторов нет.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
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

const num = (v, min, max, digits = 0) => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const f = 10 ** digits;
  return Math.round(Math.max(min, Math.min(max, n)) * f) / f;
};
const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function parseReply(text, mode) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let obj;
  try {
    obj = JSON.parse(m[0]);
  } catch {
    return null;
  }
  const reply = clean(obj?.reply, 1500);
  if (!reply) return null;
  const raw = Array.isArray(obj?.items) ? obj.items.slice(0, 12) : [];
  const items = raw
    .map((x) =>
      mode === "food"
        ? { name: clean(x?.name, 60), grams: num(x?.grams, 1, 5000), kcal: num(x?.kcal, 0, 10000), protein: num(x?.protein, 0, 1000, 1), fat: num(x?.fat, 0, 1000, 1), carbs: num(x?.carbs, 0, 1000, 1) }
        : { name: clean(x?.name, 60), sets: num(x?.sets, 1, 10), reps: num(x?.reps, 1, 100), kg: num(x?.kg ?? 0, 0, 500) ?? 0 },
    )
    .filter((x) => (mode === "food" ? x.name && x.grams && x.kcal !== null && x.protein !== null && x.fat !== null && x.carbs !== null : x.name && x.sets && x.reps));
  return { reply, items };
}

const SCHEMAS = {
  food: {
    type: "OBJECT",
    properties: {
      reply: { type: "STRING" },
      items: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, grams: { type: "NUMBER" }, kcal: { type: "NUMBER" }, protein: { type: "NUMBER" }, fat: { type: "NUMBER" }, carbs: { type: "NUMBER" } }, required: ["name", "grams", "kcal", "protein", "fat", "carbs"] } },
    },
    required: ["reply"],
  },
  workout: {
    type: "OBJECT",
    properties: {
      reply: { type: "STRING" },
      items: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, sets: { type: "INTEGER" }, reps: { type: "INTEGER" }, kg: { type: "INTEGER" } }, required: ["name", "sets", "reps"] } },
    },
    required: ["reply"],
  },
};

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
  const mode = body.mode === "food" ? "food" : "workout";
  const context = clean(body.context, 900);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-14)
    .map((m) => ({ role: m?.role === "assistant" ? "Assistant" : "User", text: clean(m?.text, 600) }))
    .filter((m) => m.text);
  if (!messages.length || messages[messages.length - 1].role !== "User") return res.status(400).json({ error: "empty" });

  const persona =
    mode === "food"
      ? "You are a friendly, practical nutrition assistant inside a food-diary app. You help the user eat in line with their goal: you estimate calories and macros, suggest what to eat to hit their targets, and answer food questions."
      : "You are a friendly, practical personal trainer inside a workout-log app. You build workouts, explain technique, suggest progression and answer training questions.";
  const itemsRule =
    mode === "food"
      ? 'When the user says what they ate or asks you to calculate foods, or you suggest a meal, put each food in "items" with name, grams, and kcal/protein/fat/carbs for the whole portion (not per 100 g). Otherwise leave "items" empty.'
      : 'When you propose a workout or exercises to do, put them in "items" (4 to 8 exercises, in order) with name, sets, reps and kg (use 0 for kg: the user fills in weights; for timed exercises use seconds as reps). Otherwise leave "items" empty.';
  const prompt =
    `${persona} Talk like a helpful human coach: warm, direct, short (usually 2 to 5 sentences), no headings or markdown. Ask one clarifying question when you really need it (goal, level, equipment, time, injuries). ` +
    `Do not diagnose or give medical advice; for pain, injury or health conditions suggest seeing a professional. Never invent facts about the user. Always reply in ${LANG_NAMES[lang]}.\n` +
    `${itemsRule}\n` +
    `Reply with ONLY a JSON object {"reply": string, "items": array}.\n` +
    (context ? `Today's summary from the app: ${context}\n` : "") +
    `Conversation so far:\n${messages.map((m) => `${m.role}: ${m.text}`).join("\n")}\nAssistant:`;

  const diag = [];
  const out = await generateText(key, prompt, {
    temperature: 0.6,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    responseSchema: SCHEMAS[mode],
  }, diag);
  if (!out) return res.status(500).json({ error: "ai failed", detail: diag.join(" | ").slice(0, 400) });

  const parsed = parseReply(out.text, mode);
  if (!parsed) {
    console.error("coach: unparseable model reply", out.model, out.text.slice(0, 300));
    return res.status(422).json({ error: "bad reply", detail: `${out.model}: ${out.text.slice(0, 120)}` });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.json({ ...parsed, model: out.model });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
