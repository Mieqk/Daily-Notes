import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { makeSleepAuto } from "../sleep-auto-strings";
import type { SleepCandidate } from "../lib/sleepAuto";
import { MoonIcon } from "../icons";

interface Props {
  cand: SleepCandidate;
  lang: Lang;
  onAccept: (bedtime: string, waketime: string) => void;
  onDismiss: () => void;
}

/** Утренняя подсказка: время можно поправить, запись создаётся только после нажатия. */
export default function SleepSuggestion({ cand, lang, onAccept, onDismiss }: Props) {
  const a = makeSleepAuto(lang);
  const [bed, setBed] = useState(cand.bedtime);
  const [wake, setWake] = useState(cand.waketime);
  useEffect(() => { setBed(cand.bedtime); setWake(cand.waketime); }, [cand.bedtime, cand.waketime]);
  const input = "mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-sm outline-none focus:border-[var(--accent)]";
  const label = "block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]";
  return (
    <div className="mx-auto mb-5 max-w-5xl rounded-xl border border-[var(--accent)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center gap-2 text-[14px] font-bold"><MoonIcon className="h-4 w-4 text-[var(--accent-deep)]" />{a("prompt")}</div>
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <div><label className={label}>{a("from")}</label><input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className={input} /></div>
        <div><label className={label}>{a("to")}</label><input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className={input} /></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!bed || !wake} onClick={() => onAccept(bed, wake)} className="h-9 rounded-full bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">{a("save")}</button>
        <button onClick={onDismiss} className="h-9 rounded-full border border-[var(--line)] px-4 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--ink-faint)] active:scale-95">{a("skip")}</button>
      </div>
    </div>
  );
}
