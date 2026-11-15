// Остров Atoll (Windows): в приложении для ПК (Electron) preload кладёт мост в window.dailyNotesDesktop.island.
// В браузере и на телефоне моста нет, и всё ниже молча ничего не делает. Выключить можно: localStorage "dn.island" = "0".
interface IslandBridge {
  notify(p: { title: string; text: string; url?: string }): Promise<boolean>;
  activity(p: { id: string; text?: string; progress?: number; endsAt?: number; durationSec?: number; ttlSec?: number; clear?: boolean }): Promise<boolean>;
}

const bridge = (): IslandBridge | undefined => {
  try {
    if (localStorage.getItem("dn.island") === "0") return undefined;
  } catch { /* ignore */ }
  return (window as unknown as { dailyNotesDesktop?: { island?: IslandBridge } }).dailyNotesDesktop?.island;
};

export const islandAvailable = (): boolean => !!bridge();

/** Всплывающее уведомление на острове; клик откроет url (только наш сайт). */
export function islandNotify(title: string, text: string, url?: string): void {
  void bridge()?.notify({ title, text, url }).catch(() => {});
}

/** Живая активность в пилюле острова (задача дня, таймер отдыха…). Повтор с тем же id обновляет её. */
export function islandActivity(id: string, p: { text?: string; progress?: number; endsAt?: number; durationSec?: number; ttlSec?: number }): void {
  void bridge()?.activity({ id, ...p }).catch(() => {});
}

export function islandClear(id: string): void {
  void bridge()?.activity({ id, clear: true }).catch(() => {});
}
