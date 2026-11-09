import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { prepareWallImage } from "../lib/images";
import { Cover, TrackPlayer } from "./MusicParts";
import { safeCoverUrl } from "../lib/trackSearch";
import { makePlaylist } from "../music-playlist-strings";

interface Props {
  viewerId: string;
  profileId: string;
  lang: Lang;
}

interface Post {
  id: string;
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
const CAPTION_MAX = 300;
const POSTS_MAX = 50;
const URL_TTL = 3600;

const L: Record<string, Record<string, string>> = {
  ru: {
    title: "Стенка", add: "Добавить мем", capPh: "Подпись (необязательно)", post: "Опубликовать", cancel: "Отмена",
    posting: "Публикуем…", empty: "Пока пусто. Добавьте первый мем!", emptyOther: "Здесь пока ничего нет",
    del: "Удалить", delSure: "Точно удалить?", err: "Не получилось. Попробуйте ещё раз",
    tooBig: "Файл слишком большой (до 8 МБ)", animBig: "Анимация слишком тяжёлая (до 6 МБ)", notImage: "Это не изображение",
    note: "Стенку видят ваши друзья.", full: "На стенке уже 50 постов, удалите старые",
  },
  en: {
    title: "Wall", add: "Add a meme", capPh: "Caption (optional)", post: "Post", cancel: "Cancel",
    posting: "Posting…", empty: "Nothing here yet. Add your first meme!", emptyOther: "Nothing here yet",
    del: "Delete", delSure: "Really delete?", err: "Something went wrong. Please try again",
    tooBig: "File is too big (max 8 MB)", animBig: "Animation is too big (max 6 MB)", notImage: "Not an image",
    note: "Your friends can see your wall.", full: "The wall already has 50 posts, delete some old ones",
  },
  be: {
    title: "Сцяна", add: "Дадаць мем", capPh: "Подпіс (неабавязкова)", post: "Апублікаваць", cancel: "Адмена",
    posting: "Публікуем…", empty: "Пакуль пуста. Дадайце першы мем!", emptyOther: "Тут пакуль нічога няма",
    del: "Выдаліць", delSure: "Дакладна выдаліць?", err: "Не атрымалася. Паспрабуйце яшчэ раз",
    tooBig: "Файл занадта вялікі (да 8 МБ)", animBig: "Анімацыя занадта цяжкая (да 6 МБ)", notImage: "Гэта не відарыс",
    note: "Сцяну бачаць вашы сябры.", full: "На сцяне ўжо 50 пастоў, выдаліце старыя",
  },
  uk: {
    title: "Стіна", add: "Додати мем", capPh: "Підпис (необов'язково)", post: "Опублікувати", cancel: "Скасувати",
    posting: "Публікуємо…", empty: "Поки порожньо. Додайте перший мем!", emptyOther: "Тут поки нічого немає",
    del: "Видалити", delSure: "Точно видалити?", err: "Не вдалося. Спробуйте ще раз",
    tooBig: "Файл завеликий (до 8 МБ)", animBig: "Анімація занадто важка (до 6 МБ)", notImage: "Це не зображення",
    note: "Стіну бачать ваші друзі.", full: "На стіні вже 50 постів, видаліть старі",
  },
  de: {
    title: "Pinnwand", add: "Meme hinzufügen", capPh: "Beschriftung (optional)", post: "Posten", cancel: "Abbrechen",
    posting: "Wird gepostet…", empty: "Noch leer. Füge dein erstes Meme hinzu!", emptyOther: "Hier ist noch nichts",
    del: "Löschen", delSure: "Wirklich löschen?", err: "Das hat nicht geklappt. Bitte erneut versuchen",
    tooBig: "Datei ist zu groß (max. 8 MB)", animBig: "Animation ist zu groß (max. 6 MB)", notImage: "Das ist kein Bild",
    note: "Deine Pinnwand sehen deine Freunde.", full: "Die Pinnwand hat schon 50 Beiträge, lösche alte",
  },
  fr: {
    title: "Mur", add: "Ajouter un mème", capPh: "Légende (facultatif)", post: "Publier", cancel: "Annuler",
    posting: "Publication…", empty: "Rien pour l'instant. Ajoutez votre premier mème !", emptyOther: "Rien ici pour l'instant",
    del: "Supprimer", delSure: "Vraiment supprimer ?", err: "Échec. Réessayez",
    tooBig: "Fichier trop volumineux (8 Mo max.)", animBig: "Animation trop lourde (6 Mo max.)", notImage: "Ce n'est pas une image",
    note: "Vos amis peuvent voir votre mur.", full: "Le mur compte déjà 50 publications, supprimez les anciennes",
  },
  es: {
    title: "Muro", add: "Añadir un meme", capPh: "Pie de foto (opcional)", post: "Publicar", cancel: "Cancelar",
    posting: "Publicando…", empty: "Aún no hay nada. ¡Añade tu primer meme!", emptyOther: "Aún no hay nada aquí",
    del: "Eliminar", delSure: "¿Eliminar de verdad?", err: "No se pudo. Inténtalo de nuevo",
    tooBig: "El archivo es demasiado grande (máx. 8 MB)", animBig: "La animación es demasiado pesada (máx. 6 MB)", notImage: "No es una imagen",
    note: "Tus amigos pueden ver tu muro.", full: "El muro ya tiene 50 publicaciones, elimina algunas",
  },
};

export default function ProfileWall({ viewerId, profileId, lang }: Props) {
  const isOwn = viewerId === profileId;
  const t = (k: string) => (L[lang] ?? L.en)[k] ?? L.en[k];

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number>(0);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const q = (cols: string) => supabase!.from("wall_posts").select(cols).eq("user_id", profileId).order("created_at", { ascending: false }).limit(POSTS_MAX);
    // колонки обложки появились позже: если миграция ещё не выполнена, читаем без них
    const full = await q("id, caption, media_path, track_title, track_artist, track_url, track_cover, track_preview, created_at");
    const data = full.error ? (await q("id, caption, media_path, track_title, track_artist, track_url, created_at")).data : full.data;
    const list = (data ?? []) as unknown as Post[];
    setPosts(list);
    const paths = list.map((p) => p.media_path).filter((x): x is string => !!x);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
      const map: Record<string, string> = {};
      for (const r of signed ?? []) if (r.path && r.signedUrl) map[r.path] = r.signedUrl;
      setUrls(map);
    }
  }, [profileId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 3000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) {
      if (!f.type.startsWith("image/")) { setMsg(t("notImage")); return; }
      setFile(f);
    }
  };

  const reset = () => { setFile(null); setCaption(""); };

  const publish = async () => {
    if (!file || !supabase || busy) return;
    if ((posts?.length ?? 0) >= POSTS_MAX) { setMsg(t("full")); return; }
    setBusy(true);
    setMsg(null);
    let path = "";
    try {
      const { blob, ext } = await prepareWallImage(file);
      path = `${viewerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
      if (up.error) throw new Error("err");
      const { error } = await supabase.from("wall_posts").insert({ user_id: viewerId, media_path: path, caption: caption.trim() || null });
      if (error) {
        void supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {});
        throw new Error("err");
      }
      reset();
      await load();
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setMsg(m === "too-big" ? t("tooBig") : m === "anim-too-big" ? t("animBig") : m === "not-image" ? t("notImage") : t("err"));
    }
    setBusy(false);
  };

  const remove = async (post: Post) => {
    if (confirmId !== post.id) {
      setConfirmId(post.id);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    setConfirmId(null);
    if (!supabase) return;
    const { error } = await supabase.from("wall_posts").delete().eq("id", post.id);
    if (error) { setMsg(t("err")); return; }
    if (post.media_path) void supabase.storage.from(BUCKET).remove([post.media_path]).then(() => {}, () => {});
    setPosts((l) => (l ?? []).filter((p) => p.id !== post.id));
  };

  const fmt = (iso: string) => new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{t("title")}</div>
        {isOwn && !file && (
          <button
            onClick={() => input.current?.click()}
            className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95"
          >
            + {t("add")}
          </button>
        )}
        {isOwn && <input ref={input} type="file" accept="image/*" className="hidden" onChange={onPick} />}
      </div>

      {isOwn && file && preview && (
        <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <img src={preview} alt="" className="mx-auto max-h-72 w-auto max-w-full rounded-lg object-contain" />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
            placeholder={t("capPh")}
            rows={2}
            className="mt-3 w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] tabular-nums text-[var(--ink-faint)]">{caption.length}/{CAPTION_MAX}</span>
            <span className="flex gap-1.5">
              <button onClick={reset} disabled={busy} className="h-9 rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]">
                {t("cancel")}
              </button>
              <button onClick={publish} disabled={busy} className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">
                {busy ? t("posting") : t("post")}
              </button>
            </span>
          </div>
        </div>
      )}

      {msg && <div className="mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12.5px] font-semibold text-[var(--danger)]">{msg}</div>}

      {posts === null ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">…</div>
      ) : posts.length === 0 ? (
        <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">{isOwn ? t("empty") : t("emptyOther")}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <figure key={p.id} className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel-2)]">
              {p.track_title ? (
                <div className="p-3" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel-2) 85%)" }}>
                  <div className="flex items-center gap-3">
                    <Cover src={safeCoverUrl(p.track_cover)} size={72} className="shadow-md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">♪ {makePlaylist(lang)("wallTrack")}</div>
                      <div className="truncate text-[15px] font-bold">{p.track_title}</div>
                      {p.track_artist && <div className="truncate text-[13px] text-[var(--ink-soft)]">{p.track_artist}</div>}
                    </div>
                  </div>
                  {(p.track_url || p.track_preview) && <div className="mt-3"><TrackPlayer url={p.track_url ?? null} preview={p.track_preview} lang={lang} /></div>}
                </div>
              ) : p.media_path && urls[p.media_path] ? (
                <img src={urls[p.media_path!]} alt={p.caption ?? ""} loading="lazy" className="max-h-[480px] w-full object-contain" />
              ) : (
                <div className="h-40 animate-pulse bg-[var(--hover)]" />
              )}
              <figcaption className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  {p.caption && <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{p.caption}</p>}
                  <span className="text-[11px] text-[var(--ink-faint)]">{fmt(p.created_at)}</span>
                </div>
                {isOwn && (
                  <button
                    onClick={() => remove(p)}
                    className={`h-9 shrink-0 rounded-lg px-3 text-[12px] font-semibold transition-colors ${
                      confirmId === p.id ? "bg-[var(--danger)] text-white" : "border border-[var(--line)] text-[var(--ink-faint)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    }`}
                  >
                    {confirmId === p.id ? t("delSure") : t("del")}
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {isOwn && <p className="mt-3 text-[11.5px] text-[var(--ink-faint)]">{t("note")}</p>}
    </div>
  );
}
