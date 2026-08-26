import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { prepareImage } from "../lib/images";

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
  banner_url: string | null;
  bio: string | null;
  friend_code: string | null;
}

interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  sender: string;
  status: string;
}

const AVATARS = ["😎", "🌙", "", "🐶", "🦊", "", "", "🍀", "⭐", "🎧", "🔥", ""];
const BIO_MAX = 140;

const L: Record<string, Record<string, string>> = {
  ru: {
    title: "Друзья", sub: "делись моментами с близкими",
    myProfile: "Мой профиль", namePh: "Как тебя видят друзья",
    myCode: "Мой код друга", copy: "Копировать", copied: "Скопировано!",
    addFriend: "Добавить друга", codePh: "Код друга (6 символов)", find: "Найти",
    sendReq: "Отправить запрос", reqSent: "Запрос отправлен",
    incoming: "Входящие запросы", accept: "Принять", decline: "Отклонить",
    friends: "Мои друзья", noFriends: "Пока нет друзей — отправь свой код близким",
    noReqs: "Нет входящих запросов", notFound: "Не найдено. Проверь код",
    selfErr: "Нельзя добавить самого себя", already: "Вы уже друзья или запрос отправлен",
    remove: "Удалить", cancel: "Отмена", save: "Сохранить",
    bioPh: "Пара слов о себе: чем живёшь, что любишь…",
    bannerChange: "Сменить баннер", upload: "Загрузить фото", emojiPick: "Эмодзи",
    removeImg: "Убрать фото", uploading: "Загрузка…",
    imgErr: "Не удалось загрузить изображение", imgTooBig: "Файл слишком большой (до 8 МБ)",
    imgNotImage: "Это не изображение", saved: "Сохранено",
    badgeEarly: "Первооткрыватель", badgeStreak: "Серия 3+", badgeWriter: "10+ записей", badgeFriend: "Есть друзья",
  },
  en: {
    title: "Friends", sub: "share moments with close ones",
    myProfile: "My profile", namePh: "How friends see you",
    myCode: "My friend code", copy: "Copy", copied: "Copied!",
    addFriend: "Add a friend", codePh: "Friend code (6 chars)", find: "Find",
    sendReq: "Send request", reqSent: "Request sent",
    incoming: "Incoming requests", accept: "Accept", decline: "Decline",
    friends: "My friends", noFriends: "No friends yet — share your code",
    noReqs: "No incoming requests", notFound: "Not found. Check the code",
    selfErr: "You cannot add yourself", already: "Already friends or request sent",
    remove: "Remove", cancel: "Cancel", save: "Save",
    bioPh: "A few words about yourself…",
    bannerChange: "Change banner", upload: "Upload photo", emojiPick: "Emoji",
    removeImg: "Remove photo", uploading: "Uploading…",
    imgErr: "Failed to upload image", imgTooBig: "File is too big (max 8 MB)",
    imgNotImage: "Not an image", saved: "Saved",
    badgeEarly: "Early bird", badgeStreak: "3+ streak", badgeWriter: "10+ entries", badgeFriend: "Has friends",
  },
};

function genCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function FriendsView({ userId, lang, streak, notesCount }: FriendsViewProps) {
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];
  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)]";

  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<{ row: Friendship; profile: Profile }[]>([]);
  const [incoming, setIncoming] = useState<{ row: Friendship; profile: Profile }[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [found, setFound] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"banner" | "avatar" | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bioEdit, setBioEdit] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const nameTimer = useRef<number>(0);
  const bannerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  // сообщения гаснут сами
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

  const uploadImage = async (file: File, kind: "banner" | "avatar") => {
    setBusy(kind);
    setMsg(null);
    try {
      const { blob, ext } = await prepareImage(file, kind);
      const bucket = kind === "banner" ? "banners" : "avatars";
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase!.storage.from(bucket).upload(path, blob, { contentType: blob.type });
      if (error) throw new Error("imgErr");
      const url = supabase!.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      await saveProfile(kind === "banner" ? { banner_url: url } : { avatar_url: url });
      setMsg({ kind: "ok", text: t("saved") });
    } catch (err) {
      const m = err instanceof Error ? err.message : "imgErr";
      setMsg({ kind: "err", text: m === "too-big" ? t("imgTooBig") : m === "not-image" ? t("imgNotImage") : t("imgErr") });
    }
    setBusy(null);
  };

  const onPickImage = (kind: "banner" | "avatar") => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadImage(file, kind);
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

  const avaNode = (p: Profile | null, emojiSize: string) =>
    p?.avatar_url ? (
      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)]" style={{ fontSize: emojiSize }}>
        {p?.avatar || "🙂"}
      </span>
    );

  const badges = [
    { icon: "🌱", label: t("badgeEarly"), on: true },
    { icon: "🔥", label: t("badgeStreak"), on: streak >= 3 },
    { icon: "✍️", label: t("badgeWriter"), on: notesCount >= 10 },
    { icon: "🤝", label: t("badgeFriend"), on: friends.length >= 1 },
  ].filter((b) => b.on);

  const person = (p: Profile) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{avaNode(p, "20px")}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold">{p.display_name || p.friend_code || "—"}</span>
        {p.bio && <span className="block truncate text-[11.5px] text-[var(--ink-faint)]">{p.bio}</span>}
      </span>
    </span>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* ===== Мой профиль ===== */}
      <div className={`${card} mb-5 animate-rise overflow-hidden`} style={{ boxShadow: "var(--shadow-sm)" }}>
        {/* Баннер */}
        <div className="relative h-28 sm:h-32">
          {me?.banner_url ? (
            <img src={me.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel-2) 55%, var(--accent-soft))" }} />
          )}
          <button
            onClick={() => bannerInput.current?.click()}
            disabled={busy !== null}
            className="absolute right-3 top-3 flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)]/80 px-2.5 text-[11px] font-semibold backdrop-blur transition-all hover:bg-[var(--panel)] active:scale-95"
          >
            {busy === "banner" ? t("uploading") : t("bannerChange")}
          </button>
          <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={onPickImage("banner")} />
        </div>

        <div className="px-4 pb-4 sm:px-5">
          {/* Аватар + имя + бейджи */}
          <div className="flex items-end gap-3">
            <div className="relative z-10 -mt-8 shrink-0">
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className="block h-16 w-16 overflow-hidden rounded-2xl border-4 border-[var(--panel)] transition-all active:scale-95"
                style={{ boxShadow: "var(--shadow-sm)" }}
                aria-label="avatar"
              >
                {avaNode(me, "26px")}
              </button>
              {avatarOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAvatarOpen(false)} />
                  <div className="animate-pop absolute left-0 top-full z-40 mt-2 w-[240px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3" style={{ boxShadow: "var(--shadow)" }}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("emojiPick")}</div>
                    <div className="grid grid-cols-6 gap-1">
                      {AVATARS.map((a) => (
                        <button
                          key={a}
                          onClick={() => { saveProfile({ avatar: a, avatar_url: null }); setAvatarOpen(false); }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[17px] transition-all hover:bg-[var(--hover)] active:scale-90"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <button
                        onClick={() => avatarInput.current?.click()}
                        disabled={busy !== null}
                        className="h-9 rounded-lg bg-[var(--accent)] text-[12px] font-semibold text-[var(--accent-ink)] active:scale-95"
                      >
                        {busy === "avatar" ? t("uploading") : t("upload")}
                      </button>
                      {me?.avatar_url && (
                        <button
                          onClick={() => { saveProfile({ avatar_url: null }); setAvatarOpen(false); }}
                          className="h-9 rounded-lg border border-[var(--line)] text-[12px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]"
                        >
                          {t("removeImg")}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onPickImage("avatar")} />
            </div>

            <div className="min-w-0 flex-1 pb-0.5">
              <input
                value={me?.display_name ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setMe((m) => (m ? { ...m, display_name: v } : m));
                  window.clearTimeout(nameTimer.current);
                  nameTimer.current = window.setTimeout(() => saveProfile({ display_name: v }), 800);
                }}
                placeholder={t("namePh")}
                maxLength={40}
                className="block h-8 w-full min-w-0 rounded-lg bg-transparent px-1 text-[16px] font-bold text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:bg-[var(--hover)]"
              />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span key={b.icon} title={b.label} className="flex items-center gap-1 rounded-full bg-[var(--hover)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--ink-soft)]">
                    <span>{b.icon}</span>{b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Био */}
          <div className="mt-3">
            {bioEdit ? (
              <div>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value.slice(0, BIO_MAX))}
                  placeholder={t("bioPh")}
                  rows={3}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10.5px] tabular-nums text-[var(--ink-faint)]">{bioDraft.length}/{BIO_MAX}</span>
                  <span className="flex gap-1.5">
                    <button onClick={() => setBioEdit(false)} className="h-8 rounded-lg border border-[var(--line)] px-3 text-[11.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]">
                      {t("cancel")}
                    </button>
                    <button
                      onClick={() => { saveProfile({ bio: bioDraft.trim() || null }); setBioEdit(false); }}
                      className="h-8 rounded-lg bg-[var(--accent)] px-3 text-[11.5px] font-semibold text-[var(--accent-ink)] active:scale-95"
                    >
                      {t("save")}
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setBioDraft(me?.bio ?? ""); setBioEdit(true); }}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]"
              >
                {me?.bio ? me.bio : <span className="text-[var(--ink-faint)]">+ {t("bioPh")}</span>}
              </button>
            )}
          </div>

          {/* Код друга */}
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
            <span className="text-[11px] font-semibold text-[var(--ink-faint)]">{t("myCode")}</span>
            <button onClick={copyCode} className="flex items-center gap-2 font-mono text-[15px] font-bold tracking-[0.2em] text-[var(--accent-deep)] active:scale-95">
              {me?.friend_code ?? "…"}
              <span className="text-[11px] font-semibold tracking-normal">{copied ? t("copied") : t("copy")}</span>
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-[13px] font-semibold ${msg.kind === "ok" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
          {msg.text}
        </div>
      )}

      {/* ===== Добавить друга ===== */}
      <div className={`${card} mb-5 animate-rise p-4`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">➕ {t("addFriend")}</h3>
        <div className="flex gap-2">
          <input
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder={t("codePh")}
            className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-[var(--accent)]"
          />
          <button onClick={search} className="h-10 shrink-0 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] active:scale-95">
            {t("find")}
          </button>
        </div>
        {found && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
            {person(found)}
            <button onClick={() => sendRequest(found)} className="h-9 shrink-0 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">
              {t("sendReq")}
            </button>
          </div>
        )}
      </div>

      {/* ===== Входящие запросы ===== */}
      <div className={`${card} mb-5 animate-rise p-4`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">📬 {t("incoming")}</h3>
        {incoming.length === 0 && <p className="text-sm text-[var(--ink-faint)]">{t("noReqs")}</p>}
        <div className="flex flex-col gap-2">
          {incoming.map(({ row, profile }) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
              {person(profile)}
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
      </div>

      {/* ===== Мои друзья ===== */}
      <div className={`${card} animate-rise p-4`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">💚 {t("friends")}</h3>
        {friends.length === 0 && <p className="text-sm text-[var(--ink-faint)]">{t("noFriends")}</p>}
        <div className="flex flex-col gap-2">
          {friends.map(({ row, profile }) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
              {person(profile)}
              <button
                onClick={() => removeFriend(row)}
                className="h-8 shrink-0 rounded-lg px-2.5 text-[11.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
