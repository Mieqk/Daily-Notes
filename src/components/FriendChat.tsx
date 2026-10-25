import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { sendPushEvent } from "../lib/push";
import { generateUUID } from "../lib/uuid";
import { CHAT_BUCKET, CHAT_COLS, CHAT_READ_EVENT, type ChatMessage } from "../lib/chat";
import { mediaErrorKey, prepareMedia, removeMedia, uploadMedia, type PendingMedia } from "../lib/media";
import { makeMedia } from "../media-strings";
import MediaAttach from "./MediaAttach";
import MediaView from "./MediaView";
import { makeChat } from "../chat-strings";
import { XIcon } from "../icons";
import { PRESENCE_COLOR, type PresenceState } from "../lib/presence";

export interface ChatFriend { id: string; name: string; avatar: string | null; avatar_url: string | null; presence?: string | null; presenceState?: PresenceState | null }

const PAGE = 40;
const POLL_MS = 15_000;
const URL_TTL = 3600;


/** Личный чат с другом: текст, фото и видео. Новые сообщения приходят через Realtime, опрос страхует от обрыва связи. */
export default function FriendChat({ userId, friend, lang, onClose }: { userId: string; friend: ChatFriend; lang: Lang; onClose: () => void }) {
  const c = makeChat(lang);
  const m2 = makeMedia(lang);
  const [msgs, setMsgs] = useState<ChatMessage[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [selId, setSelId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const requested = useRef(new Set<string>());

  const pairFilter = `and(sender.eq.${userId},recipient.eq.${friend.id}),and(sender.eq.${friend.id},recipient.eq.${userId})`;

  const fetchLatest = useCallback(async () => {
    const { data, error } = await supabase!.from("chat_messages").select(CHAT_COLS).or(pairFilter).order("created_at", { ascending: false }).limit(PAGE);
    if (error) return null;
    return ((data ?? []) as ChatMessage[]).reverse();
  }, [pairFilter]);

  const mergeLatest = useCallback((latest: ChatMessage[], first: boolean) => {
    setMsgs((prev) => {
      if (!prev || first) return latest;
      if (latest.length === 0) return prev;
      const cutoff = latest[0].created_at;
      return [...prev.filter((m) => m.created_at < cutoff), ...latest];
    });
    if (first) setHasMore(latest.length === PAGE);
  }, []);

  // первая загрузка
  useEffect(() => {
    let alive = true;
    setMsgs(null);
    fetchLatest().then((latest) => {
      if (!alive) return;
      if (latest === null) { setErr(c("loadErr")); setMsgs([]); return; }
      mergeLatest(latest, true);
    });
    return () => { alive = false; };
  }, [fetchLatest, mergeLatest]);

  // реальное время + опрос
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`chat-${friend.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient=eq.${userId}` }, (p) => {
        const m = p.new as ChatMessage;
        if (m.sender !== friend.id) return;
        setMsgs((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `sender=eq.${userId}` }, (p) => {
        const m = p.new as ChatMessage;
        setMsgs((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setMsgs((prev) => prev && prev.filter((x) => x.id !== id));
      })
      .subscribe();
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      const latest = await fetchLatest();
      if (latest) mergeLatest(latest, false);
    }, POLL_MS);
    return () => { supabase!.removeChannel(channel); window.clearInterval(timer); };
  }, [userId, friend.id, fetchLatest, mergeLatest]);

  // прочитано: всё, что друг прислал и мы увидели
  useEffect(() => {
    if (!msgs || !msgs.some((m) => m.sender === friend.id && !m.read_at)) return;
    const now = new Date().toISOString();
    supabase!.from("chat_messages").update({ read_at: now }).eq("sender", friend.id).eq("recipient", userId).is("read_at", null).then(({ error }) => {
      if (error) return;
      setMsgs((prev) => prev && prev.map((m) => (m.sender === friend.id && !m.read_at ? { ...m, read_at: now } : m)));
      window.dispatchEvent(new Event(CHAT_READ_EVENT));
    });
  }, [msgs, friend.id, userId]);

  // временные ссылки на вложения (бакет закрытый)
  useEffect(() => {
    if (!msgs) return;
    const need = msgs.map((m) => m.media_path).filter((p): p is string => Boolean(p) && !urls[p!] && !requested.current.has(p!));
    if (need.length === 0) return;
    need.forEach((p) => requested.current.add(p));
    supabase!.storage.from(CHAT_BUCKET).createSignedUrls(need, URL_TTL).then(({ data }) => {
      const add: Record<string, string> = {};
      for (const r of data ?? []) if (r.path && r.signedUrl) add[r.path] = r.signedUrl;
      need.forEach((p) => { if (!add[p]) requested.current.delete(p); });
      setUrls((u) => ({ ...u, ...add }));
    });
  }, [msgs, urls]);

  // ссылки живут час: обновляем, если окно открыто долго
  useEffect(() => {
    const id = window.setInterval(() => { requested.current.clear(); setUrls({}); }, (URL_TTL - 300) * 1000);
    return () => window.clearInterval(id);
  }, []);

  // прокрутка вниз, пока человек сам не поднялся вверх
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs, urls, pending]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!err) return;
    const id = window.setTimeout(() => setErr(null), 4000);
    return () => window.clearTimeout(id);
  }, [err]);

  const loadOlder = async () => {
    if (!msgs || msgs.length === 0) return;
    const el = listRef.current;
    const prevH = el?.scrollHeight ?? 0;
    stickRef.current = false;
    const { data } = await supabase!.from("chat_messages").select(CHAT_COLS).or(pairFilter).lt("created_at", msgs[0].created_at).order("created_at", { ascending: false }).limit(PAGE);
    const older = ((data ?? []) as ChatMessage[]).reverse();
    setHasMore(older.length === PAGE);
    setMsgs((prev) => (prev ? [...older, ...prev] : older));
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH; });
  };

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = async () => {
    const body = text.trim();
    if (busy || (!body && !pending)) return;
    setBusy(true);
    setErr(null);
    let path: string | null = null;
    try {
      let media_type: "image" | "video" | "audio" | null = null;
      if (pending) {
        path = await uploadMedia(userId, friend.id, await prepareMedia(pending.file));
        media_type = pending.kind;
      }
      const { data, error } = await supabase!
        .from("chat_messages")
        .insert({ sender: userId, recipient: friend.id, body: body || null, media_path: path, media_type })
        .select(CHAT_COLS)
        .single();
      if (error || !data) throw new Error("insert");
      const row = data as ChatMessage;
      stickRef.current = true;
      setMsgs((prev) => (prev && !prev.some((x) => x.id === row.id) ? [...prev, row] : prev));
      setText("");
      setPending(null);
      sendPushEvent("chat", row.id);
    } catch (e) {
      removeMedia(path);
      const msg = e instanceof Error ? e.message : "";
      setErr(msg === "insert" ? c("failed") : m2(mediaErrorKey(msg)).replace("{mb}", msg === "too-big-audio" ? "10" : "25"));
    }
    setBusy(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const remove = async (m: ChatMessage) => {
    if (confirmId !== m.id) { setConfirmId(m.id); window.setTimeout(() => setConfirmId((cur) => (cur === m.id ? null : cur)), 3000); return; }
    setConfirmId(null);
    setSelId(null);
    if (m.media_path) await supabase!.storage.from(CHAT_BUCKET).remove([m.media_path]);
    const { error } = await supabase!.from("chat_messages").delete().eq("id", m.id);
    if (error) setErr(c("failed"));
    else setMsgs((prev) => prev && prev.filter((x) => x.id !== m.id));
  };

  const locale = localeOf(lang);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    const now = new Date();
    const yest = new Date(now.getTime() - 86_400_000);
    if (key(d) === key(now)) return c("today");
    if (key(d) === key(yest)) return c("yesterday");
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" }).format(d);
  };

  const ava = friend.avatar_url ? (
    <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[18px]">{friend.avatar || "🙂"}</span>
  );

  const canSend = !busy && (text.trim().length > 0 || pending !== null);
  const title = c("title").replace("{name}", friend.name);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="animate-fadein absolute inset-0 bg-black/45" aria-label={c("close")} onClick={onClose} />
      <div
        className="animate-rise safe-top safe-bottom relative flex h-full w-full flex-col overflow-hidden border border-[var(--line)] bg-[var(--panel)] sm:h-[min(86vh,720px)] sm:max-w-lg sm:rounded-2xl"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{ava}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold leading-tight">{friend.name}</h2>
            {friend.presence && (
              <p className="truncate text-[11.5px] font-medium" style={{ color: friend.presenceState && friend.presenceState !== "offline" ? PRESENCE_COLOR[friend.presenceState] : "var(--ink-faint)" }}>{friend.presence}</p>
            )}
          </div>
          <button onClick={onClose} aria-label={c("close")} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--ink-faint)] hover:bg-[var(--hover)]">
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </header>

        <div ref={listRef} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {hasMore && (
            <button onClick={loadOlder} className="mx-auto mb-2 rounded-full bg-[var(--hover)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)]">{c("older")}</button>
          )}
          {msgs === null && <p className="m-auto text-[13px] text-[var(--ink-faint)]">…</p>}
          {msgs && msgs.length === 0 && <p className="m-auto max-w-[16rem] text-center text-[13px] leading-relaxed text-[var(--ink-faint)]">{c("empty")}</p>}
          {msgs?.map((m, i) => {
            const mine = m.sender === userId;
            const prev = msgs[i - 1];
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const url = m.media_path ? urls[m.media_path] : undefined;
            const selected = selId === m.id;
            return (
              <div key={m.id} className="flex flex-col">
                {newDay && <p className="my-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">{dayLabel(m.created_at)}</p>}
                <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    onClick={() => mine && setSelId(selected ? null : m.id)}
                    className={`max-w-[82%] overflow-hidden rounded-2xl ${mine ? "cursor-pointer bg-[var(--accent)] text-[var(--accent-ink)]" : "border border-[var(--line)] bg-[var(--panel-2)]"}`}
                  >
                    {m.media_path && m.media_type && <MediaView url={url} type={m.media_type} className="rounded-none" />}
                    {m.body && <p className="whitespace-pre-wrap break-words px-3 py-2 text-[14.5px] leading-snug">{m.body}</p>}
                  </div>
                  <p className="mt-0.5 px-1 text-[10.5px] text-[var(--ink-faint)]">
                    {timeFmt.format(new Date(m.created_at))}
                    {mine && <span aria-label={m.read_at ? c("seen") : c("sent")}> {m.read_at ? "✓✓" : "✓"}</span>}
                  </p>
                  {mine && selected && (
                    <button
                      onClick={() => remove(m)}
                      className={`mb-1 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ${confirmId === m.id ? "bg-[var(--danger)] text-white" : "text-[var(--ink-faint)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"}`}
                    >
                      {confirmId === m.id ? c("delSure") : c("del")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {err && <p className="shrink-0 bg-[var(--danger-soft)] px-4 py-2 text-[12.5px] font-semibold text-[var(--danger)]">{err}</p>}

        <div className="relative flex shrink-0 items-end gap-2 border-t border-[var(--line)] px-3 py-2.5">
          <MediaAttach lang={lang} value={pending} onChange={setPending} onError={setErr} disabled={busy} floating />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={2000}
            placeholder={c("placeholder")}
            aria-label={c("placeholder")}
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-2.5 text-[14.5px] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={send}
            disabled={!canSend}
            className="h-11 shrink-0 rounded-xl bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-50"
          >
            {busy ? c("sending") : c("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
