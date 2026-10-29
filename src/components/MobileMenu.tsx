import { useEffect, useState } from "react";
import { CalendarIcon, PlanIcon, StatsIcon, NotebookIcon, SleepIcon, HeartIcon, SparkIcon, GearIcon, UsersIcon, XIcon } from "../icons";
import type { Tab } from "../store";
import type { Lang, TKey } from "../i18n";
import { MiniCalendar } from "./Sidebar";

interface MobileMenuProps {
  tab: Tab;
  onTab: (tab: Tab) => void;
  t: (k: TKey) => string;
  lang: Lang;
  selectedDate: string;
  onPickDate: (iso: string) => void;
  hasMood: (iso: string) => boolean;
  friendsBadge?: number;
}

const TABS = [
  { id: "daily" as Tab, icon: CalendarIcon, key: "tabDaily" as TKey },
  { id: "plan" as Tab, icon: PlanIcon, key: "tabPlan" as TKey },
  { id: "stats" as Tab, icon: StatsIcon, key: "tabStats" as TKey },
  { id: "sleep" as Tab, icon: SleepIcon, key: "tabSleep" as TKey },
  { id: "pair" as Tab, icon: HeartIcon, key: "tabPair" as TKey },
  { id: "hobby" as Tab, icon: SparkIcon, key: "tabHobby" as TKey },
  { id: "notes" as Tab, icon: NotebookIcon, key: "tabNotes" as TKey },
  { id: "friends" as Tab, icon: UsersIcon, key: "tabFriends" as TKey },
  { id: "settings" as Tab, icon: GearIcon, key: "tabSettings" as TKey },
];

const L: Record<Lang, { menu: string; close: string }> = {
  ru: { menu: "Меню", close: "Закрыть меню" },
  en: { menu: "Menu", close: "Close menu" },
  be: { menu: "Меню", close: "Закрыць меню" },
  uk: { menu: "Меню", close: "Закрити меню" },
  de: { menu: "Menü", close: "Menü schließen" },
  fr: { menu: "Menu", close: "Fermer le menu" },
  es: { menu: "Menú", close: "Cerrar menú" },
};

/** Телефон: кнопка-«бургер» в шапке и выдвижное меню разделов вместо нижней полосы. */
export default function MobileMenu({ tab, onTab, t, lang, selectedDate, onPickDate, hasMood, friendsBadge = 0 }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const l = L[lang] ?? L.en;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={l.menu}
        aria-expanded={open}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] active:scale-95 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {friendsBadge > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={l.menu}>
          <button className="animate-fadein absolute inset-0 bg-black/45" aria-label={l.close} onClick={() => setOpen(false)} />
          <nav className="animate-fadein safe-top safe-bottom absolute inset-y-0 left-0 flex w-[min(80vw,300px)] flex-col border-r border-[var(--line)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow)" }}>
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <span className="font-display text-[17px] font-bold">{t("name")}</span>
              <button onClick={() => setOpen(false)} aria-label={l.close} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--ink-faint)] hover:bg-[var(--hover)]">
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto px-3 pb-5">
              {TABS.map(({ id, icon: Icon, key }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => { onTab(id); setOpen(false); }}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-12 shrink-0 items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-semibold transition-colors ${
                      active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 truncate">{t(key)}</span>
                    {id === "friends" && friendsBadge > 0 && (
                      <span className="rounded-full bg-[var(--danger)] px-2 py-0.5 text-[11px] font-bold text-white">{friendsBadge}</span>
                    )}
                  </button>
                );
              })}
              {/* Тот же календарик, что в боковой панели на компьютере: выбор дня сразу открывает его */}
              <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5">
                <MiniCalendar selected={selectedDate} onPick={(iso) => { onPickDate(iso); setOpen(false); }} hasMood={hasMood} lang={lang} />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
