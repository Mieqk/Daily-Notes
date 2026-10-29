import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../i18n";
import { sendPushEvent } from "../lib/push";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import ProfilePage from "./ProfilePage";
import FriendsAnswers from "./FriendsAnswers";
import GratitudeFeed from "./GratitudeFeed";
import SosPanel from "./SosPanel";
import SharedMemories from "./SharedMemories";
import SharedEntries from "./SharedEntries";
import BuddyHabits from "./BuddyHabits";
import Challenges from "./Challenges";
import FriendsSection, { EmptyState } from "./FriendsSection";
import { makeUI } from "../ui-strings";
import { makeChat } from "../chat-strings";
import { makePresence } from "../presence-strings";
import { localeOf } from "../i18n";
import PresenceDot from "./PresenceDot";
import { PRESENCE_COLOR, PRESENCE_MODES, cachePresenceMode, PRESENCE_MODE_EVENT, type PresenceMode, type PresenceState } from "../lib/presence";
import FriendChat from "./FriendChat";
import PairView from "./PairView";
import { useStored } from "../store";
import type { SleepData } from "../store";
import { HeartIcon, SunIcon, UsersIcon } from "../icons";

type Sub = "friends" | "together" | "care";
const SUBS: { id: Sub; icon: (p: { className?: string }) => ReactNode; label: "gConnect" | "gTogether" | "gCare" }[] = [
  { id: "friends", icon: UsersIcon, label: "gConnect" },
  { id: "together", icon: HeartIcon, label: "gTogether" },
  { id: "care", icon: SunIcon, label: "gCare" },
];
import FriendNoteEditor from "./FriendNoteEditor";
import type { FriendNote } from "./FriendNoteEditor";
import { makeFriendNotes } from "../friend-notes-strings";

