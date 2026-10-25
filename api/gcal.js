// Синхронизация задач с Google Календарём (однонаправленная: приложение -> календарь).
//   GET  /api/gcal?code&state                       — возврат из Google после согласия
//   POST /api/gcal { action: "url" | "status" | "sync" | "disconnect", ... } + Authorization: Bearer <JWT пользователя>
// Один файл на всё, чтобы не упереться в лимит функций на тарифе Hobby.
import { SCOPE, accessToken, config, deleteEvent, emailFromIdToken, eventId, exchangeCode, hashTask, makeState, readState, redirectUri, revoke, upsertEvent } from "./_gcal.js";

const MAX_TASKS = 400;
// Столько обращений к Google за один вызов, чтобы уложиться в maxDuration; остальное клиент догонит повторным вызовом
const MAX_OPS = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const hits = new Map();
function tooMany(key) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  return list.length > 20;
}

async function callback(req, res, cfg) {
  const { code, state, error } = req.query || {};
  const st = readState(state, cfg.clientSecret);
  const back = (ok, native) => {
    const target = native ? `io.vercel.dailynotes://auth?gcal=${ok}` : `/?gcal=${ok}`;
    res.statusCode = 302;
    res.setHeader("Location", target);
    res.end();
  };
  if (!st) return res.status(400).send("Bad or expired link. Close this tab and try again from the app.");
  if (error || !code) return back("denied", st.native);

  const { ok, json } = await exchangeCode(cfg, String(code), redirectUri(req));
  // refresh_token приходит только при prompt=consent; без него постоянный доступ не получить
  if (!ok || !json.refresh_token) return back("error", st.native);
  const scopes = String(json.scope || "");
  if (!scopes.includes("calendar.events")) return back("denied", st.native);

  const { error: dbErr } = await cfg.admin.from("calendar_connections").upsert(
    { user_id: st.userId, refresh_token: json.refresh_token, google_email: emailFromIdToken(json.id_token), synced: {}, last_sync: null },
    { onConflict: "user_id" }
  );
  return back(dbErr ? "error" : "connected", st.native);
}

async function sync(cfg, userId, conn, tasks, from) {
  const { token, revoked } = await accessToken(cfg, conn.refresh_token);
  if (revoked) {
    await cfg.admin.from("calendar_connections").delete().eq("user_id", userId);
    return { status: 401, body: { error: "revoked" } };
  }
  if (!token) return { status: 502, body: { error: "google unavailable" } };

  const synced = { ...(conn.synced || {}) };
  const incoming = new Map();
  for (const t of tasks) incoming.set(t.id, t);

  // Что сделать: создать/обновить изменившиеся и удалить пропавшие в пределах окна синхронизации
  const upserts = [...incoming.values()].filter((t) => synced[t.id]?.h !== hashTask(t));
  const removals = Object.entries(synced).filter(([id, v]) => !incoming.has(id) && v.d >= from);

  const jobsAll = [
    ...upserts.map((t) => ({ t })),
    ...removals.map(([id, v]) => ({ id, v })),
  ];
  const batch = jobsAll.slice(0, MAX_OPS);
  const more = jobsAll.length > MAX_OPS;

  let created = 0, removed = 0, failed = 0, authLost = false;
  const run = async (jobs) => {
    for (let i = 0; i < jobs.length && !authLost; i += 5) {
      await Promise.all(jobs.slice(i, i + 5).map((j) => j()));
    }
  };
  await run(
    batch.map((j) => async () => {
      if (j.t) {
        const t = j.t;
        const id = eventId(userId, t.id);
        const r = await upsertEvent(token, id, t, Boolean(synced[t.id]));
        if (r === "ok") { synced[t.id] = { e: id, d: t.date, h: hashTask(t) }; created++; }
        else if (r === "auth") authLost = true;
        else failed++;
      } else {
        const r = await deleteEvent(token, j.v.e);
        if (r === "ok") { delete synced[j.id]; removed++; }
        else if (r === "auth") authLost = true;
        else failed++;
      }
    })
  );

  if (authLost) {
    await cfg.admin.from("calendar_connections").delete().eq("user_id", userId);
    return { status: 401, body: { error: "revoked" } };
  }
  await cfg.admin.from("calendar_connections").update({ synced, last_sync: new Date().toISOString() }).eq("user_id", userId);
  return { status: 200, body: { created, removed, failed, more: more && failed === 0, total: incoming.size } };
}

export default async function handler(req, res) {
  const cfg = config();
  if (!cfg) return res.status(500).json({ error: "calendar is not configured" });
  if (req.method === "GET") return callback(req, res, cfg);
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const { data: auth } = await cfg.admin.auth.getUser(token);
  const me = auth?.user?.id;
  if (!me) return res.status(401).json({ error: "unauthorized" });
  if (tooMany(me)) return res.status(429).json({ error: "too many requests" });

  const { action } = req.body || {};

  if (action === "url") {
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri(req),
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state: makeState(me, req.body?.native === true, cfg.clientSecret),
    });
    return res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  }

  const { data: conn } = await cfg.admin.from("calendar_connections").select("*").eq("user_id", me).maybeSingle();

  if (action === "status") {
    return res.status(200).json({ connected: Boolean(conn), email: conn?.google_email ?? null, lastSync: conn?.last_sync ?? null });
  }
  if (!conn) return res.status(404).json({ error: "not connected" });

  if (action === "disconnect") {
    // События остаются в календаре (там могут быть правки пользователя), удаляем только доступ
    const { token: at } = await accessToken(cfg, conn.refresh_token);
    await revoke(at || conn.refresh_token);
    await cfg.admin.from("calendar_connections").delete().eq("user_id", me);
    return res.status(200).json({ ok: true });
  }

  if (action === "sync") {
    const raw = Array.isArray(req.body?.tasks) ? req.body.tasks : null;
    const from = String(req.body?.from || "");
    if (!raw || raw.length > MAX_TASKS || !DATE_RE.test(from)) return res.status(400).json({ error: "bad request" });
    const tasks = [];
    for (const t of raw) {
      if (!t || typeof t.id !== "string" || t.id.length > 64 || typeof t.text !== "string" || !DATE_RE.test(t.date) || t.date < from) {
        return res.status(400).json({ error: "bad request" });
      }
      const text = t.text.trim();
      if (text) tasks.push({ id: t.id, date: t.date, text: text.slice(0, 280), done: t.done === true });
    }
    const out = await sync(cfg, me, conn, tasks, from);
    return res.status(out.status).json(out.body);
  }

  return res.status(400).json({ error: "bad request" });
}
