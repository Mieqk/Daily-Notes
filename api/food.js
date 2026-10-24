import { generateText } from "./_gemini.js";

// Приватность: сюда приходит только короткая фраза о еде, которую пользователь сам ввёл («курица 150 г, гречка 200 г»).
// Записи дневника, даты, имена и идентификаторы не передаются.
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

const num = (v, min, max, digits = 1) => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const f = 10 ** digits;
  return Math.round(Math.max(min, Math.min(max, n)) * f) / f;
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
      grams: num(x?.grams, 1, 5000, 0),
      kcal: num(x?.kcal, 0, 10000, 0),
      protein: num(x?.protein, 0, 1000),
      fat: num(x?.fat, 0, 1000),
      carbs: num(x?.carbs, 0, 1000),
    }))
    .filter((x) => x.name && x.grams && x.kcal !== null && x.protein !== null && x.fat !== null && x.carbs !== null);
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
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 400) : "";
  if (text.length < 2) return res.status(400).json({ error: "empty" });

  const prompt =
    `You are a nutrition calculator inside a food diary app. The user describes what they ate. ` +
    `Split it into separate foods and estimate the nutrition of the eaten portion of each (use the grams given; if no weight is given, assume a typical portion). ` +
    `Use typical values for cooked/ready-to-eat foods unless the user says raw. ` +
    `Reply with ONLY a JSON array, no prose, no code fences. Each element: {"name": string in ${LANG_NAMES[lang]}, "grams": number, "kcal": number, "protein": number, "fat": number, "carbs": number} ` +
    `where kcal/protein/fat/carbs are for the whole portion (not per 100 g), protein/fat/carbs in grams. ` +
    `If the text is not about food, reply [].\n` +
    `User text: ${JSON.stringify(text)}`;

  const out = await generateText(key, prompt, {
    temperature: 0.2,
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
    responseSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, grams: { type: "NUMBER" }, kcal: { type: "NUMBER" }, protein: { type: "NUMBER" }, fat: { type: "NUMBER" }, carbs: { type: "NUMBER" } },
        required: ["name", "grams", "kcal", "protein", "fat", "carbs"],
      },
    },
  });
  if (!out) return res.status(500).json({ error: "ai failed" });

  const items = parseItems(out.text);
  if (!items.length) {
    console.error("food: unparseable model reply", out.model, out.text.slice(0, 300));
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
