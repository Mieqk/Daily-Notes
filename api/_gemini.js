// Общий вызов Gemini для серверных функций: перебирает рекомендуемые и доступные flash-модели.
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

export async function generateText(key, prompt, generationConfig = {}) {
  const errors = [];
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
      const r = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
      });
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
      return { text, model };
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }
  console.error("gemini: all models failed", errors);
  return null;
}
