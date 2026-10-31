import { useState } from "react";
import type { Lang } from "../i18n";
import { makeHealthSleep } from "../health-sleep-strings";
import { healthOpenSettings, healthRequest, healthSupported, useHealthStatus } from "../lib/healthSleep";

interface Props { lang: Lang; enabled: boolean; setEnabled: (v: boolean) => void }

/** Переключатель «Сон из Health Connect»: показывается только в Android-приложении. */
export default function HealthSleepCard({ lang, enabled, setEnabled }: Props) {
  const H = makeHealthSleep(lang);
  const { st, refresh } = useHealthStatus();
  const [busy, setBusy] = useState(false);
  if (!healthSupported() || !st) return null;

  const toggle = async () => {
    if (busy) return;
    if (enabled) { setEnabled(false); return; }
    setBusy(true);
    const r = await healthRequest();
    setBusy(false);
    refresh();
    if (r.available && r.granted) setEnabled(true);
  };
  const on = enabled && st.available && st.granted;
  const denied = st.available && !st.granted && !busy;
  return (
    <div className="animate-rise mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold">{H("title")}</h3>
          <p className="text-xs text-[var(--ink-soft)]">{H("sub")}</p>
        </div>
        <button role="switch" aria-checked={on} aria-label={H("title")} disabled={!st.available} onClick={toggle} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-[var(--accent)]" : "bg-[var(--hover)]"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{H("about")}</p>
      {!st.available && <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-faint)]">{H("unavailable")}</p>}
      {denied && enabled && (
        <div className="mt-2">
          <p className="text-[12.5px] leading-relaxed text-[var(--ink-faint)]">{H("denied")}</p>
          <button onClick={() => void healthOpenSettings()} className="mt-2 h-9 rounded-full border border-[var(--line)] px-4 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--ink-faint)] active:scale-95">{H("settings")}</button>
        </div>
      )}
    </div>
  );
}
