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

async function pickModels(key) {
  let version = "v1beta";
  let dynamic = await listFlashModels(key, version);
  if (!dynamic.length) {
    version = "v1";
    dynamic = await listFlashModels(key, version);
  }
  const sorted = [...dynamic].sort((a, b) => rank(b) - rank(a)).filter((m) => !deadModels.has(m));
  const fallback = ["gemini-3.8-flash", "gemini-3.6-flash"].filter((m) => !deadModels.has(m));
  const models = [...(sorted.length ? sorted.slice(0, 3) : fallback), "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);
  return { version, models };
}

// diag — необязательный массив: сюда попадают причины отказов моделей (без ключа и данных пользователя).
// opts.timeoutMs — предел на один запрос к модели, opts.deadlineMs — предел на всю попытку со сменой моделей
// (он должен быть меньше maxDuration функции, иначе Vercel оборвёт её ответом 504).
// opts.thinking — варианты thinkingConfig для быстрых ответов: пробуются по очереди, пока модель не примет один из них.
export async function generateText(key, prompt, generationConfig = {}, diag = [], opts = {}) {
  const errors = diag;
  const started = Date.now();
  const { timeoutMs = 25_000, deadlineMs = 50_000, thinking = [] } = opts;
  const { version, models } = await pickModels(key);

  const call = async (model, config, limit) => {
    const r = await fetch(`${BASE}/${version}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: config }),
      signal: AbortSignal.timeout(limit),
    });
    return { r, data: await r.json() };
  };

  for (const model of models) {
    const left = deadlineMs - (Date.now() - started);
    if (left < 2000) {
      errors.push("deadline exceeded");
      break;
    }
    const limit = Math.min(timeoutMs, left);
    try {
      // разные модели по-разному отключают размышления: пробуем варианты, потом без них
      const variants = [...thinking, null];
      let r, data;
      for (const v of variants) {
        ({ r, data } = await call(model, v ? { ...generationConfig, thinkingConfig: v } : generationConfig, limit));
        if (r.ok || r.status !== 400 || !/think/i.test(data?.error?.message || "")) break;
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

// Потоковый вариант: onDelta получает куски текста по мере генерации.
// Модели перебираются, только пока не пришёл первый кусок (opts.firstByteMs на модель); дальше ответ дочитывается
// до конца или до opts.deadlineMs. Возвращает { model, text } или null, если ни одна модель не начала отвечать.
export async function streamText(key, prompt, generationConfig = {}, diag = [], opts = {}, onDelta = () => {}) {
  const errors = diag;
  const started = Date.now();
  const { firstByteMs = 12_000, deadlineMs = 50_000, thinking = [] } = opts;
  const { version, models } = await pickModels(key);

  for (const model of models) {
    const left = deadlineMs - (Date.now() - started);
    if (left < 2000) {
      errors.push("deadline exceeded");
      break;
    }
    const ctl = new AbortController();
    const overall = setTimeout(() => ctl.abort(), left);
    let firstTimer = setTimeout(() => ctl.abort(), Math.min(firstByteMs, left));
    let text = "";
    try {
      let r;
      for (const v of [...thinking, null]) {
        r = await fetch(`${BASE}/${version}/models/${model}:streamGenerateContent?alt=sse`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: v ? { ...generationConfig, thinkingConfig: v } : generationConfig }),
          signal: ctl.signal,
        });
        if (r.ok) break;
        const data = await r.json().catch(() => ({}));
        r.errorMessage = data?.error?.message || "unknown";
        if (r.status !== 400 || !/think/i.test(r.errorMessage)) break;
      }
      if (!r.ok) {
        if (r.status === 404 && model !== "gemini-flash-latest") deadModels.add(model);
        errors.push(`${model}: HTTP ${r.status} — ${r.errorMessage}`);
        continue;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          let chunk;
          try {
            chunk = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          const parts = chunk?.candidates?.[0]?.content?.parts || [];
          const piece = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
          if (!piece) continue;
          if (firstTimer) {
            clearTimeout(firstTimer);
            firstTimer = null;
          }
          text += piece;
          onDelta(piece);
        }
      }
      if (!text) {
        errors.push(`${model}: empty response`);
        continue;
      }
      return { model, text };
    } catch (e) {
      // оборвалось посреди ответа: отдаём то, что успело прийти, вместо смены модели
      if (text) return { model, text, cut: true };
      errors.push(`${model}: ${e.name === "AbortError" ? "timeout" : e.message}`);
    } finally {
      clearTimeout(overall);
      if (firstTimer) clearTimeout(firstTimer);
    }
  }
  console.error("gemini stream: all models failed", errors);
  return null;
}
