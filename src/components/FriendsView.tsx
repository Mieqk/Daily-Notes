import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";

interface FriendsViewProps {
  userId: string;
  lang: Lang;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar: string | null;
  friend_code: string | null;
}

interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  sender: string;
  status: string;
}

const AVATARS = ["😎", "", "", "🌸", "🔥", "", "", "", "🐙", "🦄", "🍀", ""];

const L: Record<string, Record<string, string>> = {
  ru: {
    title: "Друзья", sub: "делись моментами с близкими",
    myProfile: "Мой профиль", name: "Имя", namePh: "Как тебя видят друзья",
    avatar: "Аватар", myCode: "Мой код друга", copy: "Копировать", copied: "Скопировано!",
    addFriend: "Добавить друга", codePh: "Код друга (6 символов)", find: "Найти",
    sendReq: "Отправить запрос", reqSent: "Запрос отправлен",
    incoming: "Входящие запросы", accept: "Принять", decline: "Отклонить",
    friends: "Мои друзья", noFriends: "Пока нет друзей — отправь свой код близким",
    noReqs: "Нет входящих запросов", notFound: "Не найдено. Проверь код",
    selfErr: "Нельзя добавить самого себя", already: "Вы уже друзья или запрос отправлен",
    remove: "Удалить",
  },
  en: {
    title: "Friends", sub: "share moments with close ones",
    myProfile: "My profile", name: "Name", namePh: "How friends see you",
    avatar: "Avatar", myCode: "My friend code", copy: "Copy", copied: "Copied!",
    addFriend: "Add a friend", codePh: "Friend code (6 chars)", find: "Find",
    sendReq: "Send request", reqSent: "Request sent",
    incoming: "Incoming requests", accept: "Accept", decline: "Decline",
    friends: "My friends", noFriends: "No friends yet — share your code",
    noReqs: "No incoming requests", notFound: "Not found. Check the code",
    selfErr: "You cannot add yourself", already: "Already friends or request sent",
    remove: "Remove",
  },
};

function genCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function FriendsView({ userId, lang }: FriendsViewProps) {
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];
  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4";

  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<{ row: Friendship; profile: Profile }[]>([]);
  const [incoming, setIncoming] = useState<{ row: Friendship; profile: Profile }[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [found, setFound] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    // мой профиль + код
    let my = (await supabase!.from("profiles").select("*").eq("id", userId).single()).data as Profile | null;
    if (my && !my.friend_code) {
      const code = genCode();
      const { data } = await supabase!.from("profiles").update({ friend_code: code }).eq("id", userId).select().single();
      if (data) my = data as Profile;
    }
    setMe(my);

    // дружбы
        const { data: rows } = await supabase!.from("friendships").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const all = (rows ?? []) as Friendship[];

    const accepted = all.filter((r) => r.status === "accepted");
    const inc = all.filter((r) => r.status === "pending" && r.sender !== userId);

    const withProfiles = async (list: Friendship[]) => {
      const out: { row: Friendship; profile: Profile }[] = [];
      for (const row of list) {
        const otherId = row.user_a === userId ? row.user_b : row.user_a;
        const { data } = await supabase!.from("profiles").select("*").eq("id", otherId).single();
        if (data) out.push({ row, profile: data as Profile });
      }
      return out;
    };

    setFriends(await withProfiles(accepted));
    setIncoming(await withProfiles(inc));
  };

  useEffect(() => { load(); }, [userId]);

  const saveProfile = async (patch: Partial<Profile>) => {
    const { data } = await supabase!.from("profiles").update(patch).eq("id", userId).select().single();
    if (data) setMe(data as Profile);
  };

  const copyCode = async () => {
    if (!me?.friend_code) return;
    try {
      await navigator.clipboard.writeText(me.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const search = async () => {
    setFound(null);
    setMsg(null);
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase!.from("profiles").select("*").eq("friend_code", code).single();
    if (!data) { setMsg({ kind: "err", text: t("notFound") }); return; }
    const p = data as Profile;
    if (p.id === userId) { setMsg({ kind: "err", text: t("selfErr") }); return; }
    setFound(p);
  };

  const sendRequest = async (other: Profile) => {
    const a = userId < other.id ? userId : other.id;
    const b = userId < other.id ? other.id : userId;
    const { error } = await supabase!.from("friendships").insert({ user_a: a, user_b: b, sender: userId, status: "pending" });
    if (error) setMsg({ kind: "err", text: t("already") });
    else { setMsg({ kind: "ok", text: t("reqSent") }); setFound(null); setSearchCode(""); }
  };

  const answer = async (row: Friendship, status: "accepted" | "declined") => {
    await supabase!.from("friendships").update({ status }).eq("id", row.id);
    load();
  };

  const removeFriend = async (row: Friendship) => {
    await supabase!.from("friendships").delete().eq("id", row.id);
    load();
  };

  const person = (p: Profile) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[20px]">{p.avatar || "🙂"}</span>
      <span className="truncate text-[14px] font-semibold">{p.display_name || p.friend_code || "—"}</span>
    </span>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Мой профиль */}
      <div className={`${card} mb-5 animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">👤 {t("myProfile")}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("avatar")}</div>
            <div className="flex flex-wrap gap-1">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => saveProfile({ avatar: a })} className={`grid h-9 w-9 place-items-center rounded-lg text-[18px] transition-all active:scale-90 ${me?.avatar === a ? "bg-[var(--accent)]" : "bg-[var(--hover)] hover:bg-[var(--accent-soft)]"}`}>{a}</button>
              ))}
            </div>
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("name")}</div>
            <input value={me?.display_name ?? ""} onChange={(e) => saveProfile({ display_name: e.target.value })} placeholder={t("namePh")} className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("myCode")}</div>
            <button onClick={copyCode} className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-4 font-mono text-[15px] font-bold tracking-[0.2em] text-[var(--accent-deep)] active:scale-95">
              {me?.friend_code ?? "…"} <span className="text-[11px] font-semibold tracking-normal">{copied ? t("copied") : t("copy")}</span>
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-[13px] font-semibold ${msg.kind === "ok" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
          {msg.text}
        </div>
      )}

      {/* Добавить друга */}
      <div className={`${card} mb-5 animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">➕ {t("addFriend")}</h3>
        <div className="flex gap-2">
          <input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder={t("codePh")} className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-[var(--accent)]" />
          <button onClick={search} className="h-10 shrink-0 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95">{t("find")}</button>
        </div>
        {found && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
            {person(found)}
            <button onClick={() => sendRequest(found)} className="h-9 shrink-0 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">{t("sendReq")}</button>
          </div>
        )}
      </div>

      {/* Входящие запросы */}
      <div className={`${card} mb-5 animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold"> {t("incoming")}</h3>
        {incoming.length === 0 && <p className="text-sm text-[var(--ink-faint)]">{t("noReqs")}</p>}
        <div className="flex flex-col gap-2">
          {incoming.map(({ row, profile }) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
              {person(profile)}
              <span className="flex shrink-0 gap-2">
                <button onClick={() => answer(row, "accepted")} className="h-9 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">{t("accept")}</button>
                <button onClick={() => answer(row, "declined")} className="h-9 rounded-lg border border-[var(--line)] px-3.5 text-[12.5px] font-semibold text-[var(--ink-faint)] active:scale-95">{t("decline")}</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Мои друзья */}
      <div className={`${card} animate-rise`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">💚 {t("friends")}</h3>
        {friends.length === 0 && <p className="text-sm text-[var(--ink-faint)]">{t("noFriends")}</p>}
        <div className="flex flex-col gap-2">
          {friends.map(({ row, profile }) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
              {person(profile)}
              <button onClick={() => removeFriend(row)} className="h-8 shrink-0 rounded-lg px-2.5 text-[11.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]">{t("remove")}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
