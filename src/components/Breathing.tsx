import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { makeFh } from "../friends-hub-strings";
import { BREATH_PATTERNS, cycleLength, phaseAt } from "../lib/breathing";
import { useStored } from "../store";

const NAMES = { box: "box", "478": "p478", calm: "calm" } as const;

/** Дыхательная практика: круг расширяется на вдохе и сжимается на выдохе. Всё считается на устройстве. */
export default function Breathing({ lang }: { lang: Lang }) {
  const f = makeFh(lang);
  const [pid, setPid] = useStored<string>("dn.breathPattern", "box");
  const [total, setTotal] = useStored<number>("dn.breathTotal", 0);
  const pattern = BREATH_PATTERNS.find((p) => p.id === pid) ?? BREATH_PATTERNS[0];
  const [running, setRunning] = useState(false);
  const [sec, setSec] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const { phase, left, cycle } = phaseAt(pattern, sec);
  const stop = () => {
    if (running && sec >= cycleLength(pattern)) { setTotal((n) => n + 1); setFinished(true); }
    setRunning(false);
    setSec(0);
  };
  const start = () => { setFinished(false); setSec(0); setRunning(true); };

  const scale = running && (phase === "in" || phase === "hold") ? 1 : 0.7;
  const dur = running && (phase === "in" || phase === "out") ? pattern.steps.find((s) => s.phase === phase)!.sec : 0.6;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label={f("calmTitle")}>
        {BREATH_PATTERNS.map((p) => (
          <button key={p.id} onClick={() => { setPid(p.id); setRunning(false); setSec(0); }} aria-pressed={p.id === pattern.id}
            className={`h-9 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${p.id === pattern.id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
            {f(NAMES[p.id as keyof typeof NAMES])}
          </button>
        ))}
      </div>
      <div className="grid h-52 w-52 place-items-center" aria-live="polite">
        <div className="grid h-full w-full place-items-center rounded-full"
          style={{ background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)", transform: `scale(${scale})`, transition: `transform ${dur}s ease-in-out` }}>
          <div className="grid h-36 w-36 place-items-center rounded-full border-2 border-[var(--accent)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow-sm)" }}>
            {running ? (
              <div>
                <div className="font-display text-[18px] font-bold text-[var(--accent-deep)]">{f(phase)}</div>
                <div className="text-[26px] font-bold tabular-nums">{left}</div>
              </div>
            ) : (
              <div className="px-3 text-center">{finished ? <><div className="text-[30px] leading-none">✨</div><div className="mt-1 text-[13px] font-semibold text-[var(--ink-soft)]">{f("done")}</div></> : <div aria-hidden className="text-[44px] leading-none">🌿</div>}</div>
            )}
          </div>
        </div>
      </div>
      <div className="text-[12px] text-[var(--ink-faint)]">
        {running ? f("rounds").replace("{n}", String(cycle + 1)) : total > 0 ? f("total").replace("{n}", String(total)) : f("calmHint")}
      </div>
      <button onClick={running ? stop : start} className={`h-11 rounded-xl px-8 text-[14px] font-semibold active:scale-95 ${running ? "border border-[var(--line)] text-[var(--ink-soft)]" : "bg-[var(--accent)] text-[var(--accent-ink)]"}`}>
        {running ? f("stop") : f("start")}
      </button>
    </div>
  );
}
