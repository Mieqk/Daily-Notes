import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "./supabase";
import { isLocalMode } from "./sync";
import { useStored } from "../store";

/** Данные вкладок «Питание», «Тренировки», а также свои шаблоны и плагины: ключ в localStorage = `dn.<key>`, строка в таблице fitness_data. */
export type FitnessKey = "foods" | "foodLog" | "foodGoal" | "workoutLog" | "workoutTpl" | "restLen" | "dayTemplates" | "plugins" | "pluginData";

type Merge<T> = (local: T, remote: T) => T;

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* приватный режим */ } };

/** Список объектов с id: сначала свои, затем чужие, которых ещё нет (по id или по `sameKey`). */
export function mergeById<T extends { id: string }>(sameKey?: (x: T) => string): Merge<T[]> {
  return (local, remote) => {
    const out = [...local];
    const ids = new Set(local.map((x) => x.id));
    const keys = new Set(sameKey ? local.map(sameKey) : []);
    for (const r of remote) {
      if (ids.has(r.id) || (sameKey && keys.has(sameKey(r)))) continue;
      out.push(r);
    }
    return out;
  };
}

/** Журнал «дата -> список записей»: внутри каждой даты объединяем по id. */
export function mergeLog<T extends { id: string }>(): Merge<Record<string, T[]>> {
  const list = mergeById<T>();
  return (local, remote) => {
    const out: Record<string, T[]> = { ...local };
    for (const [d, items] of Object.entries(remote)) out[d] = list(out[d] ?? [], items);
    return out;
  };
}

/** Одиночное значение (цель, пауза): при первом объединении побеждает значение из аккаунта. */
export const preferRemote = <T,>(_local: T, remote: T) => remote;

/**
 * Как useStored, но значение ещё хранится в аккаунте (Supabase).
 * Первый вход с устройства объединяет локальные данные с облачными без потерь и дублей, дальше облако главное.
 * Без входа и в локальном режиме работает как обычный useStored.
 */
export function useSyncedStored<T>(key: FitnessKey, defaultValue: T, merge: Merge<T>): [T, Dispatch<SetStateAction<T>>] {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [value, setValue] = useStored<T>(`dn.${key}`, defaultValue);
  const [ready, setReady] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const lastSent = useRef<string | null>(null);
  const mergedFlag = userId ? `dn.fitMerged.${userId}.${key}` : "";
  const dirtyFlag = `dn.fitDirty.${key}`;

  const push = async (v: T) => {
    if (!supabase || !userId) return false;
    const json = JSON.stringify(v);
    const { error } = await supabase.from("fitness_data").upsert({ user_id: userId, key, value: v, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
    if (error) { console.error("[SYNC] fitness_data", key, error); return false; }
    lastSent.current = json;
    if (JSON.stringify(valueRef.current) === json) safeSet(dirtyFlag, null);
    return true;
  };

  const pull = async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from("fitness_data").select("value").eq("user_id", userId).eq("key", key).maybeSingle();
    if (error) { console.error("[SYNC] fitness_data", key, error); return; }
    const local = valueRef.current;
    if (!data) {
      // В аккаунте пусто: первое устройство, переносим всё локальное
      if (JSON.stringify(local) !== JSON.stringify(defaultValue)) await push(local);
      safeSet(mergedFlag, "1");
    } else {
      const remote = data.value as T;
      const needMerge = safeGet(mergedFlag) !== "1" || safeGet(dirtyFlag) === "1";
      const next = needMerge ? merge(local, remote) : remote;
      lastSent.current = JSON.stringify(remote);
      if (JSON.stringify(next) !== JSON.stringify(local)) setValue(next);
      if (JSON.stringify(next) !== lastSent.current) await push(next);
      safeSet(mergedFlag, "1");
    }
  };

  useEffect(() => {
    setReady(false);
    if (!userId || isLocalMode() || !supabase) return;
    let alive = true;
    void pull().finally(() => { if (alive) setReady(true); });
    const onFocus = () => { if (document.visibilityState === "visible") void pull(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { alive = false; document.removeEventListener("visibilitychange", onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    const json = JSON.stringify(value);
    if (json === lastSent.current) return;
    safeSet(dirtyFlag, "1");
    const timer = setTimeout(() => { void push(value); }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready, userId]);

  return [value, setValue];
}
