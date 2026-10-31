// GET /api/turn  +  Authorization: Bearer <JWT пользователя>
// Отдаёт список ICE-серверов для звонков. Без настроенного TURN работает только STUN: звонок пройдёт не во всех сетях.
// Настройка (любой из вариантов, в Vercel -> Environment Variables):
//   METERED_DOMAIN + METERED_API_KEY       (metered.ca, бесплатный тариф)
//   или TURN_URLS (через запятую) + TURN_USERNAME + TURN_CREDENTIAL (свой сервер, например coturn)
import { createClient } from "@supabase/supabase-js";

const STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(200).json({ iceServers: STUN, turn: false });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user?.id) return res.status(401).json({ error: "unauthorized" });

  const { TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL } = process.env;
  // Терпим типичные ошибки при вводе: пробелы, "https://" и слэш в конце адреса
  const METERED_DOMAIN = (process.env.METERED_DOMAIN || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const METERED_API_KEY = (process.env.METERED_API_KEY || "").trim();
  try {
    if (METERED_DOMAIN && METERED_API_KEY) {
      const r = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(METERED_API_KEY)}`);
      if (r.ok) {
        const list = await r.json();
        if (Array.isArray(list) && list.length) return res.status(200).json({ iceServers: [...STUN, ...list], turn: true });
      }
    }
  } catch { /* падаем на запасной вариант */ }
  if (TURN_URLS && TURN_USERNAME && TURN_CREDENTIAL) {
    const urls = TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean);
    return res.status(200).json({ iceServers: [...STUN, { urls, username: TURN_USERNAME, credential: TURN_CREDENTIAL }], turn: true });
  }
  return res.status(200).json({ iceServers: STUN, turn: false });
}
