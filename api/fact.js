async function listFlashModels(key, version) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/${version}/models?pageSize=200&key=${key}`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.models || [])
      .filter((m) => (m.name || "").includes("flash"))
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));
  } catch {
    return [];
  }
}

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

  const errors = [];

  // Спрашиваем у Google, какие flash-модели сейчас доступны
  let version = "v1beta";
  let models = await listFlashModels(key, version);
  if (!models.length) {
    version = "v1";
    models = await listFlashModels(key, version);
  }
  if (!models.length) models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const model of models.slice(0, 3)) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  return res.status(500).json({ error: "ai failed", errors });
}
