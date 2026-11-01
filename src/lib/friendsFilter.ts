export type FriendFilter = "all" | "online" | "fav";

interface Opts<T> {
  q: string;
  filter: FriendFilter;
  favs: string[];
  id: (x: T) => string;
  name: (x: T) => string;
  online: (x: T) => boolean;
}

/** Поиск по имени и фильтр; в результате сначала избранные, затем те, кто в сети, затем по алфавиту. */
export function filterFriends<T>(list: T[], o: Opts<T>): T[] {
  const q = o.q.trim().toLowerCase();
  const fav = new Set(o.favs);
  return list
    .filter((x) => {
      if (o.filter === "online" && !o.online(x)) return false;
      if (o.filter === "fav" && !fav.has(o.id(x))) return false;
      return !q || o.name(x).toLowerCase().includes(q);
    })
    .map((x, i) => ({ x, i }))
    .sort((a, b) => {
      const fa = fav.has(o.id(a.x)) ? 0 : 1, fb = fav.has(o.id(b.x)) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const oa = o.online(a.x) ? 0 : 1, ob = o.online(b.x) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return o.name(a.x).localeCompare(o.name(b.x)) || a.i - b.i;
    })
    .map((e) => e.x);
}

export const toggleFav = (favs: string[], id: string): string[] => (favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]);
