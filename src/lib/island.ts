// Остров Atoll (Windows): в приложении для ПК (Electron) preload кладёт мост в window.dailyNotesDesktop.island.
// В браузере и на телефоне моста нет, и всё ниже молча ничего не делает. Выключить можно: localStorage "dn.island" = "0".
interface IslandBridge {
  notify(p: { title: string; text: string; url?: string }): Promise<boolean>;
  activity(p: { id: string; text?: string; progress?: number; endsAt?: number; durationSec?: number; ttlSec?: number; clear?: boolean }): Promise<boolean>;
  /** Есть только в новых версиях приложения для ПК. */
  syncTasks?(p: { day: string; tasks: IslandTask[] }): Promise<IslandTaskAction[] | null>;
}

export interface IslandTask { id: string; text: string; done: boolean }
/** Что сделали на острове: отметили (toggle: id, done) или добавили задачу (add: text, done). */
export interface IslandTaskAction { type: "toggle" | "add"; id: string; text: string; done: boolean }

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

let tasksLinked = false;
/** Последний обмен задачами с островом удался: остров сам показывает прогресс, отдельная активность не нужна. */
export const islandTasksLinked = (): boolean => tasksLinked;

/**
 * Общий список задач на сегодня: отправляет свои задачи и возвращает действия, сделанные на острове.
 * null: острова нет, он выключен или старой версии (тогда ничего не меняется).
 */
export async function islandSyncTasks(day: string, tasks: IslandTask[]): Promise<IslandTaskAction[] | null> {
  const sync = bridge()?.syncTasks;
  if (!sync) { tasksLinked = false; return null; }
  let actions: IslandTaskAction[] | null = null;
  try { actions = await sync({ day, tasks: tasks.map(({ id, text, done }) => ({ id, text, done })) }); } catch { actions = null; }
  tasksLinked = Array.isArray(actions);
  return tasksLinked ? actions : null;
}

/** Применяет действия с острова к списку задач дня. Новый список возвращается только если что-то изменилось. */
export function applyIslandActions<T extends IslandTask>(tasks: T[], actions: IslandTaskAction[], newId: () => string): T[] {
  let next = tasks;
  for (const a of actions) {
    if (a.type === "toggle") {
      if (next.some((t) => t.id === a.id && t.done !== a.done)) next = next.map((t) => (t.id === a.id ? { ...t, done: a.done } : t));
    } else if (a.type === "add") {
      const text = a.text.trim();
      if (text) next = [...next, { id: newId(), text, done: a.done } as T];
    }
  }
  return next;
}
