const BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com"; // переопределяется только в тестах
// Общий вызов Gemini для серверных функций: перебирает рекомендуемые и доступные flash-модели.
const modelCache = new Map(); // version -> { at, list }
const modelLoads = new Map(); // version -> идущий запрос списка (чтобы не слать два одинаковых)
function loadFlashModels(key, version) {
  if (modelLoads.has(version)) return modelLoads.get(version);
  const p = (async () => {
    try {
      const r = await fetch(`${BASE}/${version}/models?pageSize=200`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return [];
      const d = await r.json();
      const list = (d.models || [])
        .filter((m) => (m.name || "").includes("flash"))
        .filter((m) => !/tts|preview|image|audio|t2s|gemini-2\.5-flash-lite/.test(m.name)) // 2.5 lite закрыта для новых ключей (404)
        .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => m.name.replace("models/", ""));
      if (list.length) modelCache.set(version, { at: Date.now(), list });
      return list;
    } catch {
      return [];
    } finally {
      modelLoads.delete(version);
    }
  })();
  modelLoads.set(version, p);
  return p;
}
// Список моделей не стоит задержки ответа: устаревший список берём сразу и обновляем в фоне; на холодном старте
// ждём список недолго (MODEL_LIST_WAIT_MS), иначе идём по запасным именам.
const MODEL_LIST_WAIT_MS = 1200;
async function listFlashModels(key, version, wait = MODEL_LIST_WAIT_MS) {
  const hit = modelCache.get(version);
  if (hit) {
    if (Date.now() - hit.at >= 10 * 60_000) loadFlashModels(key, version);
    return hit.list;
  }
  const load = loadFlashModels(key, version);
  return wait > 0 ? Promise.race([load, new Promise((res) => setTimeout(() => res([]), wait))]) : load;
}

// Новее — раньше, полные модели раньше lite (с preferLite наоборот: lite быстрее начинает отвечать); неизвестные имена в конец
const rank = (name, preferLite = false) => {
  const m = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?(?:-\d+)?$/.exec(name);
  return m ? parseFloat(m[1]) * 100 - (!m[2] === preferLite ? 1000 : 0) : -Infinity;
};
const deadModels = new Set(); // модели, ответившие 404 (отключены): пропускаем до перезапуска функции
// какой вариант thinkingConfig модель приняла: следующие запросы сразу шлют его, без лишних ответов 400
const thinkingOk = new Map(); // model -> index в opts.thinking (или -1: без thinkingConfig)

