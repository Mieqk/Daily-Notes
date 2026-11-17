import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Task } from "../store";
import { todayISO } from "../store";
import { generateUUID } from "../lib/uuid";
import { applyIslandActions, islandAvailable, islandClear, islandSyncTasks } from "../lib/island";

/**
 * Общий список задач на сегодня с островом Atoll (только приложение для ПК на Windows, где есть мост).
 * Отправляет сегодняшние задачи при каждом изменении и раз в несколько секунд; галочки и новые задачи,
 * сделанные на острове, применяет здесь. Без острова ничего не делает.
 */
export function useIslandTasks(tasks: Record<string, Task[]>, setTasks: Dispatch<SetStateAction<Record<string, Task[]>>>) {
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const busy = useRef(false);
  const wasLinked = useRef(false);

  const sync = useCallback(async () => {
    if (busy.current || !islandAvailable()) return;
    busy.current = true;
    try {
      const day = todayISO();
      const actions = await islandSyncTasks(day, tasksRef.current[day] ?? []);
      if (!actions) { wasLinked.current = false; return; }
      if (!wasLinked.current) { wasLinked.current = true; islandClear("tasks"); }   // остров теперь показывает задачи сам
      if (actions.length === 0) return;
      setTasks((all) => {
        const before = all[day] ?? [];
        const after = applyIslandActions(before, actions, generateUUID);
        return after === before ? all : { ...all, [day]: after };
      });
    } finally {
      busy.current = false;
    }
  }, [setTasks]);

  // при изменении списка (чуть погодя, чтобы не слать каждую букву) и раз в 4 секунды
  useEffect(() => {
    if (!islandAvailable()) return;
    const timer = window.setTimeout(() => { void sync(); }, 200);
    return () => window.clearTimeout(timer);
  }, [tasks, sync]);

  useEffect(() => {
    if (!islandAvailable()) return;
    const timer = window.setInterval(() => { void sync(); }, 4000);
    return () => window.clearInterval(timer);
  }, [sync]);
}
