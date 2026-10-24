// POST /api/push { kind: "gratitude" | "sos", id }  +  Authorization: Bearer <JWT пользователя>
// Рассылает фоновый web-push адресату благодарности или друзьям автора SOS-сигнала.
import { config, sendMany, tr } from "./_push.js";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map();
function tooMany(key) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return list.length > MAX_PER_WINDOW;
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
  if (tooMany(me)) return res.status(429).json({ error: "too many requests" });

  const { kind, id } = req.body || {};
  if ((kind !== "gratitude" && kind !== "sos") || typeof id !== "string" || id.length > 64) {
    return res.status(400).json({ error: "bad request" });
  }

  // 1. Запись должна принадлежать вызывающему, быть свежей и ещё не разосланной.
  //    Условие pushed_at IS NULL в UPDATE делает «первый вызов выигрывает» атомарным.
  const table = kind === "gratitude" ? "gratitude" : "sos_signals";
  const ownerCol = kind === "gratitude" ? "from_user" : "user_id";
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
  } else {
    const { data: fr } = await admin.from("friendships").select("user_a,user_b").eq("status", "accepted").or(`user_a.eq.${me},user_b.eq.${me}`);
    recipients = (fr || []).map((f) => (f.user_a === me ? f.user_b : f.user_a));
  }
  if (!recipients.length) return res.status(200).json({ sent: 0 });

  const { data: subs } = await admin.from("push_subscriptions").select("*").in("user_id", recipients).eq("friends_enabled", true);
  const jobs = (subs || []).map((sub) => {
    const t = tr(sub.lang);
    const payload =
      kind === "gratitude"
        ? { title: t.thanks, body: String(row.text || "").slice(0, 280), tag: "dn-thanks" }
        : { title: t.sos, body: String(row.message || t.sosBody).slice(0, 200), tag: "dn-sos" };
    return [sub, payload];
  });
  const sent = await sendMany(admin, jobs);
  return res.status(200).json({ sent });
}
