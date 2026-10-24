import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import { makeUI } from "../ui-strings";
import FriendsSection, { EmptyState } from "./FriendsSection";

interface Row { id: string; from_user: string; to_user: string; text: string; created_at: string }
interface Person { id: string; display_name: string | null; avatar: string | null; avatar_url: string | null }

/** Благодарности: что написали вам и что написали вы (последние 20). */
export default function GratitudeFeed({ userId, lang, refreshKey }: { userId: string; lang: Lang; refreshKey: number }) {
  const u = makeUI(lang);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.from("gratitude").select("*").order("created_at", { ascending: false }).limit(20);
      if (cancelled) return;
      if (error) { setRows([]); return; }
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = [...new Set(list.map((r) => (r.from_user === userId ? r.to_user : r.from_user)))];
      const profiles = await fetchProfiles<Person>(ids);
      if (!cancelled) setPeople(new Map(profiles.map((p) => [p.id, p])));
    })();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (rows === null) return null;

  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });

  return (
    <FriendsSection icon="💌" title={u("gTitle")}>
      {rows.length === 0 ? (
        <EmptyState icon="💌">{u("gEmpty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const mine = r.from_user === userId;
            const other = people.get(mine ? r.to_user : r.from_user);
            const name = other?.display_name || "—";
            return (
              <li key={r.id} className={`rounded-lg px-3 py-2.5 ${mine ? "bg-[var(--hover)]" : "bg-[var(--accent-soft)]"}`}>
                <div className="flex items-baseline justify-between gap-2 text-[12px] font-semibold text-[var(--ink-soft)]">
                  <span className="truncate">{mine ? u("gYouTo").replace("{name}", name) : name}</span>
                  <span className="shrink-0 font-normal text-[var(--ink-faint)]">{fmt.format(new Date(r.created_at))}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{r.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </FriendsSection>
  );
}
