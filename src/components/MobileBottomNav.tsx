import { CalendarIcon, StatsIcon, NotebookIcon, SleepIcon, FoodIcon, GearIcon, UsersIcon } from "../icons";
import type { Tab } from "../store";
import type { TKey } from "../i18n";

interface MobileBottomNavProps {
  tab: Tab;
  onTab: (tab: Tab) => void;
  t: (k: TKey) => string;
}

const TABS = [
  { id: "daily" as Tab, icon: CalendarIcon, key: "tabDaily" as TKey },
  { id: "stats" as Tab, icon: StatsIcon, key: "tabStats" as TKey },
  { id: "sleep" as Tab, icon: SleepIcon, key: "tabSleep" as TKey },
  { id: "food" as Tab, icon: FoodIcon, key: "tabFood" as TKey },
  { id: "notes" as Tab, icon: NotebookIcon, key: "tabNotes" as TKey },
  { id: "friends" as Tab, icon: UsersIcon, key: "tabFriends" as TKey },
  { id: "settings" as Tab, icon: GearIcon, key: "tabSettings" as TKey },
];

export default function MobileBottomNav({ tab, onTab, t }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] bg-[var(--panel)] md:hidden safe-bottom">
      <div className="flex items-center justify-around px-0.5 py-2">
        {TABS.map(({ id, icon: Icon, key }) => {
          const label = t(key).split(" ")[0];
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-0.5 py-2 min-w-0 flex-1 transition-all duration-200 ${
                active
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "text-[var(--ink-faint)] hover:bg-[var(--hover)]"
              }`}
              style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className={`max-w-full truncate text-[11px] font-medium tracking-tight ${active ? "" : "max-[379px]:hidden"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
