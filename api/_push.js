// Общий код фоновых web-push: клиент Supabase с service_role, VAPID и рассылка.
// Файл с префиксом «_» Vercel не превращает в маршрут.
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const TEXTS = {
  ru: { reminder: "Пора заглянуть в дневник", reminderBody: "Как прошёл день? Запишите пару строк.", thanks: "Вам сказали спасибо", sos: "Друг просит поддержки", sosBody: "Загляните в приложение, ему нужна поддержка." },
  en: { reminder: "Time to open your diary", reminderBody: "How was your day? Write a few lines.", thanks: "Someone thanked you", sos: "A friend asks for support", sosBody: "Open the app: they could use some support." },
};
export const tr = (lang) => TEXTS[String(lang || "").slice(0, 2)] || TEXTS.en;

export function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!url || !serviceKey || !pub || !priv || !subject) return null;
  webpush.setVapidDetails(subject, pub, priv);
  return { admin: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

/** Отправляет один пуш; подписки, которые браузер уже отозвал (404/410), удаляет. Возвращает true при успехе. */
export async function sendTo(admin, sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }
    );
    return true;
  } catch (e) {
    if (e?.statusCode === 404 || e?.statusCode === 410) {
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
    return false;
  }
}

export async function sendMany(admin, jobs) {
  let ok = 0;
  for (let i = 0; i < jobs.length; i += 20) {
    const res = await Promise.all(jobs.slice(i, i + 20).map(([sub, payload]) => sendTo(admin, sub, payload)));
    ok += res.filter(Boolean).length;
  }
  return ok;
}
