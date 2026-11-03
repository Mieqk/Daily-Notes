import { useEffect, useRef } from "react";
import type { Lang } from "../i18n";
import { notify } from "../lib/notify";
import { QUICK_EVENT, dueQuick, loadQuick, saveQuick } from "../lib/quickRemind";
import { makeQuick } from "../quick-remind-strings";

const EVERY_MS = 15_000;

/** Быстрые напоминания: пока приложение открыто, раз в 15 секунд и при возврате на вкладку показывает те, чей час пришёл. */
export function useQuickReminders(lang: Lang, showToast: (msg: string) => void) {
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const tick = () => {
      const list = loadQuick();
      if (!list.length) return;
      const { list: next, fire } = dueQuick(list, Date.now());
      if (next.length !== list.length || fire.length) saveQuick(next);
      const q = makeQuick(langRef.current);
      for (const r of fire) {
        void notify(`⏰ ${q("fired")}`, r.text, `dn-quick-${r.id}`);
        toastRef.current(`⏰ ${r.text}`);
      }
    };
    tick();
    const id = window.setInterval(tick, EVERY_MS);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(QUICK_EVENT, tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); window.removeEventListener(QUICK_EVENT, tick); };
  }, []);
}
