import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { prepareImage } from "../lib/images";
import { ArrowLeftIcon } from "../icons";

interface ProfilePageProps {
  viewerId: string;
  profileId: string;
  lang: Lang;
  streak?: number;
  notesCount?: number;
  onClose: () => void;
  onChanged?: () => void;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  friend_code: string | null;
  status_emoji: string | null;
  status_text: string | null;
}

const AVATARS = ["😎", "🌙", "🌸", "🐶", "", "🐼", "🐸", "⭐", "🎧", "", "🌊", "🍩"];
const BIO_MAX = 140;

const PRESETS: { e: string; k: string }[] = [
  { e: "🎮", k: "stGame" },
  { e: "💻", k: "stWork" },
  { e: "😴", k: "stSleep" },
  { e: "🎧", k: "stMusic" },
  { e: "✨", k: "stGood" },
  { e: "🏃", k: "stActive" },
];

const L: Record<string, Record<string, string>> = {
  ru: {
    myProfile: "Мой профиль", back: "Назад", loading: "Загрузка…",
    namePh: "Как тебя видят друзья", bioPh: "Пара слов о себе: чем живёшь, что любишь…",
    save: "Сохранить", cancel: "Отмена",
    bannerChange: "Сменить баннер", upload: "Загрузить фото", emojiPick: "Эмодзи",
    removeImg: "Убрать фото", uploading: "Загрузка…",
    imgErr: "Не удалось загрузить изображение", imgTooBig: "Файл слишком большой (до 8 МБ)",
    imgNotImage: "Это не изображение", saved: "Сохранено",
    code: "Мой код друга", copy: "Копировать", copied: "Скопировано!",
    info: "Сводка", streak: "серия", notes: "заметок",
    friendSince: "В друзьях с", remove: "Удалить из друзей", removeSure: "Точно удалить?",
    badgeEarly: "Первооткрыватель", badgeStreak: "Серия 3+", badgeWriter: "10+ записей", friendBadge: "Друг",
    statusTitle: "Статус", statusPh: "Свой статус…", statusClear: "Убрать",
    stGame: "Играю", stWork: "Работаю", stSleep: "Сплю", stMusic: "Слушаю музыку", stGood: "Хорошее настроение", stActive: "Активен",
  },
  en: {
    myProfile: "My profile", back: "Back", loading: "Loading…",
    namePh: "How friends see you", bioPh: "A few words about yourself…",
    save: "Save", cancel: "Cancel",
    bannerChange: "Change banner", upload: "Upload photo", emojiPick: "Emoji",
    removeImg: "Remove photo", uploading: "Uploading…",
    imgErr: "Failed to upload image", imgTooBig: "File is too big (max 8 MB)",
    imgNotImage: "Not an image", saved: "Saved",
    code: "My friend code", copy: "Copy", copied: "Copied!",
    info: "Summary", streak: "streak", notes: "notes",
    friendSince: "Friends since", remove: "Remove from friends", removeSure: "Really remove?",
    badgeEarly: "Early bird", badgeStreak: "3+ streak", badgeWriter: "10+ entries", friendBadge: "Friend",
    statusTitle: "Status", statusPh: "Custom status…", statusClear: "Clear",
    stGame: "Gaming", stWork: "Working", stSleep: "Sleeping", stMusic: "Listening to music", stGood: "Feeling great", stActive: "Active",
  },
};