interface FriendsViewProps {
  userId: string;
  sleep: Record<string, SleepData>;
  lang: Lang;
  streak: number;
  notesCount: number;
  moodEmoji: string[];
  /** непрочитанные сообщения по id друга */
  chatUnread?: Record<string, number>;
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
  presence_mode?: PresenceMode | null;
  presence_state?: PresenceState | null;
  last_seen_at?: string | null;
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
  be: {
    myCode: "Мой код сябра", copy: "Капіраваць", copied: "Скапіравана!",
    addFriend: "Дадаць сябра", codePh: "Код сябра (6 сімвалаў)", find: "Знайсці",
    sendReq: "Адправіць запыт", reqSent: "Запыт адпраўлены",
    incoming: "Уваходныя запыты", accept: "Прыняць", decline: "Адхіліць",
    friends: "Мае сябры", noFriends: "Пакуль няма сяброў — адпраўце свой код блізкім",
    noReqs: "Няма ўваходных запытаў", notFound: "Не знойдзена. Праверце код",
    selfErr: "Нельга дадаць самога сябе", already: "Вы ўжо сябры або запыт адпраўлены",
    remove: "Выдаліць", removeSure: "Дакладна выдаліць?",
    addHint: "Увядзіце код сябра або падзяліцеся сваім", gConnect: "Сябры", gTogether: "Разам", gCare: "Клопат і падтрымка",
  },
  uk: {
    myCode: "Мій код друга", copy: "Копіювати", copied: "Скопійовано!",
    addFriend: "Додати друга", codePh: "Код друга (6 символів)", find: "Знайти",
    sendReq: "Надіслати запит", reqSent: "Запит надіслано",
    incoming: "Вхідні запити", accept: "Прийняти", decline: "Відхилити",
    friends: "Мої друзі", noFriends: "Поки немає друзів — надішліть свій код близьким",
    noReqs: "Немає вхідних запитів", notFound: "Не знайдено. Перевірте код",
    selfErr: "Не можна додати самого себе", already: "Ви вже друзі або запит надіслано",
    remove: "Видалити", removeSure: "Точно видалити?",
    addHint: "Введіть код друга або поділіться своїм", gConnect: "Друзі", gTogether: "Разом", gCare: "Турбота і підтримка",
  },
  de: {
    myCode: "Mein Freundescode", copy: "Kopieren", copied: "Kopiert!",
    addFriend: "Freund hinzufügen", codePh: "Freundescode (6 Zeichen)", find: "Suchen",
    sendReq: "Anfrage senden", reqSent: "Anfrage gesendet",
    incoming: "Eingehende Anfragen", accept: "Annehmen", decline: "Ablehnen",
    friends: "Meine Freunde", noFriends: "Noch keine Freunde — teile deinen Code mit deinen Liebsten",
    noReqs: "Keine eingehenden Anfragen", notFound: "Nicht gefunden. Prüfe den Code",
    selfErr: "Du kannst dich nicht selbst hinzufügen", already: "Ihr seid schon befreundet oder die Anfrage wurde gesendet",
    remove: "Entfernen", removeSure: "Wirklich entfernen?",
    addHint: "Gib den Code eines Freundes ein oder teile deinen", gConnect: "Freunde", gTogether: "Gemeinsam", gCare: "Fürsorge & Unterstützung",
  },
  fr: {
    myCode: "Mon code ami", copy: "Copier", copied: "Copié !",
    addFriend: "Ajouter un ami", codePh: "Code ami (6 caractères)", find: "Chercher",
    sendReq: "Envoyer la demande", reqSent: "Demande envoyée",
    incoming: "Demandes reçues", accept: "Accepter", decline: "Refuser",
    friends: "Mes amis", noFriends: "Pas encore d'amis — partagez votre code avec vos proches",
    noReqs: "Aucune demande reçue", notFound: "Introuvable. Vérifiez le code",
    selfErr: "Vous ne pouvez pas vous ajouter vous-même", already: "Vous êtes déjà amis ou la demande est envoyée",
    remove: "Supprimer", removeSure: "Vraiment supprimer ?",
    addHint: "Saisissez le code d'un ami ou partagez le vôtre", gConnect: "Amis", gTogether: "Ensemble", gCare: "Soin et soutien",
  },
  es: {
    myCode: "Mi código de amigo", copy: "Copiar", copied: "¡Copiado!",
    addFriend: "Añadir amigo", codePh: "Código de amigo (6 caracteres)", find: "Buscar",
    sendReq: "Enviar solicitud", reqSent: "Solicitud enviada",
    incoming: "Solicitudes recibidas", accept: "Aceptar", decline: "Rechazar",
    friends: "Mis amigos", noFriends: "Aún no tienes amigos — comparte tu código con tus seres queridos",
    noReqs: "No hay solicitudes recibidas", notFound: "No encontrado. Revisa el código",
    selfErr: "No puedes añadirte a ti mismo", already: "Ya sois amigos o la solicitud está enviada",
    remove: "Eliminar", removeSure: "¿Eliminar de verdad?",
    addHint: "Introduce el código de un amigo o comparte el tuyo", gConnect: "Amigos", gTogether: "Juntos", gCare: "Cuidado y apoyo",
  },
};

function genCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function FriendsView({ userId, lang, sleep, moodEmoji, chatUnread = {} }: FriendsViewProps) {
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
  const [savedSub, setSub] = useStored<Sub>("dn.friendsTab", "friends");
  const sub: Sub = SUBS.some((x) => x.id === savedSub) ? savedSub : "friends";
  const u = makeUI(lang);
  const chat = makeChat(lang);
  const pr = makePresence(lang);
  const fn = makeFriendNotes(lang);
  const [modeBusy, setModeBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, FriendNote>>({});
  const [noteOpen, setNoteOpen] = useState<string | null>(null);

  /** Свой ник из заметок (виден только мне) или имя из профиля. */
  const nameOf = (p: Profile) => notes[p.id]?.nickname || p.display_name || p.friend_code || "—";

  const setMode = async (mode: PresenceMode) => {
    if (modeBusy || me?.presence_mode === mode) return;
    setModeBusy(true);
    const { error } = await supabase!.from("profiles").update({ presence_mode: mode }).eq("id", userId);
    setModeBusy(false);
    if (error) { setMsg({ kind: "err", text: pr("failed") }); return; }
    cachePresenceMode(mode);
    window.dispatchEvent(new Event(PRESENCE_MODE_EVENT));
    setMe((m) => (m ? { ...m, presence_mode: mode } : m));
  };

  const presenceText = (p: Profile): string | null => {
    if (!p.presence_state) return null;
    if (p.presence_state !== "offline") return p.presence_state === "online" ? pr("online") : p.presence_state === "away" ? pr("away") : pr("dnd");
    if (!p.last_seen_at) return pr("offline");
    const mins = Math.max(1, Math.round((Date.now() - new Date(p.last_seen_at).getTime()) / 60_000));
    const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: "auto" });
    const t = mins < 60 ? rtf.format(-mins, "minute") : mins < 1440 ? rtf.format(-Math.round(mins / 60), "hour") : rtf.format(-Math.round(mins / 1440), "day");
    return pr("seen").replace("{t}", t);
  };
  const [chatWith, setChatWith] = useState<Profile | null>(null);
  const [thanksTo, setThanksTo] = useState<string | null>(null);
  const [thanksText, setThanksText] = useState("");
  const [thanksBusy, setThanksBusy] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const sendThanks = async (toId: string) => {
    const text = thanksText.trim();
    if (!text) return;
    setThanksBusy(true);
    const { data: row, error } = await supabase!.from("gratitude").insert({ from_user: userId, to_user: toId, text }).select("id").single();
    setThanksBusy(false);
    if (error) {
      // уникальный индекс: одна благодарность одному другу в сутки
      setMsg({ kind: "err", text: error.code === "23505" ? u("gAlready") : t("already") });
      return;
    }
    if (row?.id) sendPushEvent("gratitude", row.id);
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

    // таблицы может ещё не быть (миграция не применена): тогда просто без заметок
    const { data: noteRows } = await supabase!.from("friend_notes").select("friend_id,nickname,note").eq("owner_id", userId);
    const map: Record<string, FriendNote> = {};
    (noteRows ?? []).forEach((r: { friend_id: string; nickname: string; note: string }) => { map[r.friend_id] = { nickname: r.nickname, note: r.note }; });
    setNotes(map);

    setFriends(await withProfiles(accepted));
    setIncoming(await withProfiles(inc));
  };

  useEffect(() => { load(); }, [userId]);

  // статус друзей в сети обновляется раз в минуту
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (document.hidden) return;
      const ids = friends.map((f) => f.profile.id);
      if (ids.length === 0) return;
      const fresh = await fetchProfiles<Profile>(ids);
      const byId = new Map(fresh.map((x) => [x.id, x]));
      setFriends((prev) => prev.map((f) => ({ ...f, profile: byId.get(f.profile.id) ?? f.profile })));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [friends]);

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

  const friendOpts = friends.map(({ profile }) => ({ id: profile.id, name: nameOf(profile) }));

  const person = (p: Profile) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="relative h-10 w-10 shrink-0">
        <span className="block h-full w-full overflow-hidden rounded-xl">{avaNode(p, "20px")}</span>
        <PresenceDot state={p.presence_state} label={presenceText(p) ?? undefined} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold">{nameOf(p)}</span>
        {notes[p.id]?.nickname && p.display_name && (
          <span className="block truncate text-[11.5px] text-[var(--ink-faint)]">{fn("realName").replace("{name}", p.display_name)}</span>
        )}
        {presenceText(p) && (
          <span className="block truncate text-[11.5px] font-medium" style={{ color: p.presence_state === "offline" ? "var(--ink-faint)" : PRESENCE_COLOR[p.presence_state!] }}>
            {presenceText(p)}
          </span>
        )}
        <span className="block truncate text-[11.5px] text-[var(--ink-faint)]">
          {p.status_emoji || p.status_text ? (
            <>{p.status_emoji} {p.status_text}</>
          ) : (
            p.bio || "\u00A0"
          )}
        </span>
        {notes[p.id]?.note && <span className="mt-0.5 block truncate text-[11.5px] italic text-[var(--ink-soft)]">🔒 {notes[p.id].note}</span>}
      </span>
    </span>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-[13px] font-semibold ${msg.kind === "ok" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
          {msg.text}
        </div>
      )}

      {/* разделы вкладки: как в «Хобби», одна плашка с переключателем */}
      <div className="sticky -top-6 z-30 mx-auto mb-4 w-full max-w-xl rounded-xl bg-[var(--bg)] sm:-top-8">
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" style={{ boxShadow: "var(--shadow-sm)" }}>
          {SUBS.map(({ id, icon: Icon, label }) => (
            <button key={id} role="tab" aria-label={t(label)} title={t(label)} aria-selected={sub === id} onClick={() => setSub(id)} className={`flex h-10 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold transition-all sm:text-[13px] ${sub === id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className={`truncate ${sub === id ? "" : "max-[419px]:hidden"}`}>{t(label)}</span>
            </button>
          ))}
        </div>
      </div>

      {sub === "friends" && <>

      {/* блоки раскладываются в две колонки, на телефоне в одну */}
      <div className="gap-4 lg:columns-2 [&>*]:break-inside-avoid">
      {/* ===== Мой статус в сети ===== */}
      <FriendsSection icon="🟢" title={pr("title")} hint={pr("hint")}>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={pr("title")}>
          {PRESENCE_MODES.map((m) => {
            const active = (me?.presence_mode ?? "auto") === m;
            const color = m === "auto" ? PRESENCE_COLOR.online : m === "away" ? PRESENCE_COLOR.away : m === "dnd" ? PRESENCE_COLOR.dnd : PRESENCE_COLOR.offline;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={active}
                disabled={modeBusy}
                className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-left text-[13px] font-semibold transition-all active:scale-95 ${active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}
              >
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="truncate">{pr(m)}</span>
              </button>
            );
          })}
        </div>
        {me?.presence_mode === "dnd" && <p className="mt-2.5 text-[12px] leading-snug text-[var(--ink-faint)]">{pr("dndNote")}</p>}
      </FriendsSection>

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
            className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 font-mono text-sm uppercase tracking-widest outline-none placeholder:font-sans placeholder:text-[13px] placeholder:normal-case placeholder:tracking-normal focus:border-[var(--accent)]"
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
            <button onClick={() => setViewId(profile.id)} className="block w-full min-w-0 text-left transition-opacity hover:opacity-80">
              {person(profile)}
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[var(--line)] pt-2">
              <button
                onClick={() => setChatWith(profile)}
                className="relative h-8 shrink-0 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] transition-colors hover:bg-[var(--accent-soft)]"
              >
                💬 {chat("open")}
                {(chatUnread[profile.id] ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                    {chatUnread[profile.id]}
                  </span>
                )}
              </button>
              <button
                onClick={() => setNoteOpen(noteOpen === profile.id ? null : profile.id)}
                aria-expanded={noteOpen === profile.id}
                className="h-8 shrink-0 rounded-lg px-2.5 text-[12px] font-semibold text-[var(--accent-deep)] transition-colors hover:bg-[var(--accent-soft)]"
              >
                ✏️ {fn("edit")}
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
                className={`ml-auto h-8 shrink-0 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${
                  confirmId === row.id
                    ? "bg-[var(--danger)] text-white"
                    : "text-[var(--ink-faint)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                }`}
              >
                {confirmId === row.id ? t("removeSure") : t("remove")}
              </button>
            </div>
            {noteOpen === profile.id && (
              <FriendNoteEditor
                userId={userId}
                friendId={profile.id}
                lang={lang}
                value={notes[profile.id] ?? { nickname: "", note: "" }}
                onSaved={(v) => setNotes((prev) => ({ ...prev, [profile.id]: v }))}
              />
            )}
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
      </div>

      </>}

      {sub === "together" && <>
      <PairView userId={userId} lang={lang} sleep={sleep} />
      <div className="gap-4 lg:columns-2 [&>*]:break-inside-avoid">
      <BuddyHabits userId={userId} lang={lang} friends={friendOpts} />
      <Challenges userId={userId} lang={lang} friends={friendOpts} myName={me?.display_name || "—"} />
      <SharedMemories userId={userId} lang={lang} friends={friendOpts} />
      <SharedEntries userId={userId} lang={lang} friends={friendOpts} moodEmoji={moodEmoji} />
      </div>
      </>}

      {sub === "care" && <>
      <div className="gap-4 lg:columns-2 [&>*]:break-inside-avoid">
      <SosPanel userId={userId} lang={lang} />
      <FriendsAnswers userId={userId} lang={lang} />
      <GratitudeFeed userId={userId} lang={lang} refreshKey={feedKey} />
      </div>
      </>}

      {chatWith && (
        <FriendChat
          userId={userId}
          lang={lang}
          friend={{ id: chatWith.id, name: nameOf(chatWith), avatar: chatWith.avatar, avatar_url: chatWith.avatar_url, presence: presenceText(chatWith), presenceState: chatWith.presence_state ?? null }}
          onClose={() => setChatWith(null)}
        />
      )}

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
