import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import ProfilePage from "./ProfilePage";
import FriendsAnswers from "./FriendsAnswers";
import GratitudeFeed from "./GratitudeFeed";
import SosPanel from "./SosPanel";
import SharedMemories from "./SharedMemories";
import BuddyHabits from "./BuddyHabits";
import Challenges from "./Challenges";
import FriendsSection, { GroupLabel, EmptyState } from "./FriendsSection";
import { makeUI } from "../ui-strings";

interface FriendsViewProps {
  userId: string;
  lang: Lang;
  streak: number;
  notesCount: number;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar: string | null;
  avatar_url: string | null;
  bio: string | null;
  friend_code: string | null;
  status_emoji: string | null;
  status_text: string | null;
}

interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  sender: string;
  status: string;
}

const L: Record<string, Record<string, string>> = {
  ru: {
    myCode: "Мой код друга", copy: "Копировать", copied: "Скопировано!",
    addFriend: "Добавить друга", codePh: "Код друга (6 символов)", find: "Найти",
    sendReq: "Отправить запрос", reqSent: "Запрос отправлен",
    incoming: "Входящие запросы", accept: "Принять", decline: "Отклонить",
    friends: "Мои друзья", noFriends: "Пока нет друзей — отправь свой код близким",
    noReqs: "Нет входящих запросов", notFound: "Не найдено. Проверь код",
    selfErr: "Нельзя добавить самого себя", already: "Вы уже друзья или запрос отправлен",
    remove: "Удалить", removeSure: "Точно удалить?",
    addHint: "Введи код друга или поделись своим", gConnect: "Друзья", gTogether: "Вместе", gCare: "Забота и поддержка",
  },
  en: {
    myCode: "My friend code", copy: "Copy", copied: "Copied!",
    addFriend: "Add a friend", codePh: "Friend code (6 chars)", find: "Find",
    sendReq: "Send request", reqSent: "Request sent",
    incoming: "Incoming requests", accept: "Accept", decline: "Decline",
    friends: "My friends", noFriends: "No friends yet — share your code",
    noReqs: "No incoming requests", notFound: "Not found. Check the code",
    selfErr: "You cannot add yourself", already: "Already friends or request sent",
    remove: "Remove", removeSure: "Really remove?",
    addHint: "Enter a friend's code or share yours", gConnect: "Friends", gTogether: "Together", gCare: "Care & support",
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
  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)]";

  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<{ row: Friendship; profile: Profile }[]>([]);
  const [incoming, setIncoming] = useState<{ row: Friendship; profile: Profile }[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [found, setFound] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const u = makeUI(lang);
  const [thanksTo, setThanksTo] = useState<string | null>(null);
  const [thanksText, setThanksText] = useState("");
  const [thanksBusy, setThanksBusy] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const sendThanks = async (toId: string) => {
    const text = thanksText.trim();
    if (!text) return;
    setThanksBusy(true);
    const { error } = await supabase!.from("gratitude").insert({ from_user: userId, to_user: toId, text });
    setThanksBusy(false);
    if (error) {
      // уникальный индекс: одна благодарность одному другу в сутки
      setMsg({ kind: "err", text: error.code === "23505" ? u("gAlready") : t("already") });
      return;
    }
    setThanksTo(null);
    setThanksText("");
    setFeedKey((k) => k + 1);
    setMsg({ kind: "ok", text: u("gSentOk") });
  };
  const confirmTimer = useRef<number>(0);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 2600);
    return () => window.clearTimeout(id);
  }, [msg]);

  const load = async () => {
    let my = (await supabase!.from("profiles").select("*").eq("id", userId).single()).data as Profile | null;
    if (my && !my.friend_code) {
      const code = genCode();
      const { data } = await supabase!.from("profiles").update({ friend_code: code }).eq("id", userId).select().single();
      if (data) my = data as Profile;
    }
    setMe(my);

    const { data: rows } = await supabase!.from("friendships").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const all = (rows ?? []) as Friendship[];
    const accepted = all.filter((r) => r.status === "accepted");
    const inc = all.filter((r) => r.status === "pending" && r.sender !== userId);

    const withProfiles = async (list: Friendship[]) => {
      const otherIds = list.map((row) => (row.user_a === userId ? row.user_b : row.user_a));
      const profiles = await fetchProfiles<Profile>(otherIds);
      const byId = new Map(profiles.map((pr) => [pr.id, pr]));
      const out: { row: Friendship; profile: Profile }[] = [];
      list.forEach((row, i) => {
        const profile = byId.get(otherIds[i]);
        if (profile) out.push({ row, profile });
      });
      return out;
    };

    setFriends(await withProfiles(accepted));
    setIncoming(await withProfiles(inc));
  };

  useEffect(() => { load(); }, [userId]);

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
    // Поиск по коду идёт через RPC, который отдаёт только публичные поля профиля.
    // Если функции в базе ещё нет (старая схема), пробуем прямой запрос.
    const rpc = await supabase!.rpc("find_profile_by_code", { code });
    let data: unknown = Array.isArray(rpc.data) ? rpc.data[0] : null;
    if (rpc.error) {
      data = (await supabase!.from("profiles").select("*").eq("friend_code", code).maybeSingle()).data;
    }
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
    setConfirmId(null);
    load();
  };

  const askRemove = (row: Friendship) => {
    if (confirmId === row.id) { removeFriend(row); return; }
    setConfirmId(row.id);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
  };

  const avaNode = (p: Profile | null, emojiSize: string) =>
    p?.avatar_url ? (
      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)]" style={{ fontSize: emojiSize }}>
        {p?.avatar || "🙂"}
      </span>
    );

  const friendOpts = friends.map(({ profile }) => ({ id: profile.id, name: profile.display_name || profile.friend_code || "—" }));

  const person = (p: Profile) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{avaNode(p, "20px")}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold">{p.display_name || p.friend_code || "—"}</span>
        <span className="block truncate text-[11.5px] text-[var(--ink-faint)]">
          {p.status_emoji || p.status_text ? (
            <>{p.status_emoji} {p.status_text}</>
          ) : (
            p.bio || "\u00A0"
          )}
        </span>
      </span>
    </span>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-[13px] font-semibold ${msg.kind === "ok" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
          {msg.text}
        </div>
      )}

      <GroupLabel>{t("gConnect")}</GroupLabel>

      {/* ===== Добавить друга ===== */}
      <FriendsSection icon="➕" title={t("addFriend")} hint={t("addHint")}>
        <button
          onClick={copyCode}
          aria-label={t("copy")}
          className="mb-3 flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3.5 py-2.5 text-left active:scale-[0.99]"
        >
          <span className="text-[12px] font-semibold text-[var(--ink-soft)]">{t("myCode")}</span>
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-[15px] font-bold tracking-[0.2em] text-[var(--accent-deep)]">{me?.friend_code ?? "…"}</span>
            <span className="rounded-md bg-[var(--panel)] px-2 py-1 text-[11.5px] font-semibold text-[var(--ink-soft)]">{copied ? t("copied") : t("copy")}</span>
          </span>
        </button>
        <div className="flex gap-2">
          <input
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder={t("codePh")}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 font-mono text-sm uppercase tracking-widest outline-none focus:border-[var(--accent)]"
          />
          <button onClick={search} className="h-11 shrink-0 rounded-xl bg-[var(--accent)] px-5 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95">
            {t("find")}
          </button>
        </div>
        {found && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
            {person(found)}
            <button onClick={() => sendRequest(found)} className="h-9 shrink-0 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">
              {t("sendReq")}
            </button>
          </div>
        )}
      </FriendsSection>

      {/* ===== Входящие запросы ===== */}
      <FriendsSection icon="📬" title={t("incoming")} count={incoming.length} accent={incoming.length > 0}>
        {incoming.length === 0 && <EmptyState icon="📭">{t("noReqs")}</EmptyState>}
        <div className="flex flex-col gap-2">
          {incoming.map(({ row, profile }) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
              <button onClick={() => setViewId(profile.id)} className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80">
                {person(profile)}
              </button>
              <span className="flex shrink-0 gap-2">
                <button onClick={() => answer(row, "accepted")} className="h-9 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">
                  {t("accept")}
                </button>
                <button onClick={() => answer(row, "declined")} className="h-9 rounded-lg border border-[var(--line)] px-3.5 text-[12.5px] font-semibold text-[var(--ink-faint)] active:scale-95">
                  {t("decline")}
                </button>
              </span>
            </div>
          ))}
        </div>
      </FriendsSection>

      {/* ===== Мои друзья ===== */}
      <FriendsSection icon="💚" title={t("friends")} count={friends.length}>
        {friends.length === 0 && <EmptyState icon="💌">{t("noFriends")}</EmptyState>}
        <div className="flex flex-col gap-2">
          {friends.map(({ row, profile }) => (
            <div key={row.id} className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setViewId(profile.id)} className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80">
                {person(profile)}
              </button>
              <button
                onClick={() => { setThanksTo(thanksTo === profile.id ? null : profile.id); setThanksText(""); }}
                aria-expanded={thanksTo === profile.id}
                className="h-8 shrink-0 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] transition-colors hover:bg-[var(--accent-soft)]"
              >
                {u("gThank")}
              </button>
              <button
                onClick={() => askRemove(row)}
                className={`h-8 shrink-0 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${
                  confirmId === row.id
                    ? "bg-[var(--danger)] text-white"
                    : "text-[var(--ink-faint)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                }`}
              >
                {confirmId === row.id ? t("removeSure") : t("remove")}
              </button>
            </div>
            {thanksTo === profile.id && (
              <div className="mt-2.5 flex gap-2">
                <input
                  value={thanksText}
                  onChange={(e) => setThanksText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendThanks(profile.id); }}
                  maxLength={280}
                  autoFocus
                  placeholder={u("gPlaceholder")}
                  aria-label={u("gPlaceholder")}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button onClick={() => sendThanks(profile.id)} disabled={thanksBusy || !thanksText.trim()} className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-50">{u("gSend")}</button>
              </div>
            )}
            </div>
          ))}
        </div>
      </FriendsSection>

      <GroupLabel>{t("gTogether")}</GroupLabel>
      <BuddyHabits userId={userId} lang={lang} friends={friendOpts} />
      <Challenges userId={userId} lang={lang} friends={friendOpts} myName={me?.display_name || "—"} />
      <SharedMemories userId={userId} lang={lang} friends={friendOpts} />

      <GroupLabel>{t("gCare")}</GroupLabel>
      <SosPanel userId={userId} lang={lang} />
      <FriendsAnswers userId={userId} lang={lang} />
      <GratitudeFeed userId={userId} lang={lang} refreshKey={feedKey} />

      {viewId && (
        <ProfilePage
          viewerId={userId}
          profileId={viewId}
          lang={lang}
          onClose={() => setViewId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
