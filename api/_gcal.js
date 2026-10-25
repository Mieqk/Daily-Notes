// Общий код синхронизации с Google Календарём: подпись state, обмен кодов, события.
// Файл с префиксом «_» Vercel не превращает в маршрут.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const SCOPE = "openid email https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export function config() {
  // VITE_SUPABASE_URL это тот проект, с которым работает приложение. SUPABASE_URL может прийти из
  // интеграции Vercel и указывать на другой проект, поэтому он только запасной вариант.
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!url || !serviceKey || !clientId || !clientSecret) return null;
  return { clientId, clientSecret, admin: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

/** Адрес, который нужно вписать в «Authorized redirect URIs» OAuth-клиента. */
export function redirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}/api/gcal`;
}

// state подписан HMAC-ом секрета клиента: пользователь не может подставить чужой user_id
const sign = (payload, secret) => createHmac("sha256", secret).update(payload).digest("base64url");

export function makeState(userId, native, secret) {
  const body = Buffer.from(JSON.stringify({ u: userId, n: native ? 1 : 0, x: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function readState(state, secret) {
  const [body, mac] = String(state || "").split(".");
  if (!body || !mac) return null;
  const a = Buffer.from(mac), b = Buffer.from(sign(body, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString());
    return s.x > Date.now() && typeof s.u === "string" ? { userId: s.u, native: s.n === 1 } : null;
  } catch {
    return null;
  }
}

async function tokenRequest(params) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, json };
}

export const exchangeCode = (cfg, code, redirect) =>
  tokenRequest({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirect, grant_type: "authorization_code" });

/** Возвращает { token } или { revoked: true }, если доступ отозван; при временном сбое Google оба поля пусты. */
export async function accessToken(cfg, refreshToken) {
  const { ok, json } = await tokenRequest({ refresh_token: refreshToken, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "refresh_token" });
  if (ok && json.access_token) return { token: json.access_token };
  return json?.error === "invalid_grant" ? { revoked: true } : {};
}

export const revoke = (token) =>
  fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) }).catch(() => {});

export function emailFromIdToken(idToken) {
  try {
    return JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString()).email || null;
  } catch {
    return null;
  }
}

// Google принимает собственный id события из символов a-v и 0-9 (5-1024). hex подходит, так что
// событие по задаче всегда имеет один и тот же id и его можно обновлять без хранения соответствий.
export const eventId = (userId, taskId) => "dn" + createHash("sha256").update(`${userId}:${taskId}`).digest("hex").slice(0, 40);

export const hashTask = (t) => createHash("sha1").update(`${t.date}|${t.done ? 1 : 0}|${t.text}`).digest("hex").slice(0, 12);

const nextDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

function eventBody(id, t) {
  return {
    id,
    status: "confirmed",
    summary: `${t.done ? "✓ " : ""}${t.text}`.slice(0, 300),
    description: "Daily Notes",
    start: { date: t.date },
    end: { date: nextDay(t.date) },
    transparency: "transparent",
    reminders: { useDefault: false },
    extendedProperties: { private: { source: "daily-notes" } },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Запрос к Calendar API; при превышении лимита запросов (403/429 с rate-причиной) пару раз повторяет с паузой. */
async function gfetch(token, method, url, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (r.status !== 403 && r.status !== 429) return r;
    const reason = (await r.clone().json().catch(() => null))?.error?.errors?.[0]?.reason || "";
    const limited = r.status === 429 || /rateLimit|quotaExceeded/i.test(reason);
    if (!limited) return r;
    if (attempt >= 2) return { status: 429, ok: false };
    await sleep(1000 * (attempt + 1));
  }
}

const result = (r) => (r.status === 401 || r.status === 403 ? "auth" : r.ok ? "ok" : "fail");

/**
 * Создаёт или обновляет событие. Для новой задачи сразу POST, для уже отправленной PUT (экономит запрос).
 * 401/403 без признаков лимита означает, что доступ отозван.
 */
export async function upsertEvent(token, id, t, known) {
  const body = eventBody(id, t);
  let r;
  if (known) {
    r = await gfetch(token, "PUT", `${API}/${id}`, body);
    if (r.status === 404) r = await gfetch(token, "POST", API, body);
  } else {
    r = await gfetch(token, "POST", API, body);
    // 409: событие с таким id уже есть или когда-то было удалено; PUT с status=confirmed обновит или восстановит
    if (r.status === 409) r = await gfetch(token, "PUT", `${API}/${id}`, body);
  }
  return r.status === 429 ? "fail" : result(r);
}

export async function deleteEvent(token, id) {
  const r = await gfetch(token, "DELETE", `${API}/${id}`);
  if (r.status === 404 || r.status === 410) return "ok";
  return r.status === 429 ? "fail" : result(r);
}
