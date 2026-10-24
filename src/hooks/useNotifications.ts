import { useEffect, useRef } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { friendNotificationsEnabled, notify, registerServiceWorker } from "../lib/notify";
import { PUSH_SYNC_EVENT, syncPush } from "../lib/push";
import { makeSocial } from "../social-strings";
import { todayISO } from "../store";

interface Reminder { time: string; enabled: boolean }

/** Ежедневное напоминание и уведомления о благодарностях и SOS друзей. Пока приложение открыто, показывает их сам; при закрытом их присылает сервер (web-push). */
export function useNotifications(userId: string | null, lang: Lang, reminder: Reminder) {
  const s = makeSocial(lang);
  const sRef = useRef(s);
  sRef.current = s;

  useEffect(() => { registerServiceWorker(); }, []);

  useEffect(() => {
    if (!reminder.enabled) return;
    const tick = () => {
      const d = new Date();
      const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      if (hhmm < reminder.time) return;
      const today = todayISO();
      let last: string | null = null;
      try { last = localStorage.getItem("dn.reminderFired"); } catch { /* ignore */ }
      if (last === today) return;
      try { localStorage.setItem("dn.reminderFired", today); } catch { /* ignore */ }
      notify(sRef.current("ntReminder"), sRef.current("ntReminderBody"), "dn-reminder");
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [reminder.enabled, reminder.time]);

  // Фоновые пуши: держим подписку и её настройки (язык, время напоминания) в Supabase актуальными
  useEffect(() => {
    if (!userId) return;
    const sync = () => { syncPush(userId, { lang, reminderEnabled: reminder.enabled, reminderTime: reminder.time }); };
    sync();
    window.addEventListener(PUSH_SYNC_EVENT, sync);
    return () => window.removeEventListener(PUSH_SYNC_EVENT, sync);
  }, [userId, lang, reminder.enabled, reminder.time]);

  useEffect(() => {
    if (!userId || !supabase) return;
    const channel = supabase
      .channel("friend-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gratitude", filter: `to_user=eq.${userId}` }, (p) => {
        if (friendNotificationsEnabled()) notify(sRef.current("ntThanks"), String((p.new as { text?: string }).text ?? ""), "dn-thanks");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_signals" }, (p) => {
        const row = p.new as { user_id?: string; message?: string | null };
        if (row.user_id !== userId && friendNotificationsEnabled()) notify(sRef.current("ntSos"), row.message ?? "", "dn-sos");
      })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [userId]);
}
