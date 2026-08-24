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

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("empty response");

    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.json({ fact: text });
  } catch (e) {
    return res.status(500).json({ error: "ai failed" });
  }
}
