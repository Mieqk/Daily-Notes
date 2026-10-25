import { useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { fetchFriendOptions, type FriendOpt } from "../lib/friendOptions";
import { makeSocial } from "../social-strings";
import { makeMedia } from "../media-strings";
import { mediaErrorKey, prepareMedia, removeMedia, uploadMedia, type PendingMedia } from "../lib/media";
import MediaAttach from "./MediaAttach";

interface ShareEntryProps {
  userId: string;
  lang: Lang;
  date: string;
  content: string;
  mood: number | null;
  tags: string[];
  sealed: boolean;
  showToast: (msg: string) => void;
}

/** Кнопка «Поделиться» в редакторе дня: отправляет другу копию записи (текст, настроение, теги). */
export default function ShareEntry({ userId, lang, date, content, mood, tags, sealed, showToast }: ShareEntryProps) {
  const s = makeSocial(lang);
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<FriendOpt[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<PendingMedia | null>(null);
  const [mErr, setMErr] = useState<string | null>(null);
  const m = makeMedia(lang);
  const empty = !content.trim();

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && friends === null) setFriends(await fetchFriendOptions(userId));
  };

  const send = async (f: FriendOpt) => {
    if (!supabase || empty || sealed) return;
    setBusy(true);
    setMErr(null);
    let path: string | null = null;
    try {
      if (media) path = await uploadMedia(userId, f.id, await prepareMedia(media.file));
    } catch (e) {
      setBusy(false); setMErr(m(mediaErrorKey((e as Error).message))); return;
    }
    const { data: prev } = await supabase.from("shared_entries").select("id").eq("owner", userId).eq("friend", f.id).eq("entry_date", date).maybeSingle();
    const { error } = await supabase.from("shared_entries").upsert(
      {
        owner: userId, friend: f.id, entry_date: date, content: content.slice(0, 20000), mood, tags: tags.slice(0, 20), updated_at: new Date().toISOString(),
        ...(path ? { media_path: path, media_type: media!.kind } : {}),
      },
      { onConflict: "owner,friend,entry_date" },
    );
    setBusy(false);
    if (error) { removeMedia(path); showToast(s("error")); return; }
    setOpen(false);
    setMedia(null);
    showToast(s(prev ? "shUpdated" : "shSent").replace("{name}", f.name));
  };

  const hint = sealed ? s("shSealed") : empty ? s("shEmptyNote") : s("shWith");

  return (
    <span className="relative">
      <button
        onClick={toggle}
        disabled={empty || sealed}
        aria-expanded={open}
        title={hint}
        aria-label={hint}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-all duration-200 hover:bg-[var(--hover)] hover:text-[var(--ink)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden className="text-[15px] leading-none">💌</span>
        <span className="hidden whitespace-nowrap xl:inline">{s("shBtn")}</span>
      </button>
      {open && (
        <div className="absolute bottom-11 left-0 z-20 w-72 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3" style={{ boxShadow: "var(--shadow)" }}>
          <p className="mb-2 text-[12px] leading-snug text-[var(--ink-soft)]">{s("shWith")}</p>
          <MediaAttach lang={lang} value={media} onChange={setMedia} onError={setMErr} disabled={busy} className="mb-2" />
          {mErr && <p className="mb-2 text-[12px] text-[var(--danger)]">{mErr}</p>}
          {friends === null ? (
            <p className="text-[12.5px] text-[var(--ink-faint)]">{s("shLoadFriends")}</p>
          ) : friends.length === 0 ? (
            <p className="text-[12.5px] text-[var(--ink-faint)]">{s("shNoFriends")}</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {friends.map((f) => (
                <li key={f.id}>
                  <button onClick={() => send(f)} disabled={busy} className="flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-[11.5px] text-[var(--accent-deep)]">{s("shSend")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}