async function pickModels(key, preferLite = false) {
  let version = "v1beta";
  let dynamic = await listFlashModels(key, version);
  if (!dynamic.length && !modelLoads.has(version)) {
    // v1beta не ответил полностью (а не просто задержался): пробуем v1
    version = "v1";
    dynamic = await listFlashModels(key, version);
  }
  const sorted = [...dynamic].sort((a, b) => rank(b, preferLite) - rank(a, preferLite)).filter((m) => !deadModels.has(m));
  const fallback = ["gemini-3.8-flash", "gemini-3.6-flash"].filter((m) => !deadModels.has(m));
  const models = [...(sorted.length ? sorted.slice(0, 3) : fallback), "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);
  return { version, models };
}

// diag — необязательный массив: сюда попадают причины отказов моделей (без ключа и данных пользователя).
// opts.timeoutMs — предел на один запрос к модели, opts.deadlineMs — предел на всю попытку со сменой моделей
// (он должен быть меньше maxDuration функции, иначе Vercel оборвёт её ответом 504).
// opts.hedgeMs — если попытка молчит дольше, параллельно стартует следующая модель (побеждает первая успешная).
// opts.thinking — варианты thinkingConfig для быстрых ответов: пробуются по очереди, пока модель не примет один из них.
export async function generateText(key, prompt, generationConfig = {}, diag = [], opts = {}) {
  const errors = diag;
  const started = Date.now();
  const { timeoutMs = 25_000, deadlineMs = 50_000, thinking = [], preferLite = false, inline = [], hedgeMs = 0 } = opts;
  const { version, models } = await pickModels(key, preferLite);
  // inline — необязательные вложения [{mime, data(base64)}] (например, аудио для расшифровки): уходят перед текстом
  const parts = [...inline.map((x) => ({ inlineData: { mimeType: x.mime, data: x.data } })), { text: prompt }];

  const call = async (model, config, limit, signal) => {
    const r = await fetch(`${BASE}/${version}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: config }),
      signal: AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(limit)]) : signal,
    });
    return { r, data: await r.json() };
  };

  // Одна попытка в одной модели: { text, model } или null (причина попадает в errors)
  const attempt = async (model, limit, signal) => {
    try {
      // разные модели по-разному отключают размышления: пробуем варианты, потом без них
      const variants = [...thinking, null];
      const known = thinkingOk.get(model);
      const first = known === undefined ? 0 : known === -1 ? variants.length - 1 : known;
      const order = [first, ...variants.map((_, i) => i).filter((i) => i !== first)];
      let r, data, used = -1;
      for (const i of order) {
        const v = variants[i];
        used = v ? i : -1;
        ({ r, data } = await call(model, v ? { ...generationConfig, thinkingConfig: v } : generationConfig, limit, signal));
        // на неподходящий thinkingConfig новые модели отвечают просто «invalid argument», без слова think
        if (r.ok || r.status !== 400) break;
      }
      if (!r.ok) {
        if (r.status === 404 && model !== "gemini-flash-latest") deadModels.add(model);
        errors.push(`${model}: HTTP ${r.status} — ${data?.error?.message || "unknown"}`);
        return null;
      }
      if (thinking.length) thinkingOk.set(model, used);
      const out = data?.candidates?.[0]?.content?.parts || [];
      const text = out.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
      if (!text) {
        errors.push(`${model}: empty response`);
        return null;
      }
      return { text, model };
    } catch (e) {
      if (!signal.aborted) errors.push(`${model}: ${e.message}`);
      return null;
    }
  };

  // Модели по очереди; с hedgeMs, если попытка молчит дольше, параллельно стартует следующая модель и побеждает первая
  // успешная (задержки Gemini сильно скачут, а сервер ждёт зря).
  const ctl = new AbortController();
  const pending = new Set();
  const queue = [...models];
  let result = null;
  const launch = () => {
    const left = deadlineMs - (Date.now() - started);
    if (!queue.length) return false;
    if (left < 2000) {
      if (!errors.includes("deadline exceeded")) errors.push("deadline exceeded");
      queue.length = 0;
      return false;
    }
    const p = attempt(queue.shift(), Math.min(timeoutMs, left), ctl.signal).then((res) => ({ p, res }));
    pending.add(p);
    return true;
  };
  launch();
  let armed = true;
  while (pending.size && !result) {
    const races = [...pending];
    let timer;
    if (hedgeMs && armed && queue.length) races.push(new Promise((res) => (timer = setTimeout(() => res({ hedge: true }), hedgeMs))));
    const got = await Promise.race(races);
    clearTimeout(timer);
    if (got.hedge) {
      armed = false;
      launch();
      continue;
    }
    pending.delete(got.p);
    if (got.res) result = got.res;
    else if (!pending.size && launch()) armed = true;
  }
  ctl.abort();
  if (result) return result;
  console.error("gemini: all models failed", errors);
  return null;
}

// Список моделей запрашиваем сразу при загрузке функции, параллельно с разбором запроса
if (process.env.GEMINI_API_KEY && !process.env.GEMINI_BASE_URL) loadFlashModels(process.env.GEMINI_API_KEY, "v1beta");

// Прогрев для клиента: список моделей уже в памяти функции (вызывается при открытии чата)
export const warmModels = (key) => pickModels(key, true).then(() => undefined);

// Один потоковый запрос к модели: отдаёт куски текста (без частей с размышлениями).
// images — необязательные картинки [{mime, data(base64)}]: уходят перед текстом как inlineData (мультимодальный ввод).
// tools — необязательные инструменты модели (например, [{ google_search: {} }]); meta.sources наполняется
// ссылками из groundingMetadata ответа (при поиске Google).
async function* streamPieces(key, version, model, prompt, generationConfig, thinking, signal, images = [], tools, meta = { sources: [] }) {
  const parts = [...images.map((im) => ({ inlineData: { mimeType: im.mime, data: im.data } })), { text: prompt }];
  let r;
  const variants = [...thinking, null];
  const known = thinkingOk.get(model);
  // принятый раньше вариант идёт первым, остальные остаются запасными
  const first = known === undefined ? 0 : known === -1 ? variants.length - 1 : known;
  const order = [first, ...variants.map((_, i) => i).filter((i) => i !== first)];
  let used = -1;
  for (const i of order) {
    const v = variants[i];
    used = v ? i : -1;
    r = await fetch(`${BASE}/${version}/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], ...(tools ? { tools } : {}), generationConfig: v ? { ...generationConfig, thinkingConfig: v } : generationConfig }),
      signal,
    });
    if (r.ok) break;
    const data = await r.json().catch(() => ({}));
    r.errorMessage = data?.error?.message || "unknown";
    // на неподходящий thinkingConfig новые модели отвечают просто «invalid argument», без слова think
    if (r.status !== 400) break;
  }
  if (!r.ok) {
    if (r.status === 404 && model !== "gemini-flash-latest") deadModels.add(model);
    throw new Error(`HTTP ${r.status} — ${r.errorMessage}`);
  }
  thinkingOk.set(model, used);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
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
      for (const g of chunk?.candidates?.[0]?.groundingMetadata?.groundingChunks || []) {
        if (g?.web?.uri) meta.sources.push({ url: g.web.uri, title: g.web.title || "" });
      }
      if (chunk?.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length) meta.searched = true;
      const parts = chunk?.candidates?.[0]?.content?.parts || [];
      const piece = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
      if (piece) yield piece;
    }
  }
}

