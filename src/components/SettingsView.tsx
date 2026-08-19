import { useState } from "react";
import type { ReactNode } from "react";
import type { Lang, TKey } from "../i18n";
import { THEMES } from "../themes";
import type { ThemeId } from "../themes";
import {
  AlertIcon,
  CheckIcon,
  GearIcon,
  GlobeIcon,
  PaletteIcon,
  PenIcon,
  TrashIcon,
} from "../icons";

interface SettingsViewProps {
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  fontScale: number;
  onFontScale: (n: number) => void;
  onClearAll: () => void;
  t: (k: TKey) => string;
  notesCount: number;
  tasksCount: number;
}

function Section({
  icon,
  title,
  sub,
  children,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </span>
        <div>
          <h3 className="font-display text-[15px] font-bold leading-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{sub}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

const LANG_OPTIONS: { id: Lang; badge: string; native: string }[] = [
  { id: "ru", badge: "RU", native: "Русский" },
  { id: "en", badge: "EN", native: "English" },
];

const SIZE_OPTIONS: { key: TKey; size: string }[] = [
  { key: "sizeS", size: "text-xs" },
  { key: "sizeM", size: "text-sm" },
  { key: "sizeL", size: "text-base" },
];

export default function SettingsView({
  theme,
  onTheme,
  lang,
  onLang,
  fontScale,
  onFontScale,
  onClearAll,
  t,
  notesCount,
  tasksCount,
}: SettingsViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {/* Appearance */}
      <Section icon={<PaletteIcon className="h-5 w-5" />} title={t("secAppearance")} sub={t("secAppearanceSub")}>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((th) => {
            const active = th.id === theme;
            return (
              <button
                key={th.id}
                onClick={() => onTheme(th.id)}
                className={`group relative rounded-xl border-2 p-1.5 text-left transition-all duration-200 ${
                  active
                    ? "border-[var(--accent)]"
                    : "border-[var(--line)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                }`}
                style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                <span
                  className="relative block h-24 overflow-hidden rounded-lg"
                  style={{ background: th.swatch.bg }}
                >
                  <span
                    className="absolute inset-y-0 left-0 w-1/4"
                    style={{ background: th.swatch.panel }}
                  />
                  <span
                    className="absolute left-[8%] top-4 h-2 w-[9%] rounded-full"
                    style={{ background: th.swatch.ink, opacity: 0.35 }}
                  />
                  <span
                    className="absolute left-[8%] top-8 h-2 w-[7%] rounded-full"
                    style={{ background: th.swatch.ink, opacity: 0.2 }}
                  />
                  <span
                    className="absolute left-[34%] top-4 h-2 w-1/2 rounded-full"
                    style={{ background: th.swatch.ink, opacity: 0.55 }}
                  />
                  <span
                    className="absolute left-[34%] top-8 h-2 w-1/3 rounded-full"
                    style={{ background: th.swatch.ink, opacity: 0.28 }}
                  />
                  <span
                    className="absolute bottom-3 right-3 h-4 w-10 rounded-md"
                    style={{ background: th.swatch.accent }}
                  />
                </span>
                <span className="block px-1.5 pb-1 pt-2">
                  <span className="block text-sm font-semibold leading-tight">{th.name[lang]}</span>
                  <span className="block text-[11px] text-[var(--ink-faint)]">{th.desc[lang]}</span>
                </span>
                {active && (
                  <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                    <CheckIcon className="animate-checkpop h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Language */}
      <Section icon={<GlobeIcon className="h-5 w-5" />} title={t("secLanguage")} sub={t("secLanguageSub")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {LANG_OPTIONS.map((l) => {
            const active = l.id === lang;
            return (
              <button
                key={l.id}
                onClick={() => onLang(l.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]/60"
                    : "border-[var(--line)] hover:border-[var(--ink-faint)]"
                }`}
              >
                <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg bg-[var(--hover)] text-xs font-bold tracking-wide text-[var(--ink-soft)]">
                  {l.badge}
                </span>
                <span className="flex-1 text-sm font-semibold">{l.native}</span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
                    active ? "border-[var(--accent)]" : "border-[var(--line)]"
                  }`}
                >
                  {active && <span className="animate-checkpop h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Text size */}
      <Section icon={<PenIcon className="h-5 w-5" />} title={t("secText")} sub={t("secTextSub")}>
        <div className="inline-flex w-full gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-1 sm:w-fit">
          {SIZE_OPTIONS.map((opt, i) => {
            const active = fontScale === i;
            return (
              <button
                key={opt.key}
                onClick={() => onFontScale(i)}
                className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-200 sm:flex-none ${
                  active
                    ? "bg-[var(--accent)] font-semibold text-[var(--accent-ink)]"
                    : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"
                }`}
                style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                <span className={`font-display leading-none ${opt.size}`}>А</span>
                {t(opt.key)}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Data */}
      <Section icon={<GearIcon className="h-5 w-5" />} title={t("secData")} sub={t("secDataSub")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[var(--ink-soft)]">
            <p>
              {t("entriesLabel")}: <b className="text-[var(--ink)]">{notesCount}</b> · {t("tasksWord")}
              : <b className="text-[var(--ink)]">{tasksCount}</b>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">{t("storageHint")}</p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)] transition-all duration-200 hover:bg-[var(--danger-soft)] active:scale-95"
          >
            <TrashIcon className="h-4 w-4" />
            {t("clearBtn")}
          </button>
        </div>
      </Section>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <div className="animate-fadein absolute inset-0 bg-black/55" onMouseDown={() => setConfirmOpen(false)} />
          <div
            className="animate-pop relative w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-6"
            style={{ boxShadow: "var(--shadow)" }}
          >
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
                <AlertIcon className="h-5 w-5" />
              </span>
              <div>
                <h4 className="font-display text-lg font-bold leading-tight">{t("clearTitle")}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{t("clearText")}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-medium transition-all duration-200 hover:bg-[var(--hover)] active:scale-95"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setConfirmOpen(false);
                }}
                className="h-11 rounded-xl bg-[var(--danger)] px-5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
              >
                {t("erase")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
