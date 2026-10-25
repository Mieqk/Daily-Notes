import { useEffect } from "react";
import type { Lang } from "../i18n";
import { makePwa } from "../pwa-strings";

const ShareGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
  </svg>
);
const AddGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M12 8.5v7M8.5 12h7" />
  </svg>
);
const HomeGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
  </svg>
);

/** Окно с тремя шагами установки на iPhone: Поделиться → На экран «Домой» → Добавить. */
export default function IosInstallGuide({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const p = makePwa(lang);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps = [
    { glyph: <ShareGlyph />, text: p("iosStep1") },
    { glyph: <AddGlyph />, text: p("iosStep2") },
    { glyph: <HomeGlyph />, text: p("iosStep3") },
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={p("iosGuideTitle")}>
      <div className="animate-rise max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-5 text-[var(--ink)]" style={{ boxShadow: "var(--shadow)", marginBottom: "env(safe-area-inset-bottom)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[16px] font-bold">{p("iosGuideTitle")}</h3>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-[var(--hover)] p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">{s.glyph}</span>
              <span className="text-[13px] leading-snug"><b className="mr-1 text-[var(--accent)]">{i + 1}.</b>{s.text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{p("iosNote")}</p>
        <button onClick={onClose} className="mt-4 h-11 w-full rounded-lg bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)] transition-all active:scale-95">{p("iosOk")}</button>
      </div>
    </div>
  );
}
