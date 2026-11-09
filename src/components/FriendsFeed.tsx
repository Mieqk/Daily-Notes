import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { Cover, TrackPlayer } from "./MusicParts";
import { safeCoverUrl } from "../lib/trackSearch";
import { makePlaylist } from "../music-playlist-strings";

export interface FeedFriend { id: string; name: string; avatar: string | null; avatarUrl: string | null }

interface Props {
  userId: string;
  lang: Lang;
  friends: FeedFriend[];
  onOpenProfile: (id: string) => void;
}

interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  media_path: string | null;
  track_title?: string | null;
  track_artist?: string | null;
  track_url?: string | null;
  track_cover?: string | null;
  track_preview?: string | null;
  created_at: string;
}

const BUCKET = "wall-media";
const PAGE = 20;
const URL_TTL = 3600;

const L: Record<string, Record<string, string>> = {
  ru: { title: "Лента", hint: "Что выложили друзья на своих стенках", empty: "Пока тут тихо. Когда друзья выложат что-нибудь на стенку, это появится здесь.", more: "Показать ещё", loading: "Загрузка…", close: "Закрыть", err: "Не удалось загрузить ленту", retry: "Повторить" },
  en: { title: "Feed", hint: "What your friends posted on their walls", empty: "Quiet for now. When friends post something on their walls, it will show up here.", more: "Show more", loading: "Loading…", close: "Close", err: "Couldn't load the feed", retry: "Retry" },
  be: { title: "Стужка", hint: "Што выклалі сябры на сваіх сценах", empty: "Пакуль ціха. Калі сябры выкладуць штосьці на сцяну, гэта з'явіцца тут.", more: "Паказаць яшчэ", loading: "Загрузка…", close: "Закрыць", err: "Не атрымалася загрузіць стужку", retry: "Паўтарыць" },
  uk: { title: "Стрічка", hint: "Що виклали друзі на своїх стінах", empty: "Поки тихо. Коли друзі викладуть щось на стіну, це з'явиться тут.", more: "Показати ще", loading: "Завантаження…", close: "Закрити", err: "Не вдалося завантажити стрічку", retry: "Повторити" },
  de: { title: "Feed", hint: "Was deine Freunde auf ihren Pinnwänden gepostet haben", empty: "Gerade ist es ruhig. Wenn Freunde etwas auf ihre Pinnwand posten, erscheint es hier.", more: "Mehr anzeigen", loading: "Wird geladen…", close: "Schließen", err: "Feed konnte nicht geladen werden", retry: "Erneut versuchen" },
  fr: { title: "Fil", hint: "Ce que vos amis ont publié sur leur mur", empty: "Calme pour l'instant. Quand vos amis publieront sur leur mur, cela apparaîtra ici.", more: "Afficher plus", loading: "Chargement…", close: "Fermer", err: "Impossible de charger le fil", retry: "Réessayer" },
  es: { title: "Feed", hint: "Lo que tus amigos publicaron en su muro", empty: "Todo tranquilo por ahora. Cuando tus amigos publiquen en su muro, aparecerá aquí.", more: "Mostrar más", loading: "Cargando…", close: "Cerrar", err: "No se pudo cargar el feed", retry: "Reintentar" },
};

