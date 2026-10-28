import { generateText } from "./_gemini.js";

// Простое ограничение частоты по IP (в памяти экземпляра функции: смягчает перебор,
// но не заменяет Vercel Firewall rate limiting для жёсткого лимита)
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

export default async function handler(req, res) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (tooMany(ip)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "too many requests" });
  }

  const lang = String(req.query.lang || "ru").slice(0, 5);
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const LANG_NAMES = { ru: "Russian", en: "English", be: "Belarusian", uk: "Ukrainian", de: "German", fr: "French", es: "Spanish" };
  // Без случайной темы модель на один и тот же промпт отвечает одним и тем же фактом
  const TOPICS = ["animals", "oceans", "space and planets", "the human body", "ancient history", "medieval history", "inventions", "plants and fungi", "weather and climate", "geography", "chemistry", "physics", "mathematics", "food and drinks", "music", "languages and writing", "architecture", "insects", "birds", "geology and minerals", "sports", "technology and computers", "psychology and sleep", "art and painting"];
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const nonce = Math.random().toString(36).slice(2, 8);
  const avoid = String(req.query.avoid || "").slice(0, 200);
  const avoidRu = avoid ? ` Не повторяй этот факт: «${avoid}».` : "";
  const avoidEn = avoid ? ` Do not repeat this fact: "${avoid}".` : "";
  const prompt =
    lang === "ru"
      ? `Придумай один короткий малоизвестный факт на тему: ${topic} (тему не называй). Выбирай необычные, но достоверные и проверяемые факты; если не уверен, возьми другой.${avoidRu} Ответь только самим фактом, одним-двумя предложениями, без вступлений и подписей. [${nonce}]`
      : `Come up with one short little-known fact about: ${topic}. Pick an unusual but true, verifiable one; if unsure, pick another.${avoidEn} Reply in ${LANG_NAMES[lang] || "English"} with only the fact itself, one or two sentences, no intro, topic or labels. [${nonce}]`;

  // общий вызов: свежий список моделей, без размышлений и с тайм-аутами. Полная flash на проде не укладывалась
  // в 10 с, поэтому сначала lite (ответ за 1–2 с). Температура 0.7: на 1.0 и выше lite выдумывала «факты»
  // и путала слова в белорусском; разнообразие и так дают случайная тема и nonce. Полные flash остаются в запасе.
  const errors = [];
  const out = await generateText(key, prompt, { temperature: 0.7, maxOutputTokens: 300 }, errors, {
    timeoutMs: 8_000,
    deadlineMs: 22_000,
    thinking: [{ thinkingBudget: 0 }, { thinkingLevel: "minimal" }, { thinkingLevel: "low" }],
    preferLite: true,
    // lite обычно отвечает за 1–2 с; если молчит дольше 3 с, параллельно спрашиваем следующую модель
    hedgeMs: 3_000,
  });
  if (out) {
    res.setHeader("Cache-Control", "no-store");
    // lite-модели любят начинать с «Тема: …» или «Факт:»: убираем такие подписи и кавычки
    const fact = out.text
      .replace(/^\s*(тема|тэма|topic|thema|sujet|tema)\s*:[^\n]*\n+/i, "")
      .replace(/^\s*(факт|fact|fakt|fait|dato|hecho)\s*:\s*/i, "")
      .replace(/^["«]|["»]$/g, "")
      .trim();
    return res.json({ fact: fact || out.text.trim(), model: out.model });
  }

  return res.status(500).json({ error: "ai failed", detail: errors.join(" | ").slice(0, 400) });
}
