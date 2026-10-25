import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CHAT_READ_EVENT, fetchUnread } from "../lib/chat";

/** Сколько непрочитанных сообщений от каждого друга. Обновляется в реальном времени и по таймеру на случай обрыва связи. */
export function useChatUnread(userId: string | null) {
  const [byFriend, setByFriend] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!userId) { setByFriend({}); return; }
    setByFriend(await fetchUnread(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!userId || !supabase) return;
    const channel = supabase
      .channel("chat-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `recipient=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, refresh)
      .subscribe();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener(CHAT_READ_EVENT, refresh);
    return () => {
      supabase!.removeChannel(channel);
      window.clearInterval(timer);
      window.removeEventListener(CHAT_READ_EVENT, refresh);
    };
  }, [userId, refresh]);

  const total = Object.values(byFriend).reduce((a, b) => a + b, 0);
  return { byFriend, total };
}
