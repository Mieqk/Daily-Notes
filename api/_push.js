// Общий код фоновых web-push: клиент Supabase с service_role, VAPID и рассылка.
// Файл с префиксом «_» Vercel не превращает в маршрут.
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const TEXTS = {
  ru: { reminder: "Пора заглянуть в дневник", reminderBody: "Как прошёл день? Запишите пару строк.", thanks: "Вам сказали спасибо", sos: "Друг просит поддержки", sosBody: "Загляните в приложение, ему нужна поддержка.", chat: "Новое сообщение", photo: "📷 Фото", video: "🎥 Видео", voice: "🎤 Голосовое сообщение", call: "Входящий звонок", voiceCall: "📞 Вам звонят", videoCall: "📹 Видеозвонок" },
  en: { reminder: "Time to open your diary", reminderBody: "How was your day? Write a few lines.", thanks: "Someone thanked you", sos: "A friend asks for support", sosBody: "Open the app: they could use some support.", chat: "New message", photo: "📷 Photo", video: "🎥 Video", voice: "🎤 Voice message", call: "Incoming call", voiceCall: "📞 Calling you", videoCall: "📹 Video call" },
};
// Тексты касаний из «Вдвоём» на остальных языках; всё прочее у них берётся из английского.
const TOUCH = {
  ru: { goodmorning: "{name} желает вам доброго утра ☀️", goodnight: "{name} желает вам спокойной ночи 🌙", thinking: "{name} думает о вас 💗" },
  en: { goodmorning: "{name} says good morning ☀️", goodnight: "{name} says good night 🌙", thinking: "{name} is thinking of you 💗" },
  be: { goodmorning: "{name} жадае вам добрай раніцы ☀️", goodnight: "{name} жадае вам добрай ночы 🌙", thinking: "{name} думае пра вас 💗" },
  uk: { goodmorning: "{name} бажає вам доброго ранку ☀️", goodnight: "{name} бажає вам доброї ночі 🌙", thinking: "{name} думає про вас 💗" },
  de: { goodmorning: "{name} wünscht dir einen guten Morgen ☀️", goodnight: "{name} wünscht dir eine gute Nacht 🌙", thinking: "{name} denkt an dich 💗" },
  fr: { goodmorning: "{name} te souhaite un bon matin ☀️", goodnight: "{name} te souhaite une bonne nuit 🌙", thinking: "{name} pense à toi 💗" },
  es: { goodmorning: "{name} te desea buenos días ☀️", goodnight: "{name} te desea buenas noches 🌙", thinking: "{name} piensa en ti 💗" },
};
export const tr = (lang) => {
  const l = String(lang || "").slice(0, 2);
  return { ...TEXTS.en, ...(TEXTS[l] || {}), touch: TOUCH[l] || TOUCH.en, pair: { ru: "Вдвоём", be: "Удвох", uk: "Удвох", de: "Zu zweit", fr: "À deux", es: "En pareja" }[l] || "Together" };
};

export function config() {
  // VITE_SUPABASE_URL это тот проект, с которым работает приложение. SUPABASE_URL может прийти из
  // интеграции Vercel и указывать на другой проект, поэтому он только запасной вариант.
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.APP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
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
