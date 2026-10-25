import { supabase } from "./supabase";
import { fetchProfiles } from "./profiles";

export interface FriendOpt { id: string; name: string }

/** Принятые друзья пользователя: id и отображаемое имя. */
export async function fetchFriendOptions(userId: string): Promise<FriendOpt[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("friendships").select("user_a,user_b").eq("status", "accepted").or(`user_a.eq.${userId},user_b.eq.${userId}`);
  const ids = (data ?? []).map((r) => (r.user_a === userId ? r.user_b : r.user_a) as string);
  const profiles = await fetchProfiles<{ id: string; display_name: string | null; friend_code: string | null }>(ids);
  return profiles.map((p) => ({ id: p.id, name: p.display_name || p.friend_code || "—" }));
}
