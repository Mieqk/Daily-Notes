import { useEffect, useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { BellIcon } from "../icons";
import { DEFAULT_DELAY_MS, MAX_QUICK, MAX_QUICK_TEXT, QUICK_EVENT, loadQuick, newQuick, parseQuick, presets, saveQuick, type PresetId, type QuickReminder } from "../lib/quickRemind";
import { requestNotifications } from "../lib/notify";
import { cancelQuickPush, scheduleQuickPush } from "../lib/quickPush";
import { makeQuick, whenLabel } from "../quick-remind-strings";

/** Карточка «Быстрое напоминание» на экране дня: одна строка, время из текста или одна кнопка. */
export default function QuickReminders({ lang, showToast, userId, reminder }: { lang: Lang; showToast: (msg: string) => void; userId: string | null; reminder: { time: string; enabled: boolean } }) {
  const q = makeQuick(lang);
  const [list, setList] = useState<QuickReminder[]>(loadQuick);
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const on = () => { setList(loadQuick()); setNow(Date.now()); };
    window.addEventListener(QUICK_EVENT, on);
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { window.removeEventListener(QUICK_EVENT, on); window.clearInterval(id); };
  }, []);

  const parsed = useMemo(() => parseQuick(text, now), [text, now]);
  const btns = useMemo(() => presets(now), [now]);
  const when = parsed.at ?? now + DEFAULT_DELAY_MS;

  const create = (at: number) => {
    const clean = parsed.text.trim();
    if (!clean) { showToast(q("empty")); return; }
    if (list.filter((r) => !r.done).length >= MAX_QUICK) { showToast(q("limit", { n: MAX_QUICK })); return; }
    const item = newQuick(clean, at);
    const next = [...list, item].sort((a, b) => a.at - b.at);
    saveQuick(next);
    setList(next);
    setText("");
    void requestNotifications().then(() => scheduleQuickPush(userId, item, { lang, reminderEnabled: reminder.enabled, reminderTime: reminder.time }));
    showToast(q("saved", { when: whenLabel(lang, at, Date.now()) }));
  };
  const remove = (id: string) => { void cancelQuickPush(id); const next = list.filter((r) => r.id !== id); saveQuick(next); setList(next); };

  const preset = (id: PresetId) => create(btns.find((b) => b.id === id)!.at);
  const visible = [...list].sort((a, b) => Number(a.done) - Number(b.done) || a.at - b.at);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)]"><BellIcon className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold">{q("title")}</div>
          <div className="text-[11px] text-[var(--ink-faint)]">{q("hint")}</div>
        </div>
      </div>

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); create(when); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_QUICK_TEXT + 40} placeholder={q("ph")} enterKeyHint="done" aria-label={q("title")}
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13.5px] outline-none focus:border-[var(--accent)]" />
        <button type="submit" disabled={!parsed.text.trim()} className="h-10 shrink-0 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">{q("add")}</button>
      </form>

      {text.trim() && parsed.text.trim() && (
        <p className="mt-2 text-[12px] text-[var(--ink-soft)]">
          {q("willAt", { when: whenLabel(lang, when, now) })}{parsed.at === null ? ` (${q("defaultNote")})` : ""}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {btns.map((b) => (
          <button key={b.id} type="button" onClick={() => preset(b.id)} className="h-9 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3.5 text-[12.5px] font-semibold transition-all hover:border-[var(--accent)] active:scale-95">{q(b.id)}</button>
        ))}
      </div>

      {visible.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {visible.map((r) => (
            <li key={r.id} className={`flex items-center gap-3 rounded-lg bg-[var(--hover)] px-3 py-2 ${r.done ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-[13.5px] font-semibold ${r.done ? "line-through" : ""}`}>{r.text}</div>
                <div className="text-[11.5px] text-[var(--ink-faint)]">{r.done ? `✓ ${q("done")} · ` : ""}{whenLabel(lang, r.at, now)}</div>
              </div>
              <button onClick={() => remove(r.id)} className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-semibold text-[var(--ink-faint)] hover:text-[var(--danger)]">{q("delete")}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{q("note")}</p>
    </div>
  );
}
