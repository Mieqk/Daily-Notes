/** Кем для вас является человек из «Парного»: влияет на значок и оформление шапки. Хранится на устройстве. */

export type PairKind = "love" | "friend" | "family" | "bestie";

export const PAIR_KINDS: { id: PairKind; icon: string; decor: [string, string] }[] = [
  { id: "love", icon: "💗", decor: ["💞", "🌿"] },
  { id: "friend", icon: "🤝", decor: ["✨", "🌿"] },
  { id: "family", icon: "🏡", decor: ["🌼", "🌿"] },
  { id: "bestie", icon: "🌟", decor: ["🎈", "✨"] },
];

export const DEFAULT_KIND: PairKind = "friend";

export const isPairKind = (v: unknown): v is PairKind => PAIR_KINDS.some((k) => k.id === v);

const key = (friendId: string) => `dn.pairKind.${friendId}`;

export function readKind(friendId: string): PairKind {
  try {
    const v = localStorage.getItem(key(friendId));
    return isPairKind(v) ? v : DEFAULT_KIND;
  } catch { return DEFAULT_KIND; }
}

export function writeKind(friendId: string, kind: PairKind): void {
  try { localStorage.setItem(key(friendId), kind); } catch { /* ignore */ }
}

export const kindMeta = (kind: PairKind) => PAIR_KINDS.find((k) => k.id === kind) ?? PAIR_KINDS[1];
