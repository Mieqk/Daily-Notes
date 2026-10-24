import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { isLocalMode } from "../lib/sync";
import { questionIndex, questionText } from "../lib/questions";
import { useStored } from "../store";
import { makeUI } from "../ui-strings";

interface DailyQuestionProps {
  date: string;
  lang: Lang;
  /** добавить вопрос и ответ в запись дня */
  onInsert: (text: string) => void;
}

export default function DailyQuestion({ date, lang, onInsert }: DailyQuestionProps) {
  const u = makeUI(lang);
  const { user } = useAuth();
  const userId = user && !isLocalMode() ? user.id : null;
  const idx = questionIndex(date);
  const question = questionText(lang, idx);

  const [answers, setAnswers] = useStored<Record<string, string>>("dn.answers", {});
  const answer = answers[date] ?? "";
  // что сейчас опубликовано для друзей (null — ничего)
  const [shared, setShared] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setShared(null);
    setError(false);
    if (!userId || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase!.from("shared_answers").select("answer").eq("user_id", userId).eq("date", date).maybeSingle();
      if (cancelled || !data) return;
      setShared(data.answer);
      // ответ с другого устройства: подставляем, если здесь ещё пусто
      setAnswers((m) => ((m[date] ?? "").trim() ? m : { ...m, [date]: data.answer }));
    })();
    return () => { cancelled = true; };
  }, [userId, date, setAnswers]);

  const trimmed = answer.trim();
  const isShared = shared !== null;
  const upToDate = isShared && shared === trimmed;

  const share = async () => {
    if (!userId || !supabase || !trimmed) return;
    setBusy(true);
    setError(false);
    const { error: err } = await supabase.from("shared_answers").upsert({ user_id: userId, date, question_idx: idx, answer: trimmed.slice(0, 1000) });
    setBusy(false);
    if (err) { setError(true); return; }
    setShared(trimmed.slice(0, 1000));
  };

  const unshare = async () => {
    if (!userId || !supabase) return;
    setBusy(true);
    setError(false);
    const { error: err } = await supabase.from("shared_answers").delete().eq("user_id", userId).eq("date", date);
    setBusy(false);
    if (err) { setError(true); return; }
    setShared(null);
  };

  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{u("qTitle")}</div>
      <p className="font-display mt-1.5 text-[16px] font-bold leading-snug">{question}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswers((m) => ({ ...m, [date]: e.target.value }))}
        placeholder={u("qPlaceholder")}
        rows={3}
        maxLength={1000}
        aria-label={question}
        className="mt-3 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onInsert(`${question}\n${trimmed}`)}
          disabled={!trimmed}
          className={`${btn} border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]`}
        >
          {u("qAddToNote")}
        </button>
        {userId && (
          <>
            <button
              onClick={share}
              disabled={busy || !trimmed || upToDate}
              className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110`}
            >
              {isShared ? (upToDate ? u("qShared") : u("qUpdate")) : u("qShare")}
            </button>
            {isShared && (
              <button onClick={unshare} disabled={busy} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--hover)]`}>
                {u("qUnshare")}
              </button>
            )}
          </>
        )}
      </div>
      {!userId && <p className="mt-2 text-[12.5px] text-[var(--ink-soft)]">{u("qLoginHint")}</p>}
      {error && <p role="alert" className="mt-2 text-[12.5px] font-semibold text-[var(--danger)]">{u("qError")}</p>}
    </div>
  );
}
