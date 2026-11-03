import { useEffect, useRef } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { friendNotificationsEnabled, notify, registerServiceWorker } from "../lib/notify";
import { PUSH_SYNC_EVENT, syncPush } from "../lib/push";
import { PRESENCE_MODE_EVENT } from "../lib/presence";
import { makeSocial } from "../social-strings";
import { makeChat } from "../chat-strings";
import { makeMedia } from "../media-strings";
import { todayISO } from "../store";

interface Reminder { time: string; enabled: boolean }

/** Ежедневное напоминание и уведомления о благодарностях и SOS друзей. Пока приложение открыто, показывает их сам; при закрытом их присылает сервер (web-push). */
export function useNotifications(userId: string | null, lang: Lang, reminder: Reminder, wroteToday: () => boolean = () => false) {
  const wroteRef = useRef(wroteToday);
  wroteRef.current = wroteToday;
  const s = makeSocial(lang);
  const sRef = useRef(s);
  sRef.current = s;
  const cRef = useRef(makeChat(lang));
  cRef.current = makeChat(lang);
  const vRef = useRef(makeMedia(lang));
  vRef.current = makeMedia(lang);

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
      if (wroteRef.current()) return; // запись за сегодня уже есть: как и сервер, не напоминаем
      notify(sRef.current("ntReminder"), sRef.current("ntReminderBody"), "dn-reminder");
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [reminder.enabled, reminder.time]);

  // Фоновые пуши: держим подписку и её настройки (язык, время напоминания) в Supabase актуальными
  useEffect(() => {
    if (!userId) return;
    // create: разрешение уже выдано человеком, поэтому подписку создаём сами (и пересоздаём, если браузер её сбросил)
    const sync = () => { void syncPush(userId, { lang, reminderEnabled: reminder.enabled, reminderTime: reminder.time }, true); };
    const onVis = () => { if (!document.hidden) sync(); };
    sync();
    window.addEventListener(PUSH_SYNC_EVENT, sync);
    window.addEventListener(PRESENCE_MODE_EVENT, sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(PUSH_SYNC_EVENT, sync);
      window.removeEventListener(PRESENCE_MODE_EVENT, sync);
    };
  }, [userId, lang, reminder.enabled, reminder.time]);

  useEffect(() => {
    if (!userId || !supabase) return;
    const channel = supabase
      .channel("friend-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gratitude", filter: `to_user=eq.${userId}` }, (p) => {
        if (friendNotificationsEnabled()) notify(sRef.current("ntThanks"), String((p.new as { text?: string }).text ?? ""), "dn-thanks");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient=eq.${userId}` }, (p) => {
        // открытая вкладка сообщение и так показывает; уведомляем, только когда её не видно
        if (!document.hidden || !friendNotificationsEnabled()) return;
        const row = p.new as { body?: string | null; media_type?: string | null };
        const c = cRef.current;
        notify(c("newMsg"), row.body || (row.media_type === "audio" ? vRef.current("voice") : row.media_type === "video" ? c("video") : c("photo")), "dn-chat");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_signals" }, (p) => {
        const row = p.new as { user_id?: string; message?: string | null };
        if (row.user_id !== userId && friendNotificationsEnabled()) notify(sRef.current("ntSos"), row.message ?? "", "dn-sos");
      })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [userId]);
}
