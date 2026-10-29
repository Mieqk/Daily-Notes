import { useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { makeFriendNotes } from "../friend-notes-strings";

export interface FriendNote {
  nickname: string;
  note: string;
}

interface Props {
  userId: string;
  friendId: string;
  lang: Lang;
  value: FriendNote;
  onSaved: (v: FriendNote) => void;
}

/** Личные ник и заметка о друге. Хранятся в friend_notes с RLS только для владельца. */
export default function FriendNoteEditor({ userId, friendId, lang, value, onSaved }: Props) {
  const f = makeFriendNotes(lang);
  const [nickname, setNickname] = useState(value.nickname);
  const [note, setNote] = useState(value.note);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (next: FriendNote) => {
    setBusy(true);
    const { error } = await supabase!
      .from("friend_notes")
      .upsert({ owner_id: userId, friend_id: friendId, nickname: next.nickname, note: next.note, updated_at: new Date().toISOString() }, { onConflict: "owner_id,friend_id" });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: f("failed") }); return; }
    setMsg({ ok: true, text: f("saved") });
    onSaved(next);
  };

  const input = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]";

  return (
    <div className="mt-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-bold">🔒 {f("title")}</span>
        <span className="text-[11.5px] text-[var(--ink-faint)]">{f("privateHint")}</span>
      </div>
      <label className="mb-1 block text-[11.5px] font-semibold text-[var(--ink-soft)]">{f("nickLabel")}</label>
      <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} placeholder={f("nickPh")} className={`${input} h-10`} />
      <label className="mb-1 mt-2.5 block text-[11.5px] font-semibold text-[var(--ink-soft)]">{f("noteLabel")}</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} placeholder={f("notePh")} className={`${input} resize-y py-2`} />
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => save({ nickname: nickname.trim(), note: note.trim() })}
          disabled={busy}
          className="h-9 rounded-lg bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-50"
        >
          {f("save")}
        </button>
        {value.nickname && (
          <button
            onClick={() => { setNickname(""); save({ nickname: "", note: note.trim() }); }}
            disabled={busy}
            className="h-9 rounded-lg px-3 text-[12px] font-semibold text-[var(--ink-faint)] hover:bg-[var(--hover)]"
          >
            {f("clear")}
          </button>
        )}
        {msg && <span role="status" className={`text-[12px] font-semibold ${msg.ok ? "text-[var(--accent-deep)]" : "text-[var(--danger)]"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
