import { useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { makeSyncStrings } from "../sync-strings";
import { syncNow, useCloudInfo } from "../lib/cloudSync";
import { isLocalMode, outboxCount } from "../lib/sync";

/** Карточка «Синхронизация устройств»: состояние, кнопка «сейчас» и что синхронизируется. */
export default function SyncSettings({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const s = makeSyncStrings(lang);
  const info = useCloudInfo();
  const [busy, setBusy] = useState(false);
  const online = signedIn && !isLocalMode();
  const pending = info.pending + outboxCount();

  const status = !online ? s("stLocal")
    : info.needsSetup ? s("stSetup")
    : info.status === "syncing" || busy ? s("stSyncing")
    : info.status === "offline" ? s("stOffline")
    : info.status === "error" ? s("stError")
    : s("stSynced");
  const dot = !online ? "bg-[var(--ink-faint)]" : info.needsSetup || info.status === "error" ? "bg-red-500" : info.status === "offline" ? "bg-amber-500" : info.status === "syncing" || busy ? "bg-[var(--accent)] animate-pulse" : "bg-green-500";
  const last = info.lastSync ? new Date(info.lastSync).toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit" }) : s("never");

  const run = async () => {
    setBusy(true);
    try { await syncNow(); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3 className="text-[15px] font-bold">🔄 {s("title")}</h3>
      <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">{s("hint")}</p>
      <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-[var(--hover)] px-3 py-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1 text-[13px]">
          <div className="font-semibold">{status}</div>
          {online && (
            <div className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
              {s("last").replace("{time}", last)}{pending > 0 ? ` · ${s("pending").replace("{n}", String(pending))}` : ""}
            </div>
          )}
        </div>
      </div>
      {online && (
        <button onClick={run} disabled={busy} className="mt-3 h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 text-[13px] font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:text-[var(--ink)] active:scale-95 disabled:opacity-50">
          {s("now")}
        </button>
      )}
      <details className="mt-3 text-[12.5px] text-[var(--ink-soft)]">
        <summary className="cursor-pointer font-semibold text-[var(--ink)]">{s("syncsTitle")}</summary>
        <p className="mt-1.5">{s("syncs")}</p>
      </details>
      <details className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
        <summary className="cursor-pointer font-semibold text-[var(--ink)]">{s("staysTitle")}</summary>
        <p className="mt-1.5">{s("stays")}</p>
      </details>
      <p className="mt-3 text-[12px] text-[var(--ink-faint)]">{s("note")}</p>
    </div>
  );
}
