import type { PresenceState } from "../lib/presence";
import { PRESENCE_COLOR } from "../lib/presence";

/** Цветная точка статуса в углу аватара. Для «не в сети» и пустого статуса ничего не рисует, если quiet. */
export default function PresenceDot({ state, label, className = "" }: { state?: PresenceState | null; label?: string; className?: string }) {
  if (!state) return null;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--panel)] ${className}`}
      style={{ background: PRESENCE_COLOR[state] }}
    />
  );
}
