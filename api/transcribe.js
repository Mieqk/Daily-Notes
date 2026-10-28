import { generateText } from "./_gemini.js";

// Расшифровка голоса в текст для диктовки там, где нет Web Speech API (Firefox, APK). Приватность: приходит только
// короткая запись, которую человек сам сделал и разрешил отправить; она нигде не сохраняется, ответ — только текст.
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
const MIMES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"]);
// Тело запроса на Vercel не больше 4,5 МБ: минута звука в opus занимает около 400 КБ
export const MAX_AUDIO_B64 = 3_000_000;

/** Проверяет присланное аудио. Возвращает {mime, data} или null. */
export function sanitizeAudio(raw) {
  const mime = String(raw?.mime ?? "").split(";")[0].trim().toLowerCase();
  const data = typeof raw?.data === "string" ? raw.data : "";
  if (!MIMES.has(mime) || !data || data.length > MAX_AUDIO_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  return { mime, data };
}

/** Убирает пояснения модели вокруг расшифровки и кавычки. */
export function cleanTranscript(text) {
  return String(text ?? "")
    .replace(/^\s*(расшифровка|транскрипция|transcript(ion)?|transkript|transcripción)\s*:\s*/i, "")
    .replace(/^["«»]+|["«»]+$/g, "")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (tooMany(ip)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "too many requests" });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : req.body || {};
  const audio = sanitizeAudio(body.audio);
  if (!audio) return res.status(400).json({ error: "bad audio" });
  const lang = String(body.lang || "ru").slice(0, 5);

  const prompt = `Transcribe this voice recording word for word. The speaker most likely speaks ${LANG_NAMES[lang] || "English"}. Add normal punctuation. Reply with only the transcribed text, with no intro, quotes or comments. If there is no speech, reply with an empty line.`;
  const errors = [];
  const out = await generateText(key, prompt, { temperature: 0, maxOutputTokens: 2000 }, errors, {
    timeoutMs: 20_000,
    deadlineMs: 40_000,
    thinking: [{ thinkingBudget: 0 }, { thinkingLevel: "minimal" }, { thinkingLevel: "low" }],
    preferLite: true,
    hedgeMs: 6_000,
    inline: [audio],
  });
  res.setHeader("Cache-Control", "no-store");
  if (out) return res.json({ text: cleanTranscript(out.text) });
  // тишина: все модели ответили, но пустым текстом — это не сбой, клиент покажет «речь не расслышана»
  if (errors.length && errors.every((e) => e.endsWith("empty response"))) return res.json({ text: "" });
  return res.status(500).json({ error: "ai failed", detail: errors.join(" | ").slice(0, 400) });
}
