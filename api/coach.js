import { streamText } from "./_gemini.js";

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

const MARK = "###ITEMS";

function sanitizeItems(raw, mode) {
  return (Array.isArray(raw) ? raw.slice(0, 12) : [])
    .map((x) =>
      mode === "food"
        ? { name: clean(x?.name, 60), grams: num(x?.grams, 1, 5000), kcal: num(x?.kcal, 0, 10000), protein: num(x?.protein, 0, 1000, 1), fat: num(x?.fat, 0, 1000, 1), carbs: num(x?.carbs, 0, 1000, 1) }
        : { name: clean(x?.name, 60), sets: num(x?.sets, 1, 10), reps: num(x?.reps, 1, 100), kg: num(x?.kg ?? 0, 0, 500) ?? 0 },
    )
    .filter((x) => (mode === "food" ? x.name && x.grams && x.kcal !== null && x.protein !== null && x.fat !== null && x.carbs !== null : x.name && x.sets && x.reps));
}

const tryJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};

// Ответ модели: сначала текст для человека, затем (если есть что добавить) строка ###ITEMS и JSON-массив.
// На случай, если модель всё же ответила JSON-объектом {reply, items}, разбираем и его.
export function parseReply(text, mode) {
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("```")) {
    const obj = tryJson((t.match(/\{[\s\S]*\}/) || [""])[0]);
    if (obj && typeof obj.reply === "string") return { reply: clean(obj.reply, 1500), items: sanitizeItems(obj.items, mode) };
  }
  const at = t.indexOf(MARK);
  const reply = (at >= 0 ? t.slice(0, at) : t).replace(/```\s*$/, "").trim().slice(0, 1500);
  let items = [];
  if (at >= 0) {
    const arr = (t.slice(at + MARK.length).match(/\[[\s\S]*\]/) || [""])[0];
    items = sanitizeItems(tryJson(arr), mode);
  }
  return reply ? { reply, items } : null;
}

// Сколько текста уже можно показать: всё до маркера, а хвост, похожий на начало маркера, придерживаем.
function visibleLength(text) {
  const at = text.indexOf(MARK);
  if (at >= 0) return at;
  for (let k = Math.min(MARK.length - 1, text.length); k > 0; k--) if (MARK.startsWith(text.slice(-k))) return text.length - k;
  return text.length;
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
  const mode = body.mode === "food" ? "food" : "workout";
  const context = clean(body.context, 900);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-14)
    .map((m) => {
      const role = m?.role === "assistant" ? "Assistant" : "User";
      // что помощник уже предлагал: без этого он повторяет прежние упражнения и блюда
      const proposed = role === "Assistant" && Array.isArray(m?.items)
        ? m.items.slice(0, 12).map((x) => clean(x?.name, 60)).filter(Boolean).join("; ")
        : "";
      return { role, text: clean(m?.text, 600) + (proposed ? ` [items you already proposed: ${proposed}]` : "") };
    })
    .filter((m) => m.text);
  if (!messages.length || messages[messages.length - 1].role !== "User") return res.status(400).json({ error: "empty" });

  const persona =
    mode === "food"
      ? "You are a friendly, practical nutrition assistant inside a food-diary app. You help the user eat in line with their goal: you estimate calories and macros, suggest what to eat to hit their targets, and answer food questions."
      : "You are a friendly, practical personal trainer inside a workout-log app. You build workouts, explain technique, suggest progression and answer training questions.";
  const itemsRule =
    mode === "food"
      ? 'When the user says what they ate or asks you to calculate foods, or you suggest a meal, list each food as an item with name, grams, and kcal/protein/fat/carbs for the whole portion (not per 100 g).'
      : 'When you propose a workout or exercises to do, list them as items (4 to 8 exercises, in order) with name, sets, reps and kg (use 0 for kg: the user fills in weights; for timed exercises use seconds as reps).';
  const prompt =
    `${persona} Talk like a helpful human coach: warm, direct, short (usually 2 to 5 sentences), no headings or markdown. Ask one clarifying question when you really need it (goal, level, equipment, time, injuries). ` +
    `Do not diagnose or give medical advice; for pain, injury or health conditions suggest seeing a professional. Never invent facts about the user. Always reply in ${LANG_NAMES[lang]}.\n` +
    `Move the conversation forward: never repeat or merely reword something you already said or proposed earlier in this conversation (check the "items you already proposed" notes). If the user asks for something new, different or harder, propose genuinely different ${mode === "food" ? "foods or meals" : "exercises, structure or training method"}. Do not end every message with a question; ask only when the answer would change your advice.\n` +
    `${itemsRule}\n` +
    `Format: write your reply as plain text first. Only if you have items, then add a line with exactly ${MARK} followed by a JSON array of the items, e.g. ${mode === "food" ? '[{"name":"Rice","grams":150,"kcal":195,"protein":4,"fat":0.4,"carbs":43}]' : '[{"name":"Squat","sets":3,"reps":10,"kg":0}]'}. Never mention the ${MARK} line or the JSON in your text.\n` +
    (context ? `Today's summary from the app: ${context}\n` : "") +
    `Conversation so far:\n${messages.map((m) => `${m.role}: ${m.text}`).join("\n")}\nAssistant:`;

  // Потоковый ответ (NDJSON): {"d": кусок текста}… затем {"done": true, reply, items}. Текст появляется сразу,
  // а не после всей генерации. Если ни одна модель не начала отвечать, приходит обычная JSON-ошибка.
  const diag = [];
  const timing = {};
  const t0 = Date.now();
  let sent = 0;
  let open = false;
  let full = "";
  const startStream = () => {
    open = true;
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
  };
  const out = await streamText(key, prompt, { temperature: 0.9, maxOutputTokens: 4096 }, diag, {
    // функция живёт 60 секунд (vercel.json): первый кусок ждём до 12 с на модель, весь ответ не дольше 50 с
    firstByteMs: 12_000,
    deadlineMs: 50_000,
    thinking: [{ thinkingBudget: 0 }, { thinkingLevel: "minimal" }, { thinkingLevel: "low" }],
    // для чата важнее быстрый первый ответ: сначала lite-модели, полные flash в запасе
    preferLite: true,
    timing,
  }, (piece) => {
    full += piece;
    const vis = visibleLength(full);
    if (vis <= sent) return;
    if (!open) startStream();
    res.write(JSON.stringify({ d: full.slice(sent, vis) }) + "\n");
    sent = vis;
  });

  if (!out) {
    if (open) return res.end(JSON.stringify({ error: "ai failed", detail: diag.join(" | ").slice(0, 400) }) + "\n");
    return res.status(500).json({ error: "ai failed", detail: diag.join(" | ").slice(0, 400) });
  }
  const parsed = parseReply(out.text, mode);
  if (!parsed) {
    console.error("coach: unparseable model reply", out.model, out.text.slice(0, 300));
    if (open) return res.end(JSON.stringify({ error: "bad reply", detail: `${out.model}: ${out.text.slice(0, 120)}` }) + "\n");
    return res.status(422).json({ error: "bad reply", detail: `${out.model}: ${out.text.slice(0, 120)}` });
  }
  // только время и модель, без текста переписки: чтобы видеть в логах Vercel, где теряются секунды
  console.log(`coach: ${out.model} first ${timing.firstMs ?? "-"}ms total ${Date.now() - t0}ms`);
  if (!open) startStream();
  return res.end(JSON.stringify({ done: true, ...parsed, model: out.model, cut: !!out.cut }) + "\n");
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