export default function ProfilePage({ viewerId, profileId, lang, streak = 0, notesCount = 0, onClose, onChanged }: ProfilePageProps) {
  const isOwn = viewerId === profileId;
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];

  const [p, setP] = useState<Profile | null>(null);
  const [friendSince, setFriendSince] = useState<string | null>(null);
  const [busy, setBusy] = useState<"banner" | "avatar" | null>(null);
  const [avatarEdit, setAvatarEdit] = useState(false);
  const [bioEdit, setBioEdit] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const nameTimer = useRef<number>(0);
  const statusTimer = useRef<number>(0);
  const confirmTimer = useRef<number>(0);
  const bannerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 2600);
    return () => window.clearTimeout(id);
  }, [msg]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase!.from("profiles").select("*").eq("id", profileId).single();
      if (cancelled) return;
      setP(data as Profile | null);
      if (viewerId !== profileId) {
        const { data: f } = await supabase!
          .from("friendships")
          .select("*")
          .eq("status", "accepted")
          .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`);
        if (cancelled) return;
        const row = (f ?? []).find((r: any) => r.user_a === profileId || r.user_b === profileId);
        setFriendSince(row?.created_at ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [profileId, viewerId]);

  const saveProfile = async (patch: Partial<Profile>) => {
    const { data } = await supabase!.from("profiles").update(patch).eq("id", profileId).select().single();
    if (data) setP(data as Profile);
  };

  const uploadImage = async (file: File, kind: "banner" | "avatar") => {
    setBusy(kind);
    setMsg(null);
    try {
      const { blob, ext } = await prepareImage(file, kind);
      const bucket = kind === "banner" ? "banners" : "avatars";
      const path = `${profileId}/${kind}-${Date.now()}.${ext}`;
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
    if (!p?.friend_code) return;
    try {
      await navigator.clipboard.writeText(p.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const removeFriend = async () => {
    const { data } = await supabase!
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`);
    const row = (data ?? []).find((r: any) => r.user_a === profileId || r.user_b === profileId);
    if (row) await supabase!.from("friendships").delete().eq("id", row.id);
    onChanged?.();
    onClose();
  };

  const askRemove = () => {
    if (confirmRemove) { removeFriend(); return; }
    setConfirmRemove(true);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmRemove(false), 3000);
  };

  const avaNode = (pr: Profile | null, emojiSize: string) =>
    pr?.avatar_url ? (
      <img src={pr.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)]" style={{ fontSize: emojiSize }}>
        {pr?.avatar || "🙂"}
      </span>
    );

  const statusPill = (pr: Profile | null, big?: boolean) =>
    pr?.status_emoji || pr?.status_text ? (
      <span className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent-deep)] ${big ? "px-3 py-1 text-[12.5px]" : "px-2 py-0.5 text-[10.5px]"}`}>
        {pr.status_emoji && <span className="shrink-0">{pr.status_emoji}</span>}
        {pr.status_text && <span className="truncate">{pr.status_text}</span>}
      </span>
    ) : null;

  const badges = isOwn
    ? [
        { icon: "🌱", label: t("badgeEarly"), on: true },
        { icon: "🔥", label: t("badgeStreak"), on: streak >= 3 },
        { icon: "✍️", label: t("badgeWriter"), on: notesCount >= 10 },
      ].filter((b) => b.on)
    : [{ icon: "🤝", label: t("friendBadge"), on: true }];

  const sinceLabel = friendSince
    ? new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric" }).format(new Date(friendSince))
    : null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[var(--bg)]">
      {/* Шапка */}
      <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all hover:text-[var(--ink)] active:scale-90"
            aria-label={t("back")}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <span className="truncate text-[15px] font-bold">{isOwn ? t("myProfile") : p?.display_name || p?.friend_code || "…"}</span>
        </div>
      </div>

      {!p ? (
        <div className="grid h-64 place-items-center text-sm text-[var(--ink-faint)]">{t("loading")}</div>
      ) : (
        <div className="mx-auto max-w-3xl px-4 pb-10">
          {/* Баннер */}
          <div className="relative mt-4 h-40 overflow-hidden rounded-2xl border border-[var(--line)] sm:h-48">
            {p.banner_url ? (
              <img src={p.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel-2) 55%, var(--accent-soft))" }} />
            )}
            {isOwn && (
              <button
                onClick={() => bannerInput.current?.click()}
                disabled={busy !== null}
                className="absolute right-3 top-3 flex h-8 items-center rounded-lg border border-[var(--line)] bg-[var(--panel)]/80 px-2.5 text-[11px] font-semibold backdrop-blur transition-all hover:bg-[var(--panel)] active:scale-95"
              >
                {busy === "banner" ? t("uploading") : t("bannerChange")}
              </button>
            )}
            {isOwn && <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={onPickImage("banner")} />}
          </div>

          {/* Аватар + имя + статус */}
          <div className="flex items-end gap-4 px-1">
            <div className="relative z-10 -mt-10 shrink-0">
              <button
                onClick={() => isOwn && setAvatarEdit((v) => !v)}
                className={`block h-24 w-24 overflow-hidden rounded-3xl border-4 border-[var(--bg)] transition-all ${isOwn ? "active:scale-95" : "cursor-default"}`}
                style={{ boxShadow: "var(--shadow-sm)" }}
                aria-label="avatar"
              >
                {avaNode(p, "44px")}
              </button>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              {isOwn ? (
                <input
                  value={p.display_name ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setP((m) => (m ? { ...m, display_name: v } : m));
                    window.clearTimeout(nameTimer.current);
                    nameTimer.current = window.setTimeout(() => saveProfile({ display_name: v }), 800);
                  }}
                  placeholder={t("namePh")}
                  maxLength={40}
                  className="block h-9 w-full min-w-0 rounded-lg bg-transparent px-1 text-[20px] font-bold text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:bg-[var(--hover)]"
                />
              ) : (
                <h1 className="truncate text-[20px] font-bold">{p.display_name || p.friend_code || "—"}</h1>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {statusPill(p)}
                {badges.map((b) => (
                  <span key={b.icon} title={b.label} className="flex items-center gap-1 rounded-full bg-[var(--hover)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--ink-soft)]">
                    <span>{b.icon}</span>{b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 px-1">
            {/* Редактор аватара (только свой) */}
            {isOwn && avatarEdit && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("emojiPick")}</div>
                <div className="grid grid-cols-6 gap-1">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => { saveProfile({ avatar: a, avatar_url: null }); setAvatarEdit(false); }}
                      className="grid h-9 w-9 place-items-center rounded-lg text-[19px] transition-all hover:bg-[var(--hover)] active:scale-90"
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => avatarInput.current?.click()}
                    disabled={busy !== null}
                    className="h-9 flex-1 rounded-lg bg-[var(--accent)] text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95"
                  >
                    {busy === "avatar" ? t("uploading") : t("upload")}
                  </button>
                  {p.avatar_url && (
                    <button
                      onClick={() => { saveProfile({ avatar_url: null }); setAvatarEdit(false); }}
                      className="h-9 rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]"
                    >
                      {t("removeImg")}
                    </button>
                  )}
                </div>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onPickImage("avatar")} />
              </div>
            )}

            {/* Статус (только свой) */}
            {isOwn && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">📡 {t("statusTitle")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((pr) => {
                    const active = p.status_emoji === pr.e && p.status_text === t(pr.k);
                    return (
                      <button
                        key={pr.k}
                        onClick={() => saveProfile({ status_emoji: pr.e, status_text: t(pr.k) })}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all active:scale-95 ${
                          active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--hover)] text-[var(--ink-soft)] hover:bg-[var(--accent-soft)]"
                        }`}
                      >
                        <span>{pr.e}</span>{t(pr.k)}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={p.status_text ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setP((m) => (m ? { ...m, status_text: v } : m));
                      window.clearTimeout(statusTimer.current);
                      statusTimer.current = window.setTimeout(() => saveProfile({ status_text: v.trim() || null }), 800);
                    }}
                    placeholder={t("statusPh")}
                    maxLength={40}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12.5px] outline-none focus:border-[var(--accent)]"
                  />
                  {(p.status_emoji || p.status_text) && (
                    <button
                      onClick={() => saveProfile({ status_emoji: null, status_text: null })}
                      className="h-9 shrink-0 rounded-lg border border-[var(--line)] px-3 text-[12px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]"
                    >
                      {t("statusClear")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Био */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
              {bioEdit && isOwn ? (
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
                  onClick={() => { if (isOwn) { setBioDraft(p.bio ?? ""); setBioEdit(true); } }}
                  className={`w-full text-left text-[13.5px] leading-relaxed text-[var(--ink-soft)] ${isOwn ? "-mx-2 -my-1 rounded-lg px-2 py-1 transition-colors hover:bg-[var(--hover)]" : "cursor-default"}`}
                >
                  {p.bio ? p.bio : isOwn ? <span className="text-[var(--ink-faint)]">+ {t("bioPh")}</span> : <span className="text-[var(--ink-faint)]">…</span>}
                </button>
              )}
            </div>

            {/* Инфо-карточка */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
              {isOwn ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
                    <span className="text-[11px] font-semibold text-[var(--ink-faint)]">{t("code")}</span>
                    <button onClick={copyCode} className="flex items-center gap-2 font-mono text-[15px] font-bold tracking-[0.2em] text-[var(--accent-deep)] active:scale-95">
                      {p.friend_code ?? "…"}
                      <span className="text-[11px] font-semibold tracking-normal">{copied ? t("copied") : t("copy")}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-5 text-[14px] font-semibold">
                    <span>🔥 {streak} {t("streak")}</span>
                    <span>📝 {notesCount} {t("notes")}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[var(--ink-soft)]">
                    🤝 {t("friendSince")} {sinceLabel ?? "…"}
                  </span>
                  <button
                    onClick={askRemove}
                    className={`h-9 shrink-0 rounded-lg px-3 text-[12px] font-semibold transition-colors ${
                      confirmRemove ? "bg-[var(--danger)] text-white" : "border border-[var(--line)] text-[var(--ink-faint)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    }`}
                  >
                    {confirmRemove ? t("removeSure") : t("remove")}
                  </button>
                </div>
              )}
            </div>

            {msg && (
              <div className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold ${msg.kind === "ok" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
