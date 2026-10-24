import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";

type Counts = { friends: number; answers: number; thanks: number; near: number; capsules: number };

const TEXT: Record<string, Record<string, string>> = {
  ru: {
    title: "Ачивки за дружбу",
    friend1: "Первый друг", friend1d: "Добавьте друга",
    friend5: "Компания", friend5d: "5 друзей",
    answers1: "На связи", answers1d: "Поделитесь ответом на вопрос дня",
    answers7: "Неделя вопросов", answers7d: "7 опубликованных ответов",
    thanks1: "Спасибо!", thanks1d: "Поблагодарите друга",
    thanks10: "Щедрое сердце", thanks10d: "10 благодарностей друзьям",
    near1: "Рядом", near1d: "Откликнитесь на сигнал друга",
    capsule1: "Письмо в будущее", capsule1d: "Запечатайте запись в капсулу времени",
  },
  en: {
    title: "Friendship achievements",
    friend1: "First friend", friend1d: "Add a friend",
    friend5: "Squad", friend5d: "5 friends",
    answers1: "Staying in touch", answers1d: "Share an answer to the question of the day",
    answers7: "Week of questions", answers7d: "7 shared answers",
    thanks1: "Thank you!", thanks1d: "Thank a friend",
    thanks10: "Generous heart", thanks10d: "10 thank-yous to friends",
    near1: "Right here", near1d: "Respond to a friend's signal",
    capsule1: "Letter to the future", capsule1d: "Seal an entry in a time capsule",
  },
};

const LIST: { id: keyof Counts | string; key: string; count: keyof Counts; target: number }[] = [
  { id: "friend1", key: "friend1", count: "friends", target: 1 },
  { id: "friend5", key: "friend5", count: "friends", target: 5 },
  { id: "answers1", key: "answers1", count: "answers", target: 1 },
  { id: "answers7", key: "answers7", count: "answers", target: 7 },
  { id: "thanks1", key: "thanks1", count: "thanks", target: 1 },
  { id: "thanks10", key: "thanks10", count: "thanks", target: 10 },
  { id: "near1", key: "near1", count: "near", target: 1 },
  { id: "capsule1", key: "capsule1", count: "capsules", target: 1 },
];

/** Ачивки считаются из того, что уже есть в базе: ничего отдельно не хранится. */
export default function Achievements({ userId, lang }: { userId: string; lang: Lang }) {
  const t = (k: string) => (TEXT[lang] ?? TEXT.en)[k] ?? TEXT.en[k];
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const count = async (table: string, col: string | null, val?: string) => {
      let q = supabase!.from(table).select("*", { count: "exact", head: true });
      q = col ? q.eq(col, val ?? userId) : q;
      const { count: c, error } = await q;
      return error ? 0 : c ?? 0;
    };
    (async () => {
      const [friends, answers, thanks, near] = await Promise.all([
        count("friendships", "status", "accepted"),
        count("shared_answers", "user_id"),
        count("gratitude", "from_user"),
        count("sos_support", "user_id"),
      ]);
      let capsules = 0;
      try { capsules = Object.keys(JSON.parse(localStorage.getItem("dn.capsules") || "{}")).length; } catch { /* ignore */ }
      if (!cancelled) setCounts({ friends, answers, thanks, near, capsules });
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!counts) return null;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("title")}</div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {LIST.map((a) => {
          const have = counts[a.count];
          const done = have >= a.target;
          return (
            <li key={a.id} className={`rounded-lg border px-3 py-2.5 ${done ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel-2)]"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[13.5px] font-bold ${done ? "text-[var(--accent-deep)]" : "text-[var(--ink-soft)]"}`}>{t(a.key)}</span>
                <span className="text-[11.5px] font-semibold tabular-nums text-[var(--ink-soft)]">{Math.min(have, a.target)}/{a.target}</span>
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{t(`${a.key}d`)}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hover)]" aria-hidden="true">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${Math.min(100, (have / a.target) * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
