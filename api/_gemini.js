const BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com"; // переопределяется только в тестах
// Общий вызов Gemini для серверных функций: перебирает рекомендуемые и доступные flash-модели.
const modelCache = new Map(); // version -> { at, list }
async function listFlashModels(key, version) {
  const hit = modelCache.get(version);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.list;
  try {
    const r = await fetch(`${BASE}/${version}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
    if (!r.ok) return [];
    const d = await r.json();
    const list = (d.models || [])
      .filter((m) => (m.name || "").includes("flash"))
      .filter((m) => !/tts|preview|image|audio|t2s/.test(m.name))
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));
    modelCache.set(version, { at: Date.now(), list });
    return list;
  } catch {
    return [];
  }
}

// Новее — раньше, полные модели раньше lite; неизвестные имена в конец
const rank = (name) => {
  const m = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?(?:-\d+)?$/.exec(name);
  return m ? parseFloat(m[1]) * 100 - (m[2] ? 1000 : 0) : -Infinity;
};
const deadModels = new Set(); // модели, ответившие 404 (отключены): пропускаем до перезапуска функции

// diag — необязательный массив: сюда попадают причины отказов моделей (без ключа и данных пользователя).
// opts.timeoutMs — предел на один запрос к модели, opts.deadlineMs — предел на всю попытку со сменой моделей.
export async function generateText(key, prompt, generationConfig = {}, diag = [], opts = {}) {
  const errors = diag;
  const started = Date.now();
  const { timeoutMs = 25_000, deadlineMs = 50_000 } = opts;
  let version = "v1beta";
  let dynamic = await listFlashModels(key, version);
  if (!dynamic.length) {
    version = "v1";
    dynamic = await listFlashModels(key, version);
  }
  const sorted = [...dynamic].sort((a, b) => rank(b) - rank(a)).filter((m) => !deadModels.has(m));
  const fallback = ["gemini-3.8-flash", "gemini-3.6-flash"].filter((m) => !deadModels.has(m));
  const models = [...(sorted.length ? sorted.slice(0, 3) : fallback), "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);

  const call = async (model, config) => {
    const r = await fetch(`${BASE}/${version}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: config }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { r, data: await r.json() };
  };

  for (const model of models) {
    if (Date.now() - started > deadlineMs) {
      errors.push("deadline exceeded");
      break;
    }
    try {
      let { r, data } = await call(model, generationConfig);
      // не все модели принимают thinkingConfig: повторяем эту же модель без него
      if (!r.ok && generationConfig.thinkingConfig && /think/i.test(data?.error?.message || "")) {
        const { thinkingConfig, ...rest } = generationConfig;
        ({ r, data } = await call(model, rest));
      }
      if (!r.ok) {
        if (r.status === 404 && model !== "gemini-flash-latest") deadModels.add(model);
        errors.push(`${model}: HTTP ${r.status} — ${data?.error?.message || "unknown"}`);
        continue;
      }
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
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
