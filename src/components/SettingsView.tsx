import { useState } from "react";
import type { ReactNode } from "react";
import type { Lang, TKey } from "../i18n";
import type { BgId, WritingFontId } from "../store";
import { FONT_STACKS, hashPin } from "../store";
import { THEMES } from "../themes";
import type { ThemeId } from "../themes";
import { BG_IMAGES } from "../bg";
import {
  AlertIcon,
  CheckIcon,
  DownloadIcon,
  GlobeIcon,
  LockIcon,
  MoodVisual,
  PaletteIcon,
  PenIcon,
  TrashIcon,
} from "../icons";

interface SettingsViewProps {
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  writingFont: WritingFontId;
  onWritingFont: (f: WritingFontId) => void;
  fontScale: number;
  onFontScale: (n: number) => void;
  bg: BgId;
  onBg: (b: BgId) => void;
  moodEmoji: string[];
  onMoodEmoji: (e: string[]) => void;
  pinHash: string | null;
  onPinChange: (hash: string | null) => void;
  onClearAll: () => void;
  onExportMd: () => void;
  onExportJson: () => void;
  t: (k: TKey) => string;
  notesCount: number;
  tasksCount: number;
  showToast: (msg: string) => void;
}

const LANGS: { id: Lang; badge: string; native: string }[] = [
  { id: "ru", badge: "RU", native: "Русский" },
  { id: "en", badge: "EN", native: "English" },
  { id: "be", badge: "BE", native: "Беларуская" },
  { id: "uk", badge: "UK", native: "Українська" },
  { id: "de", badge: "DE", native: "Deutsch" },
  { id: "fr", badge: "FR", native: "Français" },
  { id: "es", badge: "ES", native: "Español" },
];

const FONTS: { id: WritingFontId; key: TKey }[] = [
  { id: "body", key: "fontBody" },
  { id: "serif", key: "fontSerif" },
  { id: "mono", key: "fontMono" },
];

const BGS: { id: BgId; key: TKey }[] = [
  { id: "dots", key: "bgDots" },
  { id: "grid", key: "bgGrid" },
  { id: "paper", key: "bgPaper" },
  { id: "space", key: "bgSpace" },
  { id: "lines", key: "bgLines" },
  { id: "hex", key: "bgHex" },
  { id: "waves", key: "bgWaves" },
];