// Потоковый вариант: onDelta получает куски текста по мере генерации.
// Модели перебираются, только пока не пришёл первый кусок (opts.firstByteMs на попытку); дальше ответ дочитывается
// до конца или до opts.deadlineMs. opts.hedgeMs: если первая попытка молчит дольше, параллельно запускается вторая
// (в следующую модель списка), и побеждает та, что заговорит раньше (у Gemini время до первого слова сильно скачет).
// Возвращает { model, text } или null, если ни одна модель не начала отвечать.
export async function streamText(key, prompt, generationConfig = {}, diag = [], opts = {}, onDelta = () => {}) {
  const errors = diag;
  const started = Date.now();
  const { firstByteMs = 12_000, deadlineMs = 50_000, thinking = [], preferLite = false, hedgeMs = 0 } = opts;
  const { version, models } = await pickModels(key, preferLite);
  const queue = [...models];
  const live = new Set();
  const left = () => deadlineMs - (Date.now() - started);

  const launch = (model) => {
    const ctl = new AbortController();
    const a = { model, ctl, overall: setTimeout(() => ctl.abort(), left()), first: setTimeout(() => ctl.abort(), Math.min(firstByteMs, left())) };
    a.meta = { sources: [] };
    a.gen = streamPieces(key, version, model, prompt, generationConfig, thinking, ctl.signal, opts.images, opts.tools, a.meta);
    a.next = a.gen.next().then((r) => ({ a, r }), (e) => ({ a, e }));
    live.add(a);
  };
  const drop = (a) => {
    clearTimeout(a.overall);
    clearTimeout(a.first);
    a.ctl.abort();
    live.delete(a);
  };

  let winner = null;
  let firstPiece = "";
  let hedged = false;
  while (!winner) {
    if (!live.size) {
      if (!queue.length) break;
      if (left() < 2000) {
        errors.push("deadline exceeded");
        break;
      }
      launch(queue.shift());
      hedged = false;
    }
    const races = [...live].map((a) => a.next);
    let hedgeTimer;
    if (hedgeMs && !hedged && live.size === 1 && left() > hedgeMs + 2000) {
      races.push(new Promise((res) => (hedgeTimer = setTimeout(() => res({ hedge: true }), hedgeMs))));
    }
    const got = await Promise.race(races);
    clearTimeout(hedgeTimer);
    if (got.hedge) {
      hedged = true;
      // копию шлём в другую модель из списка: задержки одной и той же модели обычно скачут вместе
      launch(queue.length ? queue.shift() : [...live][0].model);
      continue;
    }
    const { a, r, e } = got;
    if (e || r.done) {
      // вторая копия той же модели не повторяет уже записанную ошибку
      const msg = `${a.model}: ${e ? (e.name === "AbortError" ? "timeout" : e.message) : "empty response"}`;
      if (!errors.includes(msg)) errors.push(msg);
      drop(a);
      continue;
    }
    winner = a;
    firstPiece = r.value;
  }
  for (const a of [...live]) if (a !== winner) drop(a);
  if (!winner) {
    console.error("gemini stream: all models failed", errors);
    return null;
  }

  clearTimeout(winner.first);
  if (opts.timing) opts.timing.firstMs = Date.now() - started;
  let text = firstPiece;
  onDelta(firstPiece);
  try {
    for (;;) {
      const { value, done } = await winner.gen.next();
      if (done) break;
      text += value;
      onDelta(value);
    }
    return { model: winner.model, text, sources: winner.meta.sources, searched: !!winner.meta.searched };
  } catch {
    // оборвалось посреди ответа: отдаём то, что успело прийти, вместо смены модели
    return { model: winner.model, text, cut: true, sources: winner.meta.sources, searched: !!winner.meta.searched };
  } finally {
    clearTimeout(winner.overall);
  }
}
