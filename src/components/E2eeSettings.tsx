import { useState } from "react";
import type { Lang } from "../i18n";
import { makeE2ee } from "../e2ee-strings";
import { changePassphrase, convertAllRemote, disableE2ee, formatRecoveryKey, renewRecoveryKey, setupE2ee, unlockE2ee, useE2eeStatus } from "../lib/e2ee";
import { downloadText } from "../store";

const INPUT = "h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]";
const BTN = "h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 text-[13px] font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95 disabled:opacity-50";
const PRIMARY = "h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50";
const ERR = "rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12.5px] font-semibold text-[var(--danger)]";

type Mode = null | "enable" | "change" | "disable" | "newkey";

/** Блок «Шифрование записей» в настройках. */
export default function E2eeSettings({ userId, lang, showToast }: { userId: string; lang: Lang; showToast: (m: string) => void }) {
  const x = makeE2ee(lang);
  const status = useE2eeStatus();
  const [mode, setMode] = useState<Mode>(null);
  const [cur, setCur] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [recKey, setRecKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const close = () => { setMode(null); setCur(""); setP1(""); setP2(""); setErr(null); setProgress(null); };

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setErr(null);
    try { const e = await fn(); if (e) setErr(e); } catch (e) { console.error('[E2EE]', e); setErr(x("error")); }
    setBusy(false);
  };

  const newPassError = () => (p1.length < 8 ? x("passShort") : p1 !== p2 ? x("passMismatch") : null);

  const enable = () => {
    const bad = newPassError();
    if (bad) { setErr(bad); return; }
    void run(async () => {
      const key = await setupE2ee(userId, p1);
      setRecKey(formatRecoveryKey(key));
      // ключ показан первым делом, а перенос старых записей идёт следом
      setProgress(0);
      const failed = await convertAllRemote(userId, true, setProgress);
      if (failed > 0) showToast(x("error"));
      close();
      return null;
    });
  };

  const change = () => {
    const bad = newPassError();
    if (bad) { setErr(bad); return; }
    void run(async () => {
      if (!(await changePassphrase(userId, cur, "pass", p1))) return x("wrongPass");
      showToast(x("passChanged"));
      close();
      return null;
    });
  };

  const newKey = () => void run(async () => {
    const key = await renewRecoveryKey(userId, cur);
    if (!key) return x("wrongPass");
    setRecKey(formatRecoveryKey(key));
    setSaved(false);
    close();
    return null;
  });

  const disable = () => void run(async () => {
    // пароль проверяем тем же способом, что и вход: без него шифрование не снять
    if (!(await unlockE2ee(userId, cur, "pass"))) return x("wrongPass");
    setProgress(0);
    if (!(await disableE2ee(userId, setProgress))) { setProgress(null); return x("disableFail"); }
    showToast(x("disabledToast"));
    close();
    return null;
  });

  const copy = async () => {
    try { await navigator.clipboard.writeText(recKey ?? ""); setCopied(true); } catch { /* ignore */ }
  };

  if (recKey) {
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-[13.5px] font-bold">{x("recTitle")}</h4>
        <p className="text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{x("recText")}</p>
        <code className="break-all rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-3 text-center font-mono text-[14px] font-bold tracking-wider select-all">{recKey}</code>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN} onClick={() => downloadText("daily-notes-recovery-key.txt", `Daily Notes\n${x("recTitle")}:\n${recKey}\n`, "text/plain;charset=utf-8")}>{x("recDownload")}</button>
          <button type="button" className={BTN} onClick={copy}>{copied ? x("recCopied") : x("recCopy")}</button>
        </div>
        {progress !== null && <p className="text-[12px] text-[var(--ink-faint)]">{x("migrating").replace("{n}", String(progress))}</p>}
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          {x("recSaved")}
        </label>
        <button type="button" disabled={!saved || busy} className={PRIMARY} onClick={() => { setRecKey(null); setSaved(false); setCopied(false); showToast(x("enabledToast")); }}>{x("recDone")}</button>
      </div>
    );
  }

  if (status === "unavailable") {
    return <p className="text-[12.5px] text-[var(--ink-soft)]">{x("statusUnavailable")}</p>;
  }
  if (status !== "off" && status !== "unlocked") return null;
  const on = status === "unlocked";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${on ? "bg-[var(--accent)]" : "bg-[var(--ink-faint)]"}`} />
        <span className="text-[13px] font-semibold">{on ? x("statusOn") : x("statusOff")}</span>
      </div>
      <p className="text-[12px] leading-snug text-[var(--ink-faint)]">{x("about")}</p>

      {mode === null && (
        <div className="flex flex-wrap gap-2">
          {!on ? (
            <button type="button" className={PRIMARY} onClick={() => setMode("enable")}>{x("enable")}</button>
          ) : (
            <>
              <button type="button" className={BTN} onClick={() => setMode("change")}>{x("changePass")}</button>
              <button type="button" className={BTN} onClick={() => setMode("newkey")}>{x("newKeyBtn")}</button>
              <button type="button" className={`${BTN} !text-[var(--danger)]`} onClick={() => setMode("disable")}>{x("disable")}</button>
            </>
          )}
        </div>
      )}

      {mode && (
        <div className="flex flex-col gap-2.5">
          {mode === "enable" && <><h4 className="text-[13.5px] font-bold">{x("passTitle")}</h4><p className="text-[12px] text-[var(--ink-faint)]">{x("passHint")}</p></>}
          {mode === "newkey" && <p className="text-[12px] text-[var(--ink-faint)]">{x("newKeyHint")}</p>}
          {mode === "disable" && <p className="text-[12px] text-[var(--ink-faint)]">{x("disableWarn")}</p>}
          {(mode === "change" || mode === "newkey" || mode === "disable") && (
            <input type="password" autoComplete="current-password" aria-label={x("curPass")} placeholder={x("curPass")} value={cur} onChange={(e) => setCur(e.target.value)} className={INPUT} />
          )}
          {(mode === "enable" || mode === "change") && (
            <>
              <input type="password" autoComplete="new-password" aria-label={x("newPass")} placeholder={mode === "enable" ? x("passLabel") : x("newPass")} value={p1} onChange={(e) => setP1(e.target.value)} className={INPUT} />
              <input type="password" autoComplete="new-password" aria-label={x("pass2Label")} placeholder={x("pass2Label")} value={p2} onChange={(e) => setP2(e.target.value)} className={INPUT} />
            </>
          )}
          {mode === "enable" && <p className="text-[12px] font-semibold text-[var(--danger)]">{x("lostWarn")}</p>}
          {progress !== null && <p className="text-[12px] text-[var(--ink-faint)]">{x("migrating").replace("{n}", String(progress))}</p>}
          {err && <p role="alert" className={ERR}>{err}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} className={mode === "disable" ? `${BTN} !border-[var(--danger)] !text-[var(--danger)]` : PRIMARY} onClick={mode === "enable" ? enable : mode === "change" ? change : mode === "newkey" ? newKey : disable}>
              {busy ? x("working") : mode === "enable" ? x("createBtn") : mode === "change" ? x("changePass") : mode === "newkey" ? x("newKeyBtn") : x("disable")}
            </button>
            <button type="button" disabled={busy} className={BTN} onClick={close}>{x("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
