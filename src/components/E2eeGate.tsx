import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Lang } from "../i18n";
import { makeE2ee } from "../e2ee-strings";
import { changePassphrase, initE2ee, resetE2ee, unlockE2ee, type E2eeStatus } from "../lib/e2ee";
import { LockIcon } from "../icons";

const INPUT = "mt-1.5 h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]";
const LABEL = "mt-4 block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]";
const PRIMARY = "mt-4 h-11 w-full rounded-lg bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-60";
const LINK = "mt-3 block w-full text-center text-[12.5px] font-semibold text-[var(--accent-deep)] hover:underline";

type Step = "pass" | "key" | "reset";

/** Экран на месте приложения, пока ключ шифрования не открыт на этом устройстве. */
export default function E2eeGate({ userId, lang, status }: { userId: string; lang: Lang; status: E2eeStatus }) {
  const x = makeE2ee(lang);
  const { signOut } = useAuth();
  const [step, setStep] = useState<Step>("pass");
  const [pass, setPass] = useState("");
  const [key, setKey] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    try { setError(await fn()); } catch { setError(x("error")); }
    setBusy(false);
  };

  const submitPass = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => ((await unlockE2ee(userId, pass, "pass")) ? null : x("unlockWrong")));
  };

  const submitKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { setError(x("passShort")); return; }
    if (next !== next2) { setError(x("passMismatch")); return; }
    void run(async () => {
      if (!(await changePassphrase(userId, key, "recovery", next))) return x("recWrong");
      return (await unlockE2ee(userId, key, "recovery")) ? null : x("recWrong");
    });
  };

  const doReset = () => void run(async () => { await resetE2ee(userId); return null; });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6" style={{ boxShadow: "var(--shadow)" }}>
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><LockIcon className="h-5 w-5" /></div>

        {status === "error" ? (
          <>
            <p className="text-sm text-[var(--ink-soft)]">{x("loadError")}</p>
            <button type="button" onClick={() => void initE2ee(userId)} className={PRIMARY}>{x("retry")}</button>
          </>
        ) : step === "pass" ? (
          <form onSubmit={submitPass}>
            <h1 className="font-display text-lg font-bold">{x("unlockTitle")}</h1>
            <p className="mt-1 text-[13px] text-[var(--ink-soft)]">{x("unlockText")}</p>
            <label htmlFor="e2ee-pass" className={LABEL}>{x("passLabel")}</label>
            <input id="e2ee-pass" type="password" autoComplete="current-password" autoFocus value={pass} onChange={(e) => setPass(e.target.value)} className={INPUT} />
            {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={busy || !pass} className={PRIMARY}>{busy ? x("working") : x("unlockBtn")}</button>
            <button type="button" onClick={() => { setStep("key"); setError(null); }} className={LINK}>{x("forgot")}</button>
          </form>
        ) : step === "key" ? (
          <form onSubmit={submitKey}>
            <h1 className="font-display text-lg font-bold">{x("newPassTitle")}</h1>
            <label htmlFor="e2ee-key" className={LABEL}>{x("recLabel")}</label>
            <input id="e2ee-key" autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus value={key} onChange={(e) => setKey(e.target.value)} className={`${INPUT} font-mono tracking-wider`} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
            <label htmlFor="e2ee-new" className={LABEL}>{x("newPass")}</label>
            <input id="e2ee-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={INPUT} />
            <label htmlFor="e2ee-new2" className={LABEL}>{x("pass2Label")}</label>
            <input id="e2ee-new2" type="password" autoComplete="new-password" value={next2} onChange={(e) => setNext2(e.target.value)} className={INPUT} />
            {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={busy || !key || !next} className={PRIMARY}>{busy ? x("working") : x("recBtn")}</button>
            <button type="button" onClick={() => { setStep("reset"); setError(null); }} className={LINK}>{x("lostBoth")}</button>
            <button type="button" onClick={() => { setStep("pass"); setError(null); }} className={LINK}>{x("back")}</button>
          </form>
        ) : (
          <div>
            <h1 className="font-display text-lg font-bold">{x("lostBoth")}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">{x("resetWarn")}</p>
            {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
            {!confirmReset ? (
              <button type="button" onClick={() => setConfirmReset(true)} className="mt-4 h-11 w-full rounded-lg border border-[var(--danger)] text-[13px] font-bold text-[var(--danger)] transition-all hover:bg-[var(--danger-soft)] active:scale-95">{x("resetBtn")}</button>
            ) : (
              <button type="button" disabled={busy} onClick={doReset} className="mt-4 h-11 w-full rounded-lg bg-[var(--danger)] text-[13px] font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60">{busy ? x("working") : x("resetConfirm")}</button>
            )}
            <button type="button" onClick={() => { setStep("key"); setConfirmReset(false); setError(null); }} className={LINK}>{x("back")}</button>
          </div>
        )}

        <button type="button" onClick={() => void signOut()} className={LINK}>{x("signOut")}</button>
      </div>
    </div>
  );
}
