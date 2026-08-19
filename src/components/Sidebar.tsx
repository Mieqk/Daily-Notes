import { useState } from "react";
import type { ReactNode } from "react";
import type { Lang, TKey } from "../i18n";
import type { Tab } from "../store";
import { THEMES, themeMeta } from "../themes";
import type { ThemeId } from "../themes";
import Dropdown from "./Dropdown";
import {
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  FlameIcon,
  GearIcon,
  GlobeIcon,
  NotebookIcon,
  PaletteIcon,
  PenIcon,
} from "../icons";

interface SidebarProps {
  tab: Tab;
  onTab: (t: Tab) => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  t: (k: TKey) => string;
  streak: number;
  weekMarks: boolean[];
  notesCount: number;
}

type MenuId = "theme" | "lang" | null;

const TABS: { id: Tab; icon: (p: { className?: string }) => ReactNode; key: TKey }[] = [
  { id: "daily", icon: CalendarIcon, key: "tabDaily" },
  { id: "notes", icon: NotebookIcon, key: "tabNotes" },
  { id: "settings", icon: GearIcon, key: "tabSettings" },
];

const LANGS: { id: Lang; badge: string; native: string }[] = [
  { id: "ru", badge: "RU", native: "Русский" },
  { id: "en", badge: "EN", native: "English" },
];

