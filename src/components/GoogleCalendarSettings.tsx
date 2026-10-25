import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { makeGcal } from "../gcal-strings";
import { gcalConnect, gcalDisconnect, gcalLastError, gcalStatus, gcalSync } from "../lib/gcal";
import type { GcalStatus } from "../lib/gcal";
import type { Task } from "../store";

/** Карточка настроек: подключение Google Календаря и ручная синхронизация задач. */
export default function GoogleCalendarSettings({ lang, signedIn, tasks, showToast }: { lang: Lang; signedIn: boolean; tasks: Record<string, Task[]>; showToast: (m: string) => void }) {
  const g = makeGcal(lang);
  const [status, setStatus] = useState<GcalStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    const s = await gcalStatus();
    setStatus(s);
    setUnavailable(!s);
  }, [signedIn]);

  useEffect(() => {
    refresh();
    // после возврата из системного браузера (Android) вкладка снова становится видимой
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // результат OAuth приходит в адресе: /?gcal=connected|denied|error
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const r = p.get("gcal");
    if (!r) return;
    p.delete("gcal");
    const qs = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
    showToast(r === "connected" ? g("gcToastOk") : r === "denied" ? g("gcToastDenied") : g("gcToastErr"));
    if (r === "connected") gcalSync(tasks).then(refresh);
  }, []);

  const connect = async () => {
    setBusy(true);
    if (!(await gcalConnect())) showToast(g("gcToastErr"));
    setBusy(false);
  };
  const syncNow = async () => {
    setBusy(true);
    const r = await gcalSync(tasks);
    showToast(r.ok && !r.failed ? g("gcToastSynced") : g("gcToastSyncErr"));
    await refresh();
    setBusy(false);
  };
  const disconnect = async () => {
    setBusy(true);
    if (await gcalDisconnect()) { showToast(g("gcToastOff")); setStatus({ connected: false, email: null, lastSync: null }); }
    else showToast(g("gcToastSyncErr"));
    setBusy(false);
  };

  const last = status?.lastSync ? new Date(status.lastSync).toLocaleString(lang) : g("gcNever");
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3 className="text-[15px] font-bold">📅 {g("gcTitle")}</h3>
      <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">{g("gcSub")}</p>

      {!signedIn ? (
        <p className="mt-3 text-[12.5px] text-[var(--ink-faint)]">{g("gcNeedLogin")}</p>
      ) : unavailable ? (
        <>
          <p className="mt-3 text-[12.5px] text-[var(--danger)]">{g("gcUnavailable")}</p>
          {gcalLastError && <p className="mt-1 break-all font-mono text-[11px] text-[var(--ink-faint)]">{gcalLastError}</p>}
        </>
      ) : status?.connected ? (
        <>
          <p className="mt-3 text-[13px] font-semibold">{status.email ? g("gcConnected").replace("{email}", status.email) : g("gcConnectedNoMail")}</p>
          <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">{g("gcLast").replace("{time}", last)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy} onClick={syncNow} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{busy ? g("gcSyncing") : g("gcSyncNow")}</button>
            <button disabled={busy} onClick={disconnect} className={`${btn} border border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--danger)]`}>{g("gcDisconnect")}</button>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <button disabled={busy || !status} onClick={connect} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{g("gcConnect")}</button>
        </div>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{g("gcNote")}</p>
    </div>
  );
}
