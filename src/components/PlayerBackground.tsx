import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { makePlayerBg } from "../player-bg-strings";
import { BG_COLORS, type BgPrefs, checkBgFile, loadBgFile, loadPrefs, removeBgFile, savePrefs, saveBgFile } from "../lib/playerBg";

/** Состояние фона плеера: настройки и адрес своего файла (objectURL). */
export function usePlayerBg() {
  const [prefs, setPrefs] = useState<BgPrefs>(loadPrefs);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!prefs.fileKind) { setFileUrl(null); return; }
    let url: string | null = null, dead = false;
    loadBgFile().then((b) => { if (b && !dead) { url = URL.createObjectURL(b); setFileUrl(url); } });
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [prefs.fileKind]);
  const update = (p: BgPrefs) => { setPrefs(p); savePrefs(p); };
  return { prefs, fileUrl, update };
}

/** Сам фон: обложка с размытием, цвет, или свой файл (картинка/GIF/видео по кругу без звука). */
export function PlayerBackdrop({ prefs, fileUrl, cover }: { prefs: BgPrefs; fileUrl: string | null; cover: string | null }) {
  if (prefs.mode === "file" && fileUrl) {
    return prefs.fileKind === "video"
      ? <video src={fileUrl} autoPlay loop muted playsInline aria-hidden className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-70" />
      : <img src={fileUrl} alt="" aria-hidden className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-70" />;
  }
  if (prefs.mode === "color") {
    return <div aria-hidden className="pointer-events-none fixed inset-0 opacity-60" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${prefs.color}, transparent 80%)` }} />;
  }
  return cover ? <img src={cover} alt="" aria-hidden referrerPolicy="no-referrer" className="pointer-events-none fixed inset-0 h-full w-full scale-150 object-cover opacity-45 blur-3xl" /> : null;
}

export function BackgroundPicker({ lang, prefs, onChange }: { lang: Lang; prefs: BgPrefs; onChange: (p: BgPrefs) => void }) {
  const s = makePlayerBg(lang);
  const inp = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const tab = (mode: BgPrefs["mode"], label: string, disabled = false) => (
    <button key={mode} disabled={disabled} onClick={() => onChange({ ...prefs, mode })} aria-pressed={prefs.mode === mode}
      className={`h-9 flex-1 rounded-full text-[13px] font-bold transition-colors disabled:opacity-40 ${prefs.mode === mode ? "bg-[var(--accent)] text-white" : "text-[var(--ink-soft)]"}`}>{label}</button>
  );
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const c = checkBgFile(f);
    if (!c.ok) { setErr(c.reason === "size" ? s("tooBig") : s("badType")); return; }
    try { await saveBgFile(f); setErr(null); onChange({ ...prefs, mode: "file", fileKind: c.kind }); }
    catch { setErr(s("saveFail")); }
  };
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]/70 p-3 backdrop-blur">
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{s("bg")}</div>
      <div className="flex gap-1 rounded-full border border-[var(--line)] p-0.5">
        {tab("cover", s("cover"))}{tab("color", s("color"))}{tab("file", s("file"), !prefs.fileKind)}
      </div>
      {prefs.mode === "color" && (
        <div className="mt-3 flex justify-center gap-3">
          {BG_COLORS.map((c) => (
            <button key={c} onClick={() => onChange({ ...prefs, color: c })} aria-label={c} aria-pressed={prefs.color === c}
              className={`h-8 w-8 rounded-full border-2 transition-transform active:scale-90 ${prefs.color === c ? "border-[var(--ink)]" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button onClick={() => inp.current?.click()} className="h-9 rounded-full border border-[var(--line)] px-4 text-[13px] font-bold transition-transform active:scale-95">
          {prefs.fileKind ? s("change") : s("pick")}
        </button>
        {prefs.fileKind && (
          <button onClick={async () => { await removeBgFile(); onChange({ ...prefs, mode: "cover", fileKind: null }); }} className="h-9 rounded-full px-3 text-[13px] font-semibold text-[var(--ink-soft)]">{s("remove")}</button>
        )}
        <input ref={inp} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--ink-faint)]">{err ?? s("note")}</p>
    </div>
  );
}
