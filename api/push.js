// POST /api/push { kind: "gratitude" | "sos" | "chat", id }  +  Authorization: Bearer <JWT пользователя>
// Рассылает фоновый web-push адресату благодарности или сообщения чата либо друзьям автора SOS-сигнала.
import { config, sendMany, tr } from "./_push.js";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const MAX_CHAT_PER_WINDOW = 40; // в переписке сообщения идут чаще, чем благодарности
const hits = new Map();
function tooMany(key, max = MAX_PER_WINDOW) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return list.length > max;
}

const FRESH_MS = 10 * 60_000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const cfg = config();
  if (!cfg) return res.status(500).json({ error: "push is not configured" });
  const { admin } = cfg;

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const { data: auth } = await admin.auth.getUser(token);
  const me = auth?.user?.id;
  if (!me) return res.status(401).json({ error: "unauthorized" });

  const { kind, id } = req.body || {};
  if ((kind !== "gratitude" && kind !== "sos" && kind !== "chat") || typeof id !== "string" || id.length > 64) {
    return res.status(400).json({ error: "bad request" });
  }
  if (kind === "chat" ? tooMany(`${me}:chat`, MAX_CHAT_PER_WINDOW) : tooMany(me)) return res.status(429).json({ error: "too many requests" });

  // 1. Запись должна принадлежать вызывающему, быть свежей и ещё не разосланной.
  //    Условие pushed_at IS NULL в UPDATE делает «первый вызов выигрывает» атомарным.
  const table = kind === "gratitude" ? "gratitude" : kind === "chat" ? "chat_messages" : "sos_signals";
  const ownerCol = kind === "gratitude" ? "from_user" : kind === "chat" ? "sender" : "user_id";
  const { data: row } = await admin
    .from(table)
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", id)
    .eq(ownerCol, me)
    .is("pushed_at", null)
    .gte("created_at", new Date(Date.now() - FRESH_MS).toISOString())
    .select("*")
    .maybeSingle();
  if (!row) return res.status(200).json({ sent: 0 });

  // 2. Кому: адресату благодарности или принятым друзьям автора сигнала.
  let recipients;
  if (kind === "gratitude") {
    recipients = [row.to_user];
  } else if (kind === "chat") {
    recipients = [row.recipient];
  } else {
    const { data: fr } = await admin.from("friendships").select("user_a,user_b").eq("status", "accepted").or(`user_a.eq.${me},user_b.eq.${me}`);
    recipients = (fr || []).map((f) => (f.user_a === me ? f.user_b : f.user_a));
  }
  if (!recipients.length) return res.status(200).json({ sent: 0 });

  const { data: subs } = await admin.from("push_subscriptions").select("*").in("user_id", recipients).eq("friends_enabled", true);
  let senderName = "";
  if (kind === "chat") {
    const { data: prof } = await admin.from("profiles").select("display_name").eq("id", me).maybeSingle();
    senderName = String(prof?.display_name || "").slice(0, 60);
  }
  const jobs = (subs || []).map((sub) => {
    const t = tr(sub.lang);
    const payload =
      kind === "gratitude"
        ? { title: t.thanks, body: String(row.text || "").slice(0, 280), tag: "dn-thanks" }
        : kind === "chat"
          ? { title: senderName || t.chat, body: String(row.body || (row.media_type === "audio" ? t.voice : row.media_type === "video" ? t.video : t.photo)).slice(0, 140), tag: "dn-chat" }
          : { title: t.sos, body: String(row.message || t.sosBody).slice(0, 200), tag: "dn-sos" };
    return [sub, payload];
  });
  const sent = await sendMany(admin, jobs);
  return res.status(200).json({ sent });
}
