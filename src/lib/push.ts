import { supabase } from "./supabase";
import { friendNotificationsEnabled } from "./notify";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Boolean(VAPID_PUBLIC);

export interface PushSettings { lang: string; reminderEnabled: boolean; reminderTime: string }

function urlBase64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
}

/** Подписывает браузер (если ещё нет) и сохраняет подписку с настройками в Supabase. */
export async function syncPush(userId: string, s: PushSettings, create = false): Promise<boolean> {
  if (!supabase || !pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await getRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      if (!create) return false;
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!) });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        lang: s.lang,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        reminder_enabled: s.reminderEnabled,
        reminder_time: s.reminderTime,
        friends_enabled: friendNotificationsEnabled(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
    return !error;
  } catch {
    return false;
  }
}

/** Отписывает браузер и удаляет подписку из базы (например, при выходе из аккаунта). */
export async function unsubscribePush() {
  if (!pushSupported()) return;
  try {
    const sub = await (await getRegistration()).pushManager.getSubscription();
    if (!sub) return;
    if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch { /* ignore */ }
}

/** Просит сервер разослать пуш друзьям о только что созданной благодарности, SOS или сообщении чата. */
export async function sendPushEvent(kind: "gratitude" | "sos" | "chat" | "call", id: string) {
  if (!supabase || !pushSupported()) return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, id }),
    });
  } catch { /* пуш — дополнение, ошибка не должна мешать */ }
}

export const PUSH_SYNC_EVENT = "dn-push-sync";
