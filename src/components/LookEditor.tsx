import type { Lang } from "../i18n";
import type { ThemeId } from "../themes";
import { ACCENT_PRESETS, COLOR_TOKENS, DEFAULT_LOOK, customVars } from "../look";
import type { ColorToken, Look } from "../look";
import { makeLook } from "../look-strings";
import { makeThemeStrings } from "../theme-strings";
import { isThemeKey } from "../theme-strings";
import type { ThemeKey } from "../theme-strings";
import type { LookKey } from "../look-strings";

interface Props {
  look: Look;
  onLook: (l: Look) => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  lang: Lang;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{title}</p>
      {children}
    </div>
  );
}

const TOKEN_LABEL: Record<ColorToken, ThemeKey> = {
  bg: "tkBg", panel: "tkPanel", "panel-2": "tkPanel2", hover: "tkHover", line: "tkLine",
  ink: "tkInk", "ink-soft": "tkInkSoft", "ink-faint": "tkInkFaint",
  accent: "tkAccent", "accent-deep": "tkAccentDeep", "accent-ink": "tkAccentInk", "accent-soft": "tkAccentSoft", danger: "tkDanger",
};

/** Текущий (рассчитанный) цвет переменной в виде #rrggbb, чтобы палитра открывалась с него. */
function autoHex(look: Look, k: ColorToken): string {
  const probe = document.createElement("span");
  probe.style.color = customVars(look)[`--${k}`] ?? "";
  document.body.appendChild(probe);
  const css = getComputedStyle(probe).color;
  probe.remove();
  // rgb(1, 2, 3) или color(srgb 0.1 0.2 0.3)
  const nums = css.match(/[\d.]+/g)?.map(Number) ?? [];
  const rgb = css.startsWith("color(") ? nums.slice(0, 3).map((n) => n * 255) : nums.slice(0, 3);
  if (rgb.length < 3) return "#888888";
  return "#" + rgb.map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("");
}

