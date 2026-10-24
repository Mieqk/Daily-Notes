import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { todayISO } from "../store";
import { makeSocial } from "../social-strings";

export interface FriendOpt { id: string; name: string }
interface Memory { id: string; author: string; friend: string; text: string; tag: string | null; memory_date: string; created_at: string }

/** Общие воспоминания с друзьями: запись видят оба, можно фильтровать по общим тегам. */
export default function SharedMemories({ userId, lang, friends }: { userId: string; lang: Lang; friends: FriendOpt[] }) {
  const s = makeSocial(lang);
  const [rows, setRows] = useState<Memory[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [withId, setWithId] = useState("");
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("shared_memories").select("*").order("memory_date", { ascending: false }).order("created_at", { ascending: false }).limit(100);
    setRows(error ? [] : ((data ?? []) as Memory[]));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (rows === null) return null;

  const nameOf = (id: string) => friends.find((f) => f.id === id)?.name || "—";
  const tags = [...new Set(rows.map((r) => r.tag).filter((x): x is string => Boolean(x)))];
  const shown = filter ? rows.filter((r) => r.tag === filter) : rows;
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" });
  const fmtDay = (iso: string) => { const [yy, mm, dd] = iso.split("-").map(Number); return fmt.format(new Date(yy, mm - 1, dd)); };

  const save = async () => {
    const to = withId || friends[0]?.id;
    if (!to || !text.trim()) return;
    setBusy(true); setErr(false);
    const { error } = await supabase!.from("shared_memories").insert({
      author: userId, friend: to, text: text.trim(), tag: tag.trim().replace(/^#/, "").slice(0, 24) || null, memory_date: todayISO(),
    });
    setBusy(false);
    if (error) { setErr(true); return; }
    setComposing(false); setText(""); setTag("");
    load();
  };

  const remove = async (id: string) => {
    await supabase!.from("shared_memories").delete().eq("id", id);
    load();
  };

  const field = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]";
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";

  return (
    <div className="mb-5 animate-rise rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">📸 {s("memTitle")}</h3>
        {friends.length > 0 && !composing && (
          <button onClick={() => { setComposing(true); setWithId(friends[0].id); }} className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] hover:bg-[var(--accent-soft)]">+ {s("memAdd")}</button>
        )}
      </div>

      {composing && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-[var(--hover)] p-3">
          <label className="text-[12px] font-semibold text-[var(--ink-soft)]">{s("memWith")}
            <select value={withId} onChange={(e) => setWithId(e.target.value)} className={`${field} mt-1 h-10`}>
              {friends.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={3} placeholder={s("memText")} aria-label={s("memText")} className={`${field} resize-y py-2.5`} />
          <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={24} placeholder={s("memTag")} aria-label={s("memTag")} className={`${field} h-10`} />
          {err && <p className="text-[12.5px] text-[var(--danger)]">{s("error")}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !text.trim()} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{s("memSave")}</button>
            <button onClick={() => setComposing(false)} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--panel)]`}>✕</button>
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[null, ...tags].map((tg) => (
            <button key={tg ?? "all"} onClick={() => setFilter(tg)} aria-pressed={filter === tg}
              className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-colors ${filter === tg ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--hover)] text-[var(--ink-soft)] hover:text-[var(--accent-deep)]"}`}>
              {tg ? `#${tg}` : s("memAll")}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-soft)]">{friends.length === 0 ? s("memNoFriends") : s("memEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((r) => {
            const other = r.author === userId ? r.friend : r.author;
            return (
              <li key={r.id} className="rounded-lg bg-[var(--accent-soft)] px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2 text-[12px] font-semibold text-[var(--ink-soft)]">
                  <span className="truncate">{s("memYouWith").replace("{name}", nameOf(other))}</span>
                  <span className="shrink-0 font-normal text-[var(--ink-faint)]">{fmtDay(r.memory_date)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{r.text}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[var(--accent-deep)]">{r.tag ? `#${r.tag}` : ""}</span>
                  <button onClick={() => remove(r.id)} className="text-[11.5px] text-[var(--ink-faint)] hover:text-[var(--danger)]">{s("memDelete")}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
