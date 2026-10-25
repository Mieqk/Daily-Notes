import type { ReactNode } from "react";

interface FriendsSectionProps {
  icon?: string;
  title: string;
  hint?: string;
  count?: number;
  action?: ReactNode;
  accent?: boolean;
  className?: string;
  children: ReactNode;
}

// Единая карточка-раздел вкладки «Друзья»: иконка-плашка, заголовок, счётчик и действие справа.
export default function FriendsSection({ icon, title, hint, count, action, accent, className = "mb-4", children }: FriendsSectionProps) {
  return (
    <section
      className={`animate-rise overflow-hidden rounded-2xl border bg-[var(--panel)] ${accent ? "border-[var(--accent)]/40" : "border-[var(--line)]"} ${className}`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* на узком экране кнопка действия переезжает под заголовок, а не сжимает его */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-1 basis-[12rem] items-center gap-3">
        {icon && (
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[17px]">{icon}</span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-[15px] font-bold leading-tight">
            <span className="truncate">{title}</span>
            {count !== undefined && count > 0 && (
              <span className="rounded-full bg-[var(--hover)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--ink-soft)]">{count}</span>
            )}
          </h3>
          {hint && <p className="mt-0.5 text-[12px] leading-snug text-[var(--ink-faint)]">{hint}</p>}
        </div>
        </div>
        {action && <div className="ml-[2.375rem] shrink-0">{action}</div>}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center gap-3 px-1 first:mt-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{children}</span>
      <span className="h-px flex-1 bg-[var(--line)]" />
    </div>
  );
}

export function EmptyState({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--line)] px-3.5 py-3 text-[13px] text-[var(--ink-faint)]">
      <span aria-hidden className="text-[18px] opacity-70">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
