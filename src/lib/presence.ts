import { supabase } from "./supabase";

export type PresenceMode = "auto" | "away" | "dnd" | "hidden";
export type PresenceState = "online" | "away" | "dnd" | "offline";

export const PRESENCE_MODES: PresenceMode[] = ["auto", "away", "dnd", "hidden"];
/** Режим сменился: подписка на уведомления и экран «Друзья» обновляются. */
export const PRESENCE_MODE_EVENT = "dn-presence-mode";
const KEY = "dn.presenceMode";
const IDLE_MS = 5 * 60_000;
const BEAT_MS = 45_000;

export function cachedPresenceMode(): PresenceMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "away" || v === "dnd" || v === "hidden" ? v : "auto";
  } catch { return "auto"; }
}
export function cachePresenceMode(m: PresenceMode) {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
}

export const PRESENCE_COLOR: Record<PresenceState, string> = {
  online: "#22c55e",
  away: "#f59e0b",
  dnd: "#ef4444",
  offline: "#9ca3af",
};

/** Пока приложение открыто и видно, раз в ~45 с сообщает серверу «я на месте»; без ввода 5 минут помечает «не активен». */
export function startPresenceHeartbeat(userId: string): () => void {
  if (!supabase) return () => {};
  // режим хранится в аккаунте: подтягиваем его на это устройство, чтобы «Не беспокоить» работало и здесь
  supabase.from("profiles").select("presence_mode").eq("id", userId).maybeSingle().then(({ data }) => {
    const m = (data as { presence_mode?: string } | null)?.presence_mode;
    if (m === "auto" || m === "away" || m === "dnd" || m === "hidden") {
      cachePresenceMode(m);
      window.dispatchEvent(new Event(PRESENCE_MODE_EVENT));
    }
  }, () => {});
  let lastInput = Date.now();
  const onInput = () => { lastInput = Date.now(); };
  const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
  events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
  const beat = () => {
    if (document.hidden) return;
    supabase!.rpc("touch_presence", { idle: Date.now() - lastInput > IDLE_MS }).then(() => {}, () => {});
  };
  beat();
  const timer = window.setInterval(beat, BEAT_MS);
  const onVis = () => { if (!document.hidden) { lastInput = Date.now(); beat(); } };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVis);
    events.forEach((e) => window.removeEventListener(e, onInput));
  };
}
