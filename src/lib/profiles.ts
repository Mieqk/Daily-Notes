import { supabase } from "./supabase";

/**
 * Профили других людей читаются через RPC get_public_profiles: сервер сам скрывает то,
 * что владелец закрыл в настройках приватности. Если функции в базе ещё нет (старая схема),
 * падаем на прямой запрос, чтобы приложение не ломалось до выполнения миграции.
 */
export async function fetchProfiles<T extends { id: string }>(ids: string[]): Promise<T[]> {
  if (!supabase || ids.length === 0) return [];
  const rpc = await supabase.rpc("get_public_profiles", { ids });
  if (!rpc.error && Array.isArray(rpc.data)) return rpc.data as T[];
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  return (data ?? []) as T[];
}