export default function Sidebar({
  tab,
  onTab,
  theme,
  onTheme,
  lang,
  onLang,
  t,
  streak,
  weekMarks,
  notesCount,
}: SidebarProps) {
  const [menu, setMenu] = useState<MenuId>(null);
  const toggle = (m: Exclude<MenuId, null>) => setMenu((cur) => (cur === m ? null : m));
  const close = () => setMenu(null);

  /* ---------- Panels ---------- */

  const themePanel = (
    <>
      <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {t("themeTitle")}
      </div>
      <div className="flex flex-col gap-0.5">
        {THEMES.map((th) => {
          const active = th.id === theme;
          return (
            <button
              key={th.id}
              onClick={() => {
                onTheme(th.id);
                close();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--hover)] active:scale-[0.98]"
              }`}
            >
              <span className="flex shrink-0 -space-x-1.5">
                <span
                  className="h-5 w-5 rounded-full border-2 border-[var(--panel-2)]"
                  style={{ background: th.swatch.accent }}
                />
                <span
                  className="h-5 w-5 rounded-full border-2 border-[var(--panel-2)]"
                  style={{ background: th.swatch.panel }}
                />
                <span
                  className="h-5 w-5 rounded-full border-2 border-[var(--panel-2)]"
                  style={{ background: th.swatch.bg }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{th.name[lang]}</span>
                <span className="block text-[11px] text-[var(--ink-faint)]">{th.desc[lang]}</span>
              </span>
              {active && (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <CheckIcon className="animate-checkpop h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const langPanel = (
    <>
      <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {t("langTitle")}
      </div>
      <div className="flex flex-col gap-0.5">
        {LANGS.map((l) => {
          const active = l.id === lang;
          return (
            <button
              key={l.id}
              onClick={() => {
                onLang(l.id);
                close();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--hover)] active:scale-[0.98]"
              }`}
            >
              <span className="grid h-8 w-11 shrink-0 place-items-center rounded-lg bg-[var(--hover)] text-[11px] font-bold tracking-wide text-[var(--ink-soft)]">
                {l.badge}
              </span>
              <span className="flex-1 text-sm font-semibold">{l.native}</span>
              {active && (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <CheckIcon className="animate-checkpop h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  /* ---------- Reusable footer button with dropdown ---------- */

  const menuButton = (
    id: Exclude<MenuId, null>,
    icon: ReactNode,
    label: string,
    value: string,
    panel: ReactNode,
    direction: "up" | "down",
    compact = false
  ) => {
    const open = menu === id;
    return (
      <div className="relative">
        <button
          onClick={() => toggle(id)}
          aria-expanded={open}
          className={
            compact
              ? `grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-all duration-200 active:scale-95 ${
                  open
                    ? "border-[var(--accent)] bg-[var(--hover)] text-[var(--accent)]"
                    : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-soft)] hover:border-[var(--ink-faint)] hover:text-[var(--ink)]"
                }`
              : `flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition-all duration-200 active:scale-[0.98] ${
                  open
                    ? "border-[var(--accent)] bg-[var(--hover)]"
                    : "border-[var(--line)] bg-[var(--panel-2)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                }`
          }
          style={compact ? undefined : { boxShadow: "var(--shadow-sm)" }}
        >
          {compact ? (
            icon
          ) : (
            <>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                {icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium text-[var(--ink-faint)]">{label}</span>
                <span className="block truncate text-sm font-semibold">{value}</span>
              </span>
              <ChevronIcon
                className={`h-4 w-4 shrink-0 text-[var(--ink-faint)] transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>
        <Dropdown open={open} onClose={close} direction={direction} align={direction === "up" ? "start" : "end"} width={252}>
          {panel}
        </Dropdown>
      </div>
    );
  };

  return (
    <>
      {/* ================= Mobile top bar ================= */}
      <div className="relative z-30 flex items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 md:hidden">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
          <PenIcon className="h-4 w-4" />
        </span>
        <span className="font-display hidden text-[13px] font-bold tracking-tight min-[420px]:block">
          {t("name")}
        </span>
        <nav className="flex flex-1 justify-center gap-1">
          {TABS.map(({ id, icon: Icon, key }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => onTab(id)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-all duration-200 ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden min-[560px]:inline">{t(key)}</span>
              </button>
            );
          })}
        </nav>
        {menuButton("theme", <PaletteIcon className="h-4.5 w-4.5" />, t("theme"), themeMeta(theme).name[lang], themePanel, "down", true)}
        {menuButton("lang", <GlobeIcon className="h-4.5 w-4.5" />, t("language"), lang === "ru" ? "Русский" : "English", langPanel, "down", true)}
      </div>

      {/* ================= Desktop sidebar ================= */}
      <aside className="relative z-30 hidden w-[290px] shrink-0 flex-col gap-6 overflow-visible border-r border-[var(--line)] bg-[var(--panel)] px-5 pb-5 pt-6 md:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <PenIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="font-display block text-[15px] font-bold leading-tight tracking-tight">
              {t("name")}
            </span>
            <span className="block text-xs text-[var(--ink-faint)]">{t("tagline")}</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1.5">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {t("sections")}
          </div>
          {TABS.map(({ id, icon: Icon, key }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => onTab(id)}
                className={`group flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--ink-soft)] hover:translate-x-0.5 hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                }`}
                style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{t(key)}</span>
                {id === "notes" && notesCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      active
                        ? "bg-[var(--accent-ink)]/20 text-[var(--accent-ink)]"
                        : "bg-[var(--hover)] text-[var(--ink-faint)]"
                    }`}
                  >
                    {notesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Streak card */}
        <div
          className="mt-auto rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <FlameIcon className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-semibold">{t("streakTitle")}</span>
          </div>
          {streak > 0 ? (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold leading-none text-[var(--accent)]">
                {streak}
              </span>
              <span className="text-xs text-[var(--ink-faint)]">{t("streakDays")}</span>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-[var(--ink-faint)]">{t("streakZero")}</p>
          )}
          <div className="mt-3 flex items-center gap-1.5">
            {weekMarks.map((marked, i) => (
              <span
                key={i}
                title={t("weekLabel")}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  marked
                    ? "bg-[var(--accent)]"
                    : i === weekMarks.length - 1
                      ? "border border-dashed border-[var(--ink-faint)]"
                      : "bg-[var(--hover)]"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            {t("weekLabel")}
          </div>
        </div>

        {/* Footer: theme & language buttons with dropdowns */}
        <div className="flex flex-col gap-3">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {t("personalize")}
          </div>
          {menuButton(
            "theme",
            <PaletteIcon className="h-4 w-4" />,
            t("theme"),
            themeMeta(theme).name[lang],
            themePanel,
            "up"
          )}
          {menuButton(
            "lang",
            <GlobeIcon className="h-4 w-4" />,
            t("language"),
            lang === "ru" ? "Русский" : "English",
            langPanel,
            "up"
          )}
          <p className="px-1 text-[11px] leading-relaxed text-[var(--ink-faint)]">{t("storageHint")}</p>
        </div>
      </aside>
    </>
  );
}
