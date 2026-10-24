// GET|POST /api/push-reminders  +  Authorization: Bearer <CRON_SECRET>
// Вызывается по расписанию (каждые 5-15 минут): шлёт ежедневное напоминание тем, у кого наступило
// время (в часовом поясе подписки), если запись за сегодня ещё не сделана. Раз в сутки на подписку.
import { timingSafeEqual } from "node:crypto";
import { config, sendMany, tr } from "./_push.js";

// Окно после назначенного времени: если расписание пропустило запуск, напоминание ещё уйдёт
const WINDOW_MIN = 180;

function localParts(tz, now) {
  let f;
  try {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const hh = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(hh) * 60 + Number(p.minute) };
}

const toMinutes = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m; };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
  const cfg = config();
  if (!cfg) return res.status(500).json({ error: "push is not configured" });
  const { admin } = cfg;

  const now = new Date();
  const { data: subs, error } = await admin.from("push_subscriptions").select("*").eq("reminder_enabled", true);
  if (error) return res.status(500).json({ error: "db error" });

  const due = [];
  for (const sub of subs || []) {
    const { date, minutes } = localParts(sub.tz, now);
    const diff = minutes - toMinutes(sub.reminder_time);
    if (diff >= 0 && diff < WINDOW_MIN && sub.last_reminder_date !== date) due.push({ sub, date });
  }
  if (!due.length) return res.status(200).json({ due: 0, sent: 0 });

  // Кто уже писал сегодня, тому напоминать не нужно
  const users = [...new Set(due.map((d) => d.sub.user_id))];
  const dates = [...new Set(due.map((d) => d.date))];
  const { data: entries } = await admin.from("entries").select("user_id,date,content").in("user_id", users).in("date", dates);
  const wrote = new Set((entries || []).filter((e) => String(e.content || "").trim()).map((e) => `${e.user_id}|${e.date}`));

  const toSend = due.filter((d) => !wrote.has(`${d.sub.user_id}|${d.date}`));
  const sent = await sendMany(admin, toSend.map(({ sub }) => {
    const t = tr(sub.lang);
    return [sub, { title: t.reminder, body: t.reminderBody, tag: "dn-reminder" }];
  }));

  // Отмечаем день и для пропущенных (запись уже есть), чтобы не проверять их каждые 10 минут
  await Promise.all(due.map(({ sub, date }) => admin.from("push_subscriptions").update({ last_reminder_date: date }).eq("id", sub.id)));
  return res.status(200).json({ due: due.length, sent });
}
