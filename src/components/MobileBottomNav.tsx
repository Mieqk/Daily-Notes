import { DailyIcon, StatsIcon, NotesIcon, SleepIcon, SettingsIcon } from "../icons";
import type { Tab } from "../store";

interface MobileBottomNavProps {
  tab: Tab;
  onTab: (tab: Tab) => void;
}

const TABS = [
  { id: "daily" as Tab, icon: DailyIcon, label: "daily" },
  { id: "stats" as Tab, icon: StatsIcon, label: "stats" },
  { id: "notes" as Tab, icon: NotesIcon, label: "notes" },
  { id: "sleep" as Tab, icon: SleepIcon, label: "sleep" },
  { id: "settings" as Tab, icon: SettingsIcon, label: "settings" },
];

export default function MobileBottomNav({ tab, onTab }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] bg-[var(--panel)] md:hidden safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 min-w-[60px] transition-all duration-200 ${
                active
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "text-[var(--ink-faint)] hover:bg-[var(--hover)]"
              }`}
              style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium capitalize">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
