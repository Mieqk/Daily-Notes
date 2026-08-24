const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];

export default async function handler(req, res) {
  const lang = String(req.query.lang || "ru");
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const prompt =
    lang === "ru"
      ? "Придумай один короткий интересный научный, исторический или природный факт. Ответь только самим фактом, одним-двумя предложениями, без вступлений и подписей."
      : "Come up with one short interesting science, history or nature fact. Reply with only the fact itself, one or two sentences, no intro or labels.";

  let lastError = "";

  for (const model of MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await r.json();

      if (!r.ok) {
        lastError = `${model}: HTTP ${r.status} — ${data?.error?.message || "unknown"}`;
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        lastError = `${model}: empty response`;
        continue;
      }

      res.setHeader("Cache-Control", "s-maxage=3600");
      return res.json({ fact: text, model });
    } catch (e) {
      lastError = `${model}: ${e.message}`;
    }
  }

  return res.status(500).json({ error: "ai failed", details: lastError });
}
