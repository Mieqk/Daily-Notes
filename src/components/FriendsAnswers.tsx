import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import { questionText } from "../lib/questions";
import { shiftISO, todayISO } from "../store";
import { makeUI } from "../ui-strings";
import FriendsSection, { EmptyState } from "./FriendsSection";

interface Row { user_id: string; date: string; question_idx: number; answer: string; created_at: string }
interface Person { id: string; display_name: string | null; avatar: string | null; avatar_url: string | null }

/** Ответы друзей (и свой) на вопрос дня за сегодня и вчера. */
export default function FriendsAnswers({ userId, lang }: { userId: string; lang: Lang }) {
  const u = makeUI(lang);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from("shared_answers")
        .select("*")
        .gte("date", shiftISO(todayISO(), -1))
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) { setRows([]); return; }
      const list = (data ?? []) as Row[];
      setRows(list);
      const others = [...new Set(list.map((r) => r.user_id).filter((id) => id !== userId))];
      const profiles = await fetchProfiles<Person>(others);
      if (!cancelled) setPeople(new Map(profiles.map((p) => [p.id, p])));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (rows === null) return null;

  const avatar = (p?: Person) =>
    p?.avatar_url ? (
      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[18px]">{p?.avatar || "🙂"}</span>
    );

  return (
    <FriendsSection icon="💬" title={u("qFriendsTitle")}>
      {rows.length === 0 ? (
        <EmptyState icon="💬">{u("qFriendsEmpty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const me = r.user_id === userId;
            const p = people.get(r.user_id);
            return (
              <li key={`${r.user_id}-${r.date}`} className="flex gap-3">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{me ? <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[12px] font-bold text-[var(--accent-deep)]">{u("qYou")}</span> : avatar(p)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{me ? u("qYou") : p?.display_name || "—"}</span>
                    <span className="text-[11px] text-[var(--ink-faint)]">{r.date}</span>
                  </div>
                  <div className="text-[12px] text-[var(--ink-soft)]">{questionText(lang, r.question_idx)}</div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{r.answer}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FriendsSection>
  );
}