/** Лента: свежие посты со стенок друзей в одном месте. Права на чтение задаёт сама база (RLS wall_posts). */
export default function FriendsFeed({ userId, lang, friends, onOpenProfile }: Props) {
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Post | null>(null);

  const people = new Map(friends.map((f) => [f.id, f]));

  const fetchPage = useCallback(async (from: number): Promise<Post[] | null> => {
    if (!supabase) return null;
    const q = (cols: string) =>
      supabase!.from("wall_posts").select(cols).neq("user_id", userId).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    // колонки обложки появились позже: если миграция ещё не выполнена, читаем без них
    const full = await q("id, user_id, caption, media_path, track_title, track_artist, track_url, track_cover, track_preview, created_at");
    const res = full.error ? await q("id, user_id, caption, media_path, track_title, track_artist, track_url, created_at") : full;
    if (res.error) return null;
    const list = (res.data ?? []) as unknown as Post[];
    const paths = list.map((p) => p.media_path).filter((x): x is string => !!x);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
      const map: Record<string, string> = {};
      for (const r of signed ?? []) if (r.path && r.signedUrl) map[r.path] = r.signedUrl;
      setUrls((u) => ({ ...u, ...map }));
    }
    setMore(list.length === PAGE);
    return list;
  }, [userId]);

  const loadFirst = useCallback(async () => {
    setFailed(false);
    const list = await fetchPage(0);
    if (list === null) { setFailed(true); setPosts([]); return; }
    setPosts(list);
  }, [fetchPage]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  const loadMore = async () => {
    if (busy || !posts) return;
    setBusy(true);
    const list = await fetchPage(posts.length);
    if (list) setPosts((p) => [...(p ?? []), ...list.filter((x) => !(p ?? []).some((y) => y.id === x.id))]);
    setBusy(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const ava = (f?: FeedFriend) =>
    f?.avatarUrl ? <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" /> : (
      <span className="grid h-full w-full place-items-center bg-[var(--accent-soft)] text-[18px]">{f?.avatar || "🙂"}</span>
    );

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 px-1">
        <h2 className="text-[20px] font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-0.5 text-[13px] text-[var(--ink-faint)]">{t("hint")}</p>
      </div>

      {posts === null ? (
        <div className="flex flex-col gap-4">
          {[220, 160].map((h, i) => <div key={i} className="animate-pulse rounded-2xl bg-[var(--hover)]" style={{ height: h }} />)}
        </div>
      ) : failed ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-8 text-center">
          <p className="text-[13.5px] text-[var(--ink-faint)]">{t("err")}</p>
          <button onClick={() => { setPosts(null); void loadFirst(); }} className="mt-3 h-9 rounded-full bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">{t("retry")}</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-2)] px-5 py-10 text-center text-[13.5px] leading-relaxed text-[var(--ink-faint)]">{t("empty")}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p, i) => {
            const f = people.get(p.user_id);
            return (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] [animation:rise_.35s_ease-out_both]"
                style={{ boxShadow: "var(--shadow-sm)", animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
                <button type="button" onClick={() => onOpenProfile(p.user_id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover)]">
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{ava(f)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold leading-tight">{f?.name || "—"}</span>
                    <span className="block text-[11.5px] text-[var(--ink-faint)]">{fmt(p.created_at)}</span>
                  </span>
                </button>

                {p.track_title ? (
                  <div className="px-4 pb-3" >
                    <div className="rounded-xl p-3" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel-2) 85%)" }}>
                      <div className="flex items-center gap-3">
                        <Cover src={safeCoverUrl(p.track_cover)} size={72} className="shadow-md" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">{makePlaylist(lang)("wallTrack")}</div>
                          <div className="truncate text-[15px] font-bold">{p.track_title}</div>
                          {p.track_artist && <div className="truncate text-[13px] text-[var(--ink-soft)]">{p.track_artist}</div>}
                        </div>
                      </div>
                      {(p.track_url || p.track_preview) && <div className="mt-3"><TrackPlayer url={p.track_url ?? null} preview={p.track_preview} lang={lang} title={p.track_title ?? ""} artist={p.track_artist ?? null} cover={safeCoverUrl(p.track_cover)} /></div>}
                    </div>
                  </div>
                ) : p.media_path && urls[p.media_path] ? (
                  <button type="button" onClick={() => setOpen(p)} className="block w-full bg-[var(--hover)]">
                    <img src={urls[p.media_path]} alt={p.caption ?? ""} loading="lazy" className="mx-auto block max-h-[520px] w-full object-contain" />
                  </button>
                ) : p.media_path ? (
                  <div className="h-48 animate-pulse bg-[var(--hover)]" />
                ) : null}

                {p.caption && <p className="whitespace-pre-wrap break-words px-4 pb-4 pt-3 text-[14px] leading-relaxed">{p.caption}</p>}
                {!p.caption && <div className="h-3" />}
              </article>
            );
          })}
          {more && (
            <button onClick={loadMore} disabled={busy} className="mx-auto h-10 rounded-full border border-[var(--line)] bg-[var(--panel)] px-6 text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] disabled:opacity-60">
              {busy ? t("loading") : t("more")}
            </button>
          )}
        </div>
      )}

      {open && open.media_path && createPortal(
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/85 p-4 backdrop-blur-sm [animation:fadein_.2s_ease-out]" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button onClick={() => setOpen(null)} aria-label={t("close")} className="absolute right-4 top-4 h-10 rounded-full bg-white/15 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/25">{t("close")}</button>
          {urls[open.media_path] && <img src={urls[open.media_path]} alt={open.caption ?? ""} className="max-h-[78vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />}
          {open.caption && <p className="max-w-md whitespace-pre-wrap break-words text-center text-[15px] font-semibold leading-snug text-white" onClick={(e) => e.stopPropagation()}>{open.caption}</p>}
        </div>,
        document.body,
      )}
    </div>
  );
}
