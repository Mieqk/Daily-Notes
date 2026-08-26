import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import ProfilePage from "./ProfilePage";

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
  bio: string | null;
  friend_code: string | null;
}

interface Req { id: string; profile: Profile; }

const L: Record<string, Record<string, string>> = {
  ru: {
    account: "Аккаунт", myProfile: "Мой профиль", toFriends: "Друзья и заявки",
    requests: "Заявки в друзья", noReqs: "Новых заявок нет", accept: "Принять",
    info: "Твоя сводка", streak: "серия", notes: "заметок", lock: "Заблокировать",
  },
  en: {
    account: "Account", myProfile: "My profile", toFriends: "Friends & requests",
    requests: "Friend requests", noReqs: "No new requests", accept: "Accept",
    info: "Your summary", streak: "streak", notes: "notes", lock: "Lock",
  },
};

export default function AccountMenu({ userId, lang, streak, notesCount, hasPin, onLock, onGoFriends }: AccountMenuProps) {
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];
  const [open, setOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);

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

  const accept = async (id: string) => {
    await supabase!.from("friendships").update({ status: "accepted" }).eq("id", id);
    load();
  };

  const ava = (p: Profile | null, sizeCls: string, emojiSize: string) =>
    p?.avatar_url ? (
      <img src={p.avatar_url} alt="" className={`${sizeCls} object-cover`} />
    ) : (
      <span className={`${sizeCls} grid place-items-center bg-[var(--accent-soft)]`} style={{ fontSize: emojiSize }}>
        {p?.avatar || "👤"}
      </span>
    );

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--panel)] transition-all active:scale-90"
        aria-label={t("account")}
      >
        {ava(me, "h-full w-full", "16px")}
        {reqs.length > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {reqs.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-pop fixed right-3 top-[70px] z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow)" }}>
            {/* Мини-профиль */}
            <button
              onClick={() => { setOpen(false); setPageOpen(true); }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--hover)]"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">{ava(me, "h-full w-full", "24px")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-bold">{me?.display_name || t("account")}</span>
                <span className="block truncate text-[11.5px] text-[var(--ink-faint)]">{me?.bio || `${t("account")} · ${me?.friend_code ?? "…"}`}</span>
              </span>
              <span className="text-[11px] font-semibold text-[var(--accent)]">→</span>
            </button>

            <div className="mt-2 flex flex-col gap-1.5">
              <button
                onClick={() => { setOpen(false); setPageOpen(true); }}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-[var(--accent)] text-[13px] font-semibold text-[var(--accent-ink)] active:scale-[0.98]"
              >
                👤 {t("myProfile")}
              </button>
              <button
                onClick={() => { onGoFriends(); setOpen(false); }}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink)]"
              >
                👥 {t("toFriends")}
              </button>
            </div>

            {/* Заявки */}
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">📬 {t("requests")}</div>
              {reqs.length === 0 && <p className="text-[12.5px] text-[var(--ink-faint)]">{t("noReqs")}</p>}
              <div className="flex flex-col gap-2">
                {reqs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg">{ava(r.profile, "h-full w-full", "14px")}</span>
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
        </>
      )}

      {pageOpen && (
        <ProfilePage
          viewerId={userId}
          profileId={userId}
          lang={lang}
          streak={streak}
          notesCount={notesCount}
          onClose={() => setPageOpen(false)}
        />
      )}
    </>
  );
}
