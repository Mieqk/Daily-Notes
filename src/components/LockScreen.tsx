import { useEffect, useState } from "react";
import type { TKey } from "../i18n";
import { BackspaceIcon, LockIcon, PenIcon } from "../icons";

interface LockScreenProps {
  pinLength: number;
  onTry: (pin: string) => boolean;
  t: (k: TKey) => string;
}

export default function LockScreen({ pinLength, onTry, t }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  const press = (d: string) => {
    setWrong(false);
    setPin((p) => {
      if (p.length >= 8) return p;
      return p + d;
    });
  };

  const back = () => {
    setWrong(false);
    setPin((p) => p.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length >= pinLength && pin.length >= 4) {
      const id = window.setTimeout(() => {
        if (!onTry(pin)) {
          setWrong(true);
          setPin("");
        }
      }, 160);
      return () => window.clearTimeout(id);
    }
  }, [pin, pinLength, onTry]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="relative z-[60] flex h-full flex-col items-center justify-center overflow-hidden bg-[var(--bg)] px-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="bg-dots absolute inset-0 opacity-70" />
        <div
          className="animate-drift1 absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full blur-3xl"
          style={{ background: "var(--glow1)" }}
        />
        <div
          className="animate-drift2 absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "var(--glow2)" }}
        />
      </div>

      <div className={`relative flex flex-col items-center ${wrong ? "animate-shake" : "animate-rise"}`}>
        <span
          className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)]"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <PenIcon className="h-7 w-7" />
        </span>
        <h1 className="font-display mt-5 text-xl font-bold tracking-tight">{t("lockTitle")}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--ink-faint)]">
          <LockIcon className="h-3.5 w-3.5" />
          {wrong ? t("lockWrong") : t("lockHint")}
        </p>

        {/* dots */}
        <div className="mt-6 flex gap-3">
          {Array.from({ length: Math.max(pinLength, 4) }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? "scale-110 border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--ink-faint)]"
              }`}
            />
          ))}
        </div>

        {/* pad */}
        <div className="mt-7 grid grid-cols-3 gap-2.5">
          {keys.map((k, i) =>
            k === "" ? (
              <span key={`e${i}`} />
            ) : (
              <button
                key={k}
                onClick={() => (k === "back" ? back() : press(k))}
                className={`font-display grid h-16 w-16 place-items-center rounded-2xl border text-xl font-bold transition-all duration-150 active:scale-90 ${
                  k === "back"
                    ? "border-transparent text-[var(--ink-faint)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--panel)] hover:-translate-y-0.5 hover:border-[var(--accent)]"
                }`}
                style={k === "back" ? undefined : { boxShadow: "var(--shadow-sm)" }}
                aria-label={k === "back" ? "backspace" : k}
              >
                {k === "back" ? <BackspaceIcon className="h-6 w-6" /> : k}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