export default function LookEditor({ look, onLook, theme, onTheme, lang }: Props) {
  const t = makeLook(lang);
  const ts = makeThemeStrings(lang);
  const custom = theme === "custom";
  // любая правка цветов сразу включает тему «Своя», чтобы результат был виден
  const setColors = (patch: Partial<Look>) => {
    onLook({ ...look, ...patch });
    if (!custom) onTheme("custom");
  };

  const choice = <V extends string>(items: { v: V; k: LookKey | ThemeKey }[], value: V, set: (v: V) => void) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))" }}>
      {items.map((it) => {
        const active = value === it.v;
        return (
          <button
            key={it.v}
            onClick={() => set(it.v)}
            aria-pressed={active}
            className={`flex min-h-10 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-[12px] font-bold leading-tight transition-all duration-200 active:scale-[0.97] ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-faint)]"
            }`}
          >
            {isThemeKey(it.k) ? ts(it.k) : t(it.k)}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <Group title={t("lkColors")}>
        {!custom && (
          <button
            onClick={() => onTheme("custom")}
            className="mb-2 w-full rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-left text-[12px] text-[var(--ink-soft)] hover:border-[var(--ink-faint)]"
          >
            {t("lkPickCustom")} · <span className="font-bold text-[var(--accent-deep)]">{t("lkEnable")}</span>
          </button>
        )}
        {choice([{ v: "light", k: "lkLight" }, { v: "dark", k: "lkDark" }], look.base, (v) => setColors({ base: v }))}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => setColors({ accent: c })}
              className={`h-7 w-7 rounded-full border-2 transition-transform active:scale-90 ${look.accent === c ? "border-[var(--ink)]" : "border-[var(--panel)]"}`}
              style={{ background: c, boxShadow: "0 0 0 1px var(--line)" }}
            />
          ))}
          <label className="ml-1 flex items-center gap-2 text-[12px] font-bold text-[var(--ink-soft)]">
            <input
              type="color"
              value={look.accent}
              onChange={(e) => setColors({ accent: e.target.value })}
              aria-label={t("lkAccent")}
              className="h-7 w-9 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0"
            />
            {t("lkAccent")}
          </label>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px]">
          <input type="checkbox" checked={look.tint} onChange={(e) => setColors({ tint: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
          {t("lkTint")}
        </label>
      </Group>

      <Group title={t("lkAdv")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { key: "bgColor", label: "lkBgColor", fallback: "#f4f3ef" },
            { key: "inkColor", label: "lkInkColor", fallback: "#1d1d1b" },
          ] as const).map((c) => (
            <div key={c.key} className="flex items-center gap-2 text-[12px] font-bold text-[var(--ink-soft)]">
              <input
                type="color"
                value={look[c.key] || c.fallback}
                onChange={(e) => setColors({ [c.key]: e.target.value })}
                aria-label={t(c.label)}
                className="h-7 w-9 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0"
              />
              <span className="flex-1">{t(c.label)}</span>
              {look[c.key] && (
                <button onClick={() => onLook({ ...look, [c.key]: "" })} className="text-[11px] text-[var(--accent-deep)] underline">
                  {t("lkAutoColor")}
                </button>
              )}
            </div>
          ))}
        </div>
      </Group>

      <details className="group mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
        <summary className="cursor-pointer list-none text-[12.5px] font-bold">
          <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
          {ts("lkPalette")}
          {Object.keys(look.colors).length > 0 && <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] text-[var(--accent-deep)]">{Object.keys(look.colors).length}</span>}
        </summary>
        <p className="mb-3 mt-1.5 text-[11.5px] leading-snug text-[var(--ink-faint)]">{ts("lkPaletteHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLOR_TOKENS.map((k) => {
            const own = look.colors[k];
            return (
              <div key={k} className="flex items-center gap-2 text-[12px] font-semibold text-[var(--ink-soft)]">
                <input
                  type="color"
                  value={own || autoHex(look, k)}
                  onChange={(e) => setColors({ colors: { ...look.colors, [k]: e.target.value } })}
                  aria-label={ts(TOKEN_LABEL[k])}
                  className={`h-7 w-9 shrink-0 cursor-pointer rounded border bg-transparent p-0 ${own ? "border-[var(--accent)]" : "border-[var(--line)]"}`}
                />
                <span className="flex-1 truncate">{ts(TOKEN_LABEL[k])}</span>
                {own && (
                  <button
                    onClick={() => { const rest = { ...look.colors }; delete rest[k]; onLook({ ...look, colors: rest }); }}
                    className="text-[11px] text-[var(--accent-deep)] underline"
                  >
                    {t("lkAutoColor")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </details>

      <Group title={t("lkRadius")}>
        {choice(
          [{ v: "auto", k: "lkAuto" }, { v: "sharp", k: "lkSharp" }, { v: "soft", k: "lkSoft" }, { v: "round", k: "lkRound" }],
          look.radius,
          (v) => onLook({ ...look, radius: v }),
        )}
      </Group>

      <Group title={t("lkDensity")}>
        {choice(
          [{ v: "compact", k: "lkCompact" }, { v: "normal", k: "lkNormal" }, { v: "airy", k: "lkAiry" }],
          look.density,
          (v) => onLook({ ...look, density: v }),
        )}
      </Group>

      <Group title={t("lkFont")}>
        {choice(
          [{ v: "auto", k: "lkFontAuto" }, { v: "golos", k: "lkGolos" }, { v: "system", k: "lkSystem" }, { v: "serif", k: "lkSerif" }, { v: "mono", k: "lkMono" }],
          look.uiFont,
          (v) => onLook({ ...look, uiFont: v }),
        )}
      </Group>

      <Group title={ts("lkHeadFont")}>
        {choice(
          [{ v: "auto", k: "lkFontAuto" }, { v: "unbounded", k: "lkUnbounded" }, { v: "golos", k: "lkGolos" }, { v: "system", k: "lkSystem" }, { v: "serif", k: "lkSerif" }, { v: "mono", k: "lkMono" }],
          look.headFont,
          (v) => onLook({ ...look, headFont: v }),
        )}
      </Group>

      <Group title={ts("lkBorder")}>
        {choice(
          [{ v: "normal", k: "lkBorderNormal" }, { v: "bold", k: "lkBorderBold" }, { v: "none", k: "lkBorderNone" }],
          look.border,
          (v) => onLook({ ...look, border: v }),
        )}
      </Group>

      <Group title={ts("lkShadow")}>
        {choice(
          [{ v: "auto", k: "lkAuto" }, { v: "none", k: "lkShadowNone" }, { v: "hard", k: "lkShadowHard" }, { v: "deep", k: "lkShadowDeep" }],
          look.shadow,
          (v) => onLook({ ...look, shadow: v }),
        )}
      </Group>

      <Group title={t("lkExtras")}>
        <div className="space-y-2.5">
          {([
            { key: "flat", label: "lkFlat", hint: "lkFlatHint" },
            { key: "noCaps", label: "lkNoCaps", hint: "lkNoCapsHint" },
            { key: "calm", label: "lkCalm", hint: "lkCalmHint" },
            { key: "contrast", label: "lkContrast", hint: "lkContrastHint" },
          ] as const).map((o) => (
            <label key={o.key} className="flex cursor-pointer items-start gap-2 text-[13px]">
              <input type="checkbox" checked={look[o.key]} onChange={(e) => onLook({ ...look, [o.key]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span>
                {t(o.label)}
                <span className="block text-[11.5px] text-[var(--ink-faint)]">{t(o.hint)}</span>
              </span>
            </label>
          ))}
        </div>
      </Group>

      <button
        onClick={() => onLook(DEFAULT_LOOK)}
        className="mt-5 rounded-lg border border-[var(--line)] px-3 py-2 text-[12px] font-bold text-[var(--ink-soft)] hover:border-[var(--ink-faint)]"
      >
        {t("lkReset")}
      </button>
    </div>
  );
}
