import { supabase } from "./supabase";
import { pushSupported, syncPush, type PushSettings } from "./push";
import type { QuickReminder } from "./quickRemind";

/**
 * Фоновый пуш для быстрого напоминания. Работает, только если человек вошёл в аккаунт и разрешил уведомления:
 * тогда текст и время уходят в Supabase (таблица quick_reminders), и сервер присылает пуш, даже когда приложение закрыто.
 * Без входа напоминание живёт только на устройстве. Ошибки молча игнорируем: пуш это дополнение.
 */
export async function scheduleQuickPush(userId: string | null, r: QuickReminder, settings: PushSettings): Promise<void> {
  if (!userId || !supabase || !pushSupported() || Notification.permission !== "granted") return;
  try {
    if (!(await syncPush(userId, settings, true))) return;
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from("quick_reminders").upsert(
      { id: r.id, user_id: userId, endpoint: sub.endpoint, body: r.text, remind_at: new Date(r.at).toISOString(), lang: settings.lang, sent_at: null },
      { onConflict: "id" }
    );
  } catch { /* ignore */ }
}

export async function cancelQuickPush(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from("quick_reminders").delete().eq("id", id); } catch { /* ignore */ }
}
