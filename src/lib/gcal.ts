import { supabase } from "./supabase";
import { isNativeApp } from "./nativeAuth";
import { shiftISO, todayISO } from "../store";
import type { Task } from "../store";

const FLAG = "dn.gcal";
/** Сколько дней назад и вперёд задачи попадают в календарь. */
const PAST_DAYS = 7;
const FUTURE_DAYS = 120;
export const GCAL_CHANGED = "dn-gcal-changed";

export interface GcalStatus { connected: boolean; email: string | null; lastSync: string | null }

export const gcalEnabled = () => {
  try { return localStorage.getItem(FLAG) === "1"; } catch { return false; }
};
export const setGcalEnabled = (on: boolean) => {
  try { on ? localStorage.setItem(FLAG, "1") : localStorage.removeItem(FLAG); } catch { /* приватный режим */ }
  window.dispatchEvent(new Event(GCAL_CHANGED));
};

/** Причина последнего сбоя запроса (код ответа и текст ошибки сервера), чтобы показать её в настройках. */
export let gcalLastError = "";

async function call<T>(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T | null }> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) { gcalLastError = "no session"; return { ok: false, status: 401, data: null }; }
  try {
    const r = await fetch("/api/gcal", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const json = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    gcalLastError = r.ok && json ? "" : `HTTP ${r.status}${json?.error ? `: ${json.error}` : ""}`;
    return { ok: r.ok, status: r.status, data: json };
  } catch (e) {
    gcalLastError = `network: ${e instanceof Error ? e.message : "fetch failed"}`;
    return { ok: false, status: 0, data: null };
  }
}

export async function gcalStatus(): Promise<GcalStatus | null> {
  const r = await call<GcalStatus>({ action: "status" });
  if (!r.ok || !r.data) return null;
  setGcalEnabled(r.data.connected);
  return r.data;
}

/** Открывает окно согласия Google. В приложении для Android — в системном браузере (WebView Google не пускает). */
export async function gcalConnect(): Promise<boolean> {
  const native = isNativeApp();
  const r = await call<{ url: string }>({ action: "url", native });
  if (!r.ok || !r.data?.url) return false;
  if (native) {
    const cap = (window as unknown as { Capacitor?: { registerPlugin?: (n: string) => { open: (o: { url: string }) => Promise<void> } } }).Capacitor;
    const browser = cap?.registerPlugin?.("Browser");
    if (!browser) return false;
    await browser.open({ url: r.data.url });
  } else {
    window.location.assign(r.data.url);
  }
  return true;
}

export async function gcalDisconnect(): Promise<boolean> {
  const r = await call({ action: "disconnect" });
  if (r.ok) setGcalEnabled(false);
  return r.ok;
}

/** Отправляет задачи ближайших дней; сервер сам создаст, обновит и удалит нужные события. */
export async function gcalSync(tasks: Record<string, Task[]>): Promise<{ ok: boolean; failed: number }> {
  const from = shiftISO(todayISO(), -PAST_DAYS);
  const to = shiftISO(todayISO(), FUTURE_DAYS);
  const list: { id: string; date: string; text: string; done: boolean }[] = [];
  for (const [date, items] of Object.entries(tasks)) {
    if (date < from || date > to) continue;
    for (const t of items ?? []) if (t.text.trim()) list.push({ id: t.id, date, text: t.text, done: t.done });
  }
  // сервер за один вызов делает ограниченное число запросов к Google и сообщает, если осталось ещё
  let failed = 0;
  for (let i = 0; i < 12; i++) {
    const r = await call<{ failed: number; more?: boolean; error?: string }>({ action: "sync", from, tasks: list.slice(0, 400) });
    // доступ отозван в Google или подключения нет: больше не пытаемся; прочие сбои (сеть, сессия) временные
    if (r.status === 404 || (r.status === 401 && r.data?.error === "revoked")) setGcalEnabled(false);
    if (!r.ok) return { ok: false, failed };
    failed += r.data?.failed ?? 0;
    if (!r.data?.more) break;
  }
  return { ok: true, failed };
}
