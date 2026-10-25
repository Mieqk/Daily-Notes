import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { fromISO } from "../store";
import { MoodVisual } from "../icons";
import { makeSocial } from "../social-strings";
import FriendsSection, { EmptyState } from "./FriendsSection";
import type { FriendOpt } from "./SharedMemories";
import MediaView from "./MediaView";
import { removeMedia, useMediaUrls, type MediaType } from "../lib/media";

interface Row { id: string; owner: string; friend: string; entry_date: string; content: string; mood: number | null; tags: string[]; media_path: string | null; media_type: MediaType | null }

/** Записи, которыми друзья поделились со мной, и те, которыми поделился я (их можно отозвать). */
export default function SharedEntries({ userId, lang, friends, moodEmoji }: { userId: string; lang: Lang; friends: FriendOpt[]; moodEmoji: string[] }) {
  const s = makeSocial(lang);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("shared_entries").select("id,owner,friend,entry_date,content,mood,tags,media_path,media_type").order("entry_date", { ascending: false }).limit(100);
    setRows(error ? [] : ((data ?? []) as Row[]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const urls = useMediaUrls((rows ?? []).map((r) => r.media_path));
  if (rows === null) return null;

  const nameOf = (id: string) => friends.find((f) => f.id === id)?.name || "—";
  const fmt = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short", day: "numeric", month: "long" });
  const incoming = rows.filter((r) => r.friend === userId);
  const outgoing = rows.filter((r) => r.owner === userId);

  const remove = async (r: Row) => {
    await supabase!.from("shared_entries").delete().eq("id", r.id);
    if (r.owner === userId) removeMedia(r.media_path);
    load();
  };

  const item = (r: Row, mine: boolean) => {
    const open = openId === r.id;
    const label = mine ? s("shTo").replace("{name}", nameOf(r.friend)) : s("shFrom").replace("{name}", nameOf(r.owner));
    return (
      <li key={r.id} className="rounded-lg bg-[var(--accent-soft)] px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2 text-[12px] font-semibold text-[var(--ink-soft)]">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{label}</span>
            {r.mood !== null && <MoodVisual level={r.mood} emoji={moodEmoji[r.mood]} className="h-4 w-4 shrink-0 text-[14px] text-[var(--accent)]" />}
          </span>
          <span className="shrink-0 font-normal capitalize text-[var(--ink-faint)]">{fmt.format(fromISO(r.entry_date))}</span>
        </div>
        <p className={`mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed ${open ? "" : "line-clamp-3"}`}>{r.content}</p>
        {r.media_path && r.media_type && <MediaView url={urls[r.media_path]} type={r.media_type} className="mt-2" />}
        {r.tags.length > 0 && <p className="mt-1 text-[12px] font-semibold text-[var(--accent-deep)]">{r.tags.map((x) => `#${x}`).join(" ")}</p>}
        <div className="mt-1 flex items-center justify-between">
          <button onClick={() => setOpenId(open ? null : r.id)} className="text-[12px] font-semibold text-[var(--accent-deep)]">{open ? s("shClose") : s("shOpen")}</button>
          <button onClick={() => remove(r)} className="text-[11.5px] text-[var(--ink-faint)] hover:text-[var(--danger)]">{mine ? s("shRevoke") : s("shHide")}</button>
        </div>
      </li>
    );
  };

  return (
    <FriendsSection icon="💌" title={s("shTitle")} hint={s("shHint")} count={incoming.length}>
      {rows.length === 0 && <EmptyState icon="💌">{s("shEmpty")}</EmptyState>}
      {incoming.length > 0 && <ul className="flex flex-col gap-2.5">{incoming.map((r) => item(r, false))}</ul>}
      {outgoing.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{s("shMine")}</p>
          <ul className="flex flex-col gap-2.5">{outgoing.map((r) => item(r, true))}</ul>
        </>
      )}
    </FriendsSection>
  );
}
