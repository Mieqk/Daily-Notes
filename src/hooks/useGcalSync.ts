import { useEffect, useRef } from "react";
import type { Task } from "../store";
import { GCAL_CHANGED, gcalEnabled, gcalSync } from "../lib/gcal";

/** Если календарь подключён, через пару секунд после правки задач отправляет их в Google Календарь. */
export function useGcalSync(userId: string | null, tasks: Record<string, Task[]>) {
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const schedule = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      if (!gcalEnabled() || busy.current) return;
      busy.current = true;
      try { await gcalSync(tasksRef.current); } finally { busy.current = false; }
    }, delay);
  };

  useEffect(() => {
    if (userId && gcalEnabled()) schedule(3000);
    return () => window.clearTimeout(timer.current);
  }, [tasks, userId]);

  // подключение только что включили: первая отправка сразу
  useEffect(() => {
    if (!userId) return;
    const on = () => { if (gcalEnabled()) schedule(500); };
    window.addEventListener(GCAL_CHANGED, on);
    return () => window.removeEventListener(GCAL_CHANGED, on);
  }, [userId]);
}
