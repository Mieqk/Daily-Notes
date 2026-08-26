import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { prepareImage } from "../lib/images";

interface AccountMenuProps {
  userId: string;
  lang: Lang;
  streak: number;
  notesCount: number;
  hasPin: boolean;
  onLock: () => void;
  onGoFriends: () => void;
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

interface Req { id: string; profile: Profile; }

const AVATARS = ["😎", "🌙", "", "🐶", "🦊", "🐼", "", "⭐", "", "", "🌊", "🍩"];
const BIO_MAX = 140;

const L: Record<string, Record<string, string>> = {
  ru: {
    account: "Аккаунт", namePh: "Как тебя видят друзья",
    bioPh: "Пара слов о себе: чем живёшь, что любишь…",
    save: "Сохранить", cancel: "Отмена",
    bannerChange: "Сменить баннер", upload: "Загрузить фото", emojiPick: "Эмодзи",
    removeImg: "Убрать фото", uploading: "Загрузка…",
    imgErr: "Не удалось загрузить изображение", imgTooBig: "Файл слишком большой (до 8 МБ)",
    imgNotImage: "Это не изображение", saved: "Сохранено",
    code: "Мой код друга", copy: "Копировать", copied: "Скопировано!",
    toFriends: "Друзья и заявки", requests: "Заявки в друзья", noReqs: "Новых заявок нет",
    accept: "Принять", info: "Твоя сводка", streak: "серия", notes: "заметок", lock: "Заблокировать",
    badgeEarly: "Первооткрыватель", badgeStreak: "Серия 3+", badgeWriter: "10+ записей", badgeFriend: "Есть друзья",
  },
  en: {
    account: "Account", namePh: "How friends see you",
    bioPh: "A few words about yourself…",
    save: "Save", cancel: "Cancel",
    bannerChange: "Change banner", upload: "Upload photo", emojiPick: "Emoji",
    removeImg: "Remove photo", uploading: "Uploading…",
    imgErr: "Failed to upload image", imgTooBig: "File is too big (max 8 MB)",
    imgNotImage: "Not an image", saved: "Saved",
    code: "My friend code", copy: "Copy", copied: "Copied!",
    toFriends: "Friends & requests", requests: "Friend requests", noReqs: "No new requests",
    accept: "Accept", info: "Your summary", streak: "streak", notes: "notes", lock: "Lock",
    badgeEarly: "Early bird", badgeStreak: "3+ streak", badgeWriter: "10+ entries", badgeFriend: "Has friends",
  },
};

export default function AccountMenu({ userId, lang, streak, notesCount, hasPin, onLock, onGoFriends }: AccountMenuProps) {
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState<"banner" | "avatar" | null>(null);
  const [avatarEdit, setAvatarEdit] = useState(false);
  const [bioEdit, setBioEdit] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const nameTimer = useRef<number>(0);
  const bannerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 2600);
    return () => window.clearTimeout(id);
  }, [msg]);

  const load = async () => {
    const my = (await supabase!.from("profiles").select("*").eq("id", userId).single()).data as Profile | null;
    setMe(my);
    const { data } = await supabase!.from("friendships").select("*").eq("status", "pending").or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const rows = (data ?? []).filter((r: any) => r.sender !== userId);
    const out: Req[] = [];
    for (const row of rows) {
      const { data: p } = await supabase!.from("profiles").select("*").eq("id", row.sender).single();
      if (p) out.push({ id: row.id, profile: p as Profile });
    }
    setReqs(out);
  };

  useEffect(() => { load(); }, [userId]);
  useEffect(() => { if (open) load(); }, [open]);

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

  const accept = async (id: string) => {
    await supabase!.from("friendships").update({ status: "accepted" }).eq("id", id);
    load();
  };

  const avaNode = (p: Profile | null, emojiSize: string) =>
    p?.avatar_url ? (
      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)]" style={{ fontSize: emojiSize }}>
        {p?.avatar || "👤"}
      </span>
    );

  const badges = [
    { icon: "🌱", label: t("badgeEarly"), on: true },
    { icon: "🔥", label: t("badgeStreak"), on: streak >= 3 },
    { icon: "✍️", label: t("badgeWriter"), on: notesCount >= 10 },
    { icon: "🤝", label: t("badgeFriend"), on: reqs.length >= 0 && Boolean(me?.friend_code) && false },
  ].filter((b) => b.on);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--panel)] transition-all active:scale-90"
        aria-label={t("account")}
      >
        {avaNode(me, "16px")}
        {reqs.length > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {reqs.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-pop fixed right-3 top-[70px] z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-xl border border-[var(--line)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow)" }}>
            <div className="max-h-[calc(100vh-90px)] overflow-y-auto overscroll-contain">
              {/* Баннер */}
              <div className="relative h-24 overflow-hidden rounded-t-xl">
                {me?.banner_url ? (
                  <img src={me.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel-2) 55%, var(--accent-soft))" }} />
                )}
                <button
                  onClick={() => bannerInput.current?.click()}
                  disabled={busy !== null}
                  className="absolute right-2.5 top-2.5 flex h-7 items-center rounded-lg border border-[var(--line)] bg-[var(--panel)]/80 px-2 text-[10.5px] font-semibold backdrop-blur transition-all hover:bg-[var(--panel)] active:scale-95"
                >
                  {busy === "banner" ? t("uploading") : t("bannerChange")}
                </button>
                <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={onPickImage("banner")} />
              </div>

              <div className="p-4 pt-0">
                {/* Аватар + имя + бейджи */}
                <div className="flex items-end gap-3">
                  <div className="relative z-10 -mt-7 shrink-0">
                    <button
                      onClick={() => setAvatarEdit((v) => !v)}
                      className="block h-14 w-14 overflow-hidden rounded-2xl border-4 border-[var(--panel)] transition-all active:scale-95"
                      style={{ boxShadow: "var(--shadow-sm)" }}
                      aria-label="avatar"
                    >
                      {avaNode(me, "22px")}
                    </button>
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
                      className="block h-8 w-full min-w-0 rounded-lg bg-transparent px-1 text-[15px] font-bold text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:bg-[var(--hover)]"
                    />
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {badges.map((b) => (
                        <span key={b.icon} title={b.label} className="flex items-center gap-1 rounded-full bg-[var(--hover)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)]">
                          <span>{b.icon}</span>{b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Редактор аватара (встроенный — не обрезается) */}
                {avatarEdit && (
                  <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("emojiPick")}</div>
                    <div className="grid grid-cols-6 gap-1">
                      {AVATARS.map((a) => (
                        <button
                          key={a}
                          onClick={() => { saveProfile({ avatar: a, avatar_url: null }); setAvatarEdit(false); }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[17px] transition-all hover:bg-[var(--hover)] active:scale-90"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => avatarInput.current?.click()}
                        disabled={busy !== null}
                        className="h-9 flex-1 rounded-lg bg-[var(--accent)] text-[12px] font-semibold text-[var(--accent-ink)] active:scale-95"
                      >
                        {busy === "avatar" ? t("uploading") : t("upload")}
                      </button>
                      {me?.avatar_url && (
                        <button
                          onClick={() => { saveProfile({ avatar_url: null }); setAvatarEdit(false); }}
                          className="h-9 rounded-lg border border-[var(--line)] px-3 text-[12px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]"
                        >
                          {t("removeImg")}
                        </button>
                      )}
                    </div>
                    <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onPickImage("avatar")} />
                  </div>
                )}

                {/* Био */}
                <div className="mt-3">
                  {bioEdit ? (
                    <div>
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value.slice(0, BIO_MAX))}
                        placeholder={t("bioPh")}
                        rows={2}
                        autoFocus
                        className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[12.5px] outline-none focus:border-[var(--accent)]"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] tabular-nums text-[var(--ink-faint)]">{bioDraft.length}/{BIO_MAX}</span>
                        <span className="flex gap-1.5">
                          <button onClick={() => setBioEdit(false)} className="h-7 rounded-lg border border-[var(--line)] px-2.5 text-[11px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]">
                            {t("cancel")}
                          </button>
                          <button
                            onClick={() => { saveProfile({ bio: bioDraft.trim() || null }); setBioEdit(false); }}
                            className="h-7 rounded-lg bg-[var(--accent)] px-2.5 text-[11px] font-semibold text-[var(--accent-ink)] active:scale-95"
                          >
                            {t("save")}
                          </button>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setBioDraft(me?.bio ?? ""); setBioEdit(true); }}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]"
                    >
                      {me?.bio ? me.bio : <span className="text-[var(--ink-faint)]">+ {t("bioPh")}</span>}
                    </button>
                  )}
                </div>

                {/* Код друга */}
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2">
                  <span className="text-[10.5px] font-semibold text-[var(--ink-faint)]">{t("code")}</span>
                  <button onClick={copyCode} className="flex items-center gap-2 font-mono text-[14px] font-bold tracking-[0.18em] text-[var(--accent-deep)] active:scale-95">
                    {me?.friend_code ?? "…"}
                    <span className="text-[10.5px] font-semibold tracking-normal">{copied ? t("copied") : t("copy")}</span>
                  </button>
                </div>

                {msg && (
                  <div className={`mt-2 rounded-lg px-3 py-2 text-[12px] font-semibold ${msg.kind === "ok" ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
                    {msg.text}
                  </div>
                )}

                <button
                  onClick={() => { onGoFriends(); setOpen(false); }}
                  className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-[var(--accent)] text-[13px] font-semibold text-[var(--accent-ink)] active:scale-[0.98]"
                >
                  👥 {t("toFriends")}
                </button>

                {/* Заявки */}
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">📬 {t("requests")}</div>
                  {reqs.length === 0 && <p className="text-[12.5px] text-[var(--ink-faint)]">{t("noReqs")}</p>}
                  <div className="flex flex-col gap-2">
                    {reqs.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg">{avaNode(r.profile, "14px")}</span>
                          <span className="truncate text-[12.5px] font-semibold">{r.profile.display_name || r.profile.friend_code}</span>
                        </span>
                        <button onClick={() => accept(r.id)} className="h-8 shrink-0 rounded-lg bg-[var(--accent)] px-3 text-[11.5px] font-semibold text-[var(--accent-ink)] active:scale-95">
                          {t("accept")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Сводка */}
                <div className="mt-4 rounded-lg bg-[var(--hover)] px-3 py-2.5">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">📊 {t("info")}</div>
                  <div className="flex items-center gap-4 text-[13px] font-semibold">
                    <span>🔥 {streak} {t("streak")}</span>
                    <span>📝 {notesCount} {t("notes")}</span>
                  </div>
                </div>

                {hasPin && (
                  <button
                    onClick={() => { onLock(); setOpen(false); }}
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-[var(--line)] text-[12.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                  >
                    🔒 {t("lock")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