function Section({
  icon,
  title,
  sub,
  children,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="animate-rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"
      style={{ boxShadow: "var(--shadow-sm)", animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </span>
        <div>
          <h3 className="text-[14.5px] font-bold leading-tight">{title}</h3>
          <p className="text-[11.5px] text-[var(--ink-faint)]">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function SettingsView(props: SettingsViewProps) {
  const {
    theme,
    onTheme,
    lang,
    onLang,
    writingFont,
    onWritingFont,
    fontScale,
    onFontScale,
    bg,
    onBg,
    moodEmoji,
    onMoodEmoji,
    pinHash,
    onPinChange,
    onClearAll,
    t,
    notesCount,
    tasksCount,
    showToast,
  } = props;

  const [confirmClear, setConfirmClear] = useState(false);
  const [pinMode, setPinMode] = useState<null | "edit">(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [pinErr, setPinErr] = useState<string | null>(null);

  const savePin = () => {
    const a = p1.replace(/\D/g, "");
    const b = p2.replace(/\D/g, "");
    if (a.length < 4) {
      setPinErr(t("pinShort"));
      return;
    }
    if (a !== b) {
      setPinErr(t("pinMismatch"));
      return;
    }
    onPinChange(hashPin(a));
    setPinMode(null);
    setP1("");
    setP2("");
    setPinErr(null);
    showToast(t("toastPinOn"));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Appearance */}
        <Section icon={<PaletteIcon className="h-4.5 w-4.5" />} title={t("secAppearance")} sub={t("secAppearanceSub")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEMES.map((th) => {
              const active = th.id === theme;
              return (
                <button
                  key={th.id}
                  onClick={() => onTheme(th.id)}
                  className={`rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.97] ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                  }`}
                >
                  <span className="flex -space-x-1.5">
                    <span className="h-5 w-5 rounded-full border-2 border-[var(--panel)]" style={{ background: th.swatch.accent }} />
                    <span className="h-5 w-5 rounded-full border-2 border-[var(--panel)]" style={{ background: th.swatch.panel }} />
                    <span className="h-5 w-5 rounded-full border-2 border-[var(--panel)]" style={{ background: th.swatch.bg }} />
                  </span>
                  <span className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] font-bold">{th.name[lang]}</span>
                    {active && <CheckIcon className="animate-checkpop h-3.5 w-3.5 text-[var(--accent)]" />}
                  </span>
                  <span className="block text-[10.5px] text-[var(--ink-faint)]">{th.desc[lang]}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Language */}
        <Section icon={<GlobeIcon className="h-4.5 w-4.5" />} title={t("secLanguage")} sub={t("secLanguageSub")} delay={60}>
          <div className="grid grid-cols-2 gap-2">
            {LANGS.map((l) => {
              const active = l.id === lang;
              return (
                <button
                  key={l.id}
                  onClick={() => onLang(l.id)}
                  className={`flex h-14 items-center gap-3 rounded-xl border px-4 transition-all duration-200 active:scale-[0.97] ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                  }`}
                >
                  <span className="grid h-8 w-11 place-items-center rounded-lg bg-[var(--hover)] text-[11px] font-bold text-[var(--ink-soft)]">
                    {l.badge}
                  </span>
                  <span className="flex-1 text-left text-[14px] font-bold">{l.native}</span>
                  {active && <CheckIcon className="animate-checkpop h-4 w-4 text-[var(--accent)]" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Writing font */}
        <Section icon={<PenIcon className="h-4.5 w-4.5" />} title={t("secFont")} sub={t("secFontSub")} delay={120}>
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => {
              const active = writingFont === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onWritingFont(f.id)}
                  className={`rounded-xl border p-3 transition-all duration-200 active:scale-[0.97] ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                  }`}
                >
                  <span className="block text-2xl leading-none" style={{ fontFamily: FONT_STACKS[f.id] }}>
                    Аа
                  </span>
                  <span className="mt-2 flex items-center justify-center gap-1 text-[11.5px] font-bold">
                    {t(f.key)}
                    {active && <CheckIcon className="animate-checkpop h-3 w-3 text-[var(--accent)]" />}
                  </span>
                </button>
              );
            })}
          </div>
          {/* live preview — видно сразу, какой шрифт выбран */}
          <div
            className="mt-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel-2)] px-4 py-3"
            style={{ fontFamily: FONT_STACKS[writingFont] }}
          >
            <p className="text-[15px] leading-relaxed">{t("fontSample")}</p>
            <p className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-deep)]" style={{ fontFamily: "inherit" }}>
              {t("secFont")} · {writingFont === "body" ? t("fontBody") : writingFont === "serif" ? t("fontSerif") : t("fontMono")}
            </p>
          </div>
        </Section>

        {/* Text size */}
        <Section icon={<PenIcon className="h-4.5 w-4.5" />} title={t("secText")} sub={t("secTextSub")} delay={150}>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: 0, key: "sizeS", px: 15 },
                { v: 1, key: "sizeM", px: 20 },
                { v: 2, key: "sizeL", px: 26 },
              ] as { v: number; key: TKey; px: number }[]
            ).map((s) => {
              const active = fontScale === s.v;
              return (
                <button
                  key={s.v}
                  onClick={() => onFontScale(s.v)}
                  className={`flex h-[74px] flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-200 active:scale-[0.97] ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                  }`}
                >
                  <span className="font-display font-bold leading-none" style={{ fontSize: s.px }}>
                    Аа
                  </span>
                  <span className="flex items-center gap-1 text-[11.5px] font-bold">
                    {t(s.key)}
                    {active && <CheckIcon className="animate-checkpop h-3 w-3 text-[var(--accent)]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Background */}
        <Section icon={<PaletteIcon className="h-4.5 w-4.5" />} title={t("secBg")} sub={t("secBgSub")} delay={180}>
          <div className="grid grid-cols-4 gap-2">
            {BGS.map((b) => {
              const active = bg === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => onBg(b.id)}
                  className={`overflow-hidden rounded-xl border transition-all duration-200 active:scale-[0.96] ${
                    active
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
                      : "border-[var(--line)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)]"
                  }`}
                >
                  <span className="block h-14 w-full">
                    {b.id === "dots" && <span className="bg-dots block h-full w-full bg-[var(--panel-2)]" />}
                    {b.id === "grid" && <span className="bg-grid block h-full w-full bg-[var(--panel-2)]" />}
                    {b.id === "paper" && (
                      <img src={BG_IMAGES.paper} alt="" className="h-full w-full object-cover" />
                    )}
                    {b.id === "space" && (
                      <img src={BG_IMAGES.space} alt="" className="h-full w-full object-cover" />
                    )}
                    {b.id === "lines" && (
                      <img src={BG_IMAGES.lines} alt="" className="h-full w-full object-cover" />
                    )}
                    {b.id === "hex" && (
                      <img src={BG_IMAGES.hex} alt="" className="h-full w-full object-cover" />
                    )}
                    {b.id === "waves" && (
                      <img src={BG_IMAGES.waves} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className={`block py-1.5 text-center text-[11px] font-bold ${active ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : ""}`}>
                    {t(b.key)}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Mood emoji */}
        <Section icon={<PenIcon className="h-4.5 w-4.5" />} title={t("secEmoji")} sub={t("secEmojiSub")} delay={240}>
          <div className="grid grid-cols-5 gap-2">
            {moodEmoji.map((emoji, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="grid h-11 w-full place-items-center rounded-lg border border-[var(--line)] bg-[var(--panel-2)]">
                  <MoodVisual level={i} emoji={emoji || undefined} className="h-6 w-6 text-[24px] text-[var(--ink-soft)]" />
                </span>
                <input
                  value={emoji}
                  onChange={(e) => {
                    const next = [...moodEmoji];
                    next[i] = e.target.value.slice(0, 8);
                    onMoodEmoji(next);
                  }}
                  placeholder="…"
                  className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--panel-2)] text-center text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-snug text-[var(--ink-faint)]">{t("emojiHint")}</p>
            <button
              onClick={() => onMoodEmoji(["", "", "", "", ""])}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--accent-deep)] transition-colors hover:bg-[var(--hover)]"
            >
              {t("emojiReset")}
            </button>
          </div>
        </Section>

        {/* Privacy */}
        <Section icon={<LockIcon className="h-4.5 w-4.5" />} title={t("secPrivacy")} sub={t("secPrivacySub")} delay={300}>
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${pinHash ? "bg-[var(--accent)]" : "bg-[var(--ink-faint)]"}`}
            />
            <span className="text-[12.5px] font-semibold">
              {pinHash ? t("pinStatusOn") : t("pinStatusOff")}
            </span>
          </div>
          {pinMode === "edit" ? (
            <div className="flex flex-col gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={p1}
                onChange={(e) => {
                  setP1(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setPinErr(null);
                }}
                placeholder={t("pinNew")}
                className="h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm tracking-[0.3em] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="password"
                inputMode="numeric"
                value={p2}
                onChange={(e) => {
                  setP2(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setPinErr(null);
                }}
                placeholder={t("pinConfirm")}
                className="h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm tracking-[0.3em] outline-none focus:border-[var(--accent)]"
              />
              {pinErr && <p className="text-[12px] font-semibold text-[var(--danger)]">{pinErr}</p>}
              <div className="flex gap-2">
                <button
                  onClick={savePin}
                  className="h-10 flex-1 rounded-lg bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95"
                >
                  {t("pinSave")}
                </button>
                <button
                  onClick={() => {
                    setPinMode(null);
                    setP1("");
                    setP2("");
                    setPinErr(null);
                  }}
                  className="h-10 rounded-lg border border-[var(--line)] px-4 text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPinMode("edit")}
                className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95"
              >
                {pinHash ? t("pinChange") : t("pinSet")}
              </button>
              {pinHash && (
                <button
                  onClick={() => {
                    onPinChange(null);
                    showToast(t("toastPinOff"));
                  }}
                  className="h-10 rounded-lg border border-[var(--line)] px-4 text-[13px] font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                >
                  {t("pinRemove")}
                </button>
              )}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-snug text-[var(--ink-faint)]">{t("pinNote")}</p>
        </Section>
      </div>

      {/* Data */}
      <div className="mt-5">
        <Section icon={<DownloadIcon className="h-4.5 w-4.5" />} title={t("secData")} sub={t("secDataSub")} delay={340}>
          <div className="mb-4 text-[12.5px] text-[var(--ink-soft)]">
            {t("statEntries")}: <b>{notesCount}</b> · {t("statTasksDone").toLowerCase()}: <b>{tasksCount}</b>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => props.onExportMd()}
              className="flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 text-[13px] font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95"
            >
              <DownloadIcon className="h-4 w-4" />
              {t("exportMd")}
            </button>
            <button
              onClick={() => props.onExportJson()}
              className="flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 text-[13px] font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95"
            >
              <DownloadIcon className="h-4 w-4" />
              {t("exportJson")}
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-[var(--danger)] px-4 text-[13px] font-bold text-[var(--danger)] transition-all hover:bg-[var(--danger-soft)] active:scale-95"
            >
              <TrashIcon className="h-4 w-4" />
              {t("clearBtn")}
            </button>
          </div>
        </Section>
      </div>

      {/* Clear confirm modal */}
      {confirmClear && (
        <div
          className="animate-fadein fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]"
          onMouseDown={() => setConfirmClear(false)}
        >
          <div
            className="animate-pop w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-5"
            style={{ boxShadow: "var(--shadow)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
              <AlertIcon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-[16px] font-bold">{t("clearTitle")}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">{t("clearText")}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="h-10 flex-1 rounded-lg border border-[var(--line)] text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="h-10 flex-1 rounded-lg bg-[var(--danger)] text-[13px] font-bold text-white transition-all hover:brightness-110 active:scale-95"
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
