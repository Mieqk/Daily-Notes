import { generateText } from "./_gemini.js";

// Приватность: приходит только короткая фраза с пожеланием к тренировке, которую пользователь сам ввёл
// («грудь и трицепс, 45 минут, гантели»). Записи дневника и личные данные не передаются.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
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

// Модель иногда отвечает строкой вроде "8-12" или "30 сек": берём первое число
const num = (v, min, max) => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(Math.max(min, Math.min(max, n)));
};

function parseItems(text) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr;
  try {
    arr = JSON.parse(m[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 12)
    .map((x) => ({
      name: String(x?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
      sets: num(x?.sets, 1, 10),
      reps: num(x?.reps, 1, 100),
      kg: num(x?.kg ?? 0, 0, 500) ?? 0,
    }))
    .filter((x) => x.name && x.sets && x.reps);
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
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const lang = LANG_NAMES[body.lang] ? body.lang : "en";
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  if (text.length < 2) return res.status(400).json({ error: "empty" });

  const prompt =
    `You are a careful strength and fitness coach inside a workout log app. Build one workout from the user's request (muscle groups, time, equipment, level). ` +
    `Pick 4 to 8 exercises that fit the request and available equipment, in a sensible order. Keep it safe and beginner-friendly unless the user says otherwise; do not give medical advice. ` +
    `Reply with ONLY a JSON array, no prose, no code fences. Each element: {"name": string in ${LANG_NAMES[lang]}, "sets": integer, "reps": integer, "kg": 0} ` +
    `(kg is always 0: the user fills in their own weights; for timed exercises like a plank use reps as seconds). If the request is not about training, reply [].\n` +
    `User request: ${JSON.stringify(text)}`;

  const out = await generateText(key, prompt, {
    temperature: 0.5,
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
    responseSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, sets: { type: "INTEGER" }, reps: { type: "INTEGER" }, kg: { type: "INTEGER" } },
        required: ["name", "sets", "reps"],
      },
    },
  });
  if (!out) return res.status(500).json({ error: "ai failed" });

  const items = parseItems(out.text);
  if (!items.length) {
    console.error("workout: unparseable model reply", out.model, out.text.slice(0, 300));
    return res.status(422).json({ error: "nothing recognised" });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.json({ items, model: out.model });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
