import { cachedPresenceMode } from "./presence";

const PREF_KEY = "dn.notifyFriends";

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export const notificationPermission = (): NotificationPermission | "unsupported" =>
  notificationsSupported() ? Notification.permission : "unsupported";

/** Уведомления от друзей: включены в настройках и не стоит режим «Не беспокоить». */
export function friendNotificationsEnabled(): boolean {
  if (cachedPresenceMode() === "dnd") return false;
  try { return localStorage.getItem(PREF_KEY) !== "0"; } catch { return true; }
}
export function setFriendNotifications(on: boolean) {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  try { await navigator.serviceWorker.register("/sw.js"); } catch { /* ignore */ }
}

/** Запрашивает разрешение (только по действию человека). */
export async function requestNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

export async function notify(title: string, body: string, tag?: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const opts: NotificationOptions = { body, tag, icon: "/icons/icon-192.png" };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch { /* ignore */ }
}
