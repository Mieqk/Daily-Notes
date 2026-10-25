import { useState } from "react";
import type { Lang } from "../i18n";
import { friendNotificationsEnabled, notificationPermission, notify, requestNotifications, setFriendNotifications } from "../lib/notify";
import { PUSH_SYNC_EVENT, pushSupported } from "../lib/push";
import { makeSocial } from "../social-strings";
import { makePwa } from "../pwa-strings";
import { needsIosInstall } from "../lib/pwa";
import IosInstallGuide from "./IosInstallGuide";

/** Карточка настроек уведомлений: разрешение браузера, вести от друзей, проверка. */
export default function NotificationSettings({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const s = makeSocial(lang);
  const [perm, setPerm] = useState(notificationPermission());
  const [friends, setFriends] = useState(friendNotificationsEnabled());
  const [guide, setGuide] = useState(false);
  const iosNeedsInstall = needsIosInstall();
  const pwa = makePwa(lang);

  const enable = async () => {
    setPerm(await requestNotifications());
    window.dispatchEvent(new Event(PUSH_SYNC_EVENT));
  };
  const toggleFriends = () => { const next = !friends; setFriends(next); setFriendNotifications(next); window.dispatchEvent(new Event(PUSH_SYNC_EVENT)); };

  const status =
    iosNeedsInstall ? pwa("iosPushNeed") : perm === "unsupported" ? s("ntUnsupported") : perm === "denied" ? s("ntDenied") : perm === "granted" ? s("ntOn") : s("ntSub");

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3 className="text-[15px] font-bold">🔔 {s("ntTitle")}</h3>
      <p className={`mt-1 text-[12.5px] ${!iosNeedsInstall && (perm === "denied" || perm === "unsupported") ? "text-[var(--danger)]" : "text-[var(--ink-soft)]"}`}>{status}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {iosNeedsInstall && (
          <button onClick={() => setGuide(true)} className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95">{pwa("iosPushOpen")}</button>
        )}
        {!iosNeedsInstall && perm === "default" && (
          <button onClick={enable} className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95">{s("ntEnable")}</button>
        )}
        {perm === "granted" && (
          <button onClick={() => notify(s("ntTitle"), s("ntOn"), "dn-test")} className="h-10 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 text-[13px] font-semibold transition-all hover:border-[var(--accent)] active:scale-95">{s("ntTest")}</button>
        )}
      </div>

      {signedIn && perm === "granted" && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--hover)] px-3 py-2.5">
          <span className="text-[13px] font-semibold">{s("ntFriends")}</span>
          <button onClick={toggleFriends} role="switch" aria-checked={friends} aria-label={s("ntFriends")}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${friends ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--panel-2)] shadow transition-all duration-200 ${friends ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{pushSupported() && signedIn ? s("ntNotePush") : s("ntNote")}</p>
      {guide && <IosInstallGuide lang={lang} onClose={() => setGuide(false)} />}
    </div>
  );
}
