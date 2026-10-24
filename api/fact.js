async function listFlashModels(key, version) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/${version}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.models || [])
      .filter((m) => (m.name || "").includes("flash"))
      .filter((m) => !/tts|preview|image|audio|t2s/.test(m.name))
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));
  } catch {
    return [];
  }
}

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
  const prompt =
    lang === "ru"
      ? "Придумай один короткий интересный научный, исторический или природный факт. Ответь только самим фактом, одним-двумя предложениями, без вступлений и подписей."
      : `Come up with one short interesting science, history or nature fact. Reply in ${LANG_NAMES[lang] || "English"} with only the fact itself, one or two sentences, no intro or labels.`;

  const errors = [];

  // Сначала — модели, которые Google рекомендует в 2026-м, затем живой список
  const PREFERRED = ["gemini-3.6-flash", "gemini-flash-latest"];
  let version = "v1beta";
  let dynamic = await listFlashModels(key, version);
  if (!dynamic.length) {
    version = "v1";
    dynamic = await listFlashModels(key, version);
  }
  const models = [...PREFERRED, ...dynamic.filter((m) => !PREFERRED.includes(m))].slice(0, 4);

  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await r.json();

      if (!r.ok) {
        errors.push(`${model}: HTTP ${r.status} — ${data?.error?.message || "unknown"}`);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        errors.push(`${model}: empty response`);
        continue;
      }

      res.setHeader("Cache-Control", "s-maxage=3600");
      return res.json({ fact: text, model });
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }

  console.error("fact: all models failed", errors);
  return res.status(500).json({ error: "ai failed" });
}
