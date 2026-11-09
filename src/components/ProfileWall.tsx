import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { prepareWallImage } from "../lib/images";
import { PlusIcon, TrashIcon, XIcon, ImageIcon } from "../icons";
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
    drop: "Перетащите картинку сюда или нажмите", close: "Закрыть",
    title: "Стенка", add: "Добавить мем", capPh: "Подпись (необязательно)", post: "Опубликовать", cancel: "Отмена",
    posting: "Публикуем…", empty: "Пока пусто. Добавьте первый мем!", emptyOther: "Здесь пока ничего нет",
    del: "Удалить", delSure: "Точно удалить?", err: "Не получилось. Попробуйте ещё раз",
    tooBig: "Файл слишком большой (до 8 МБ)", animBig: "Анимация слишком тяжёлая (до 6 МБ)", notImage: "Это не изображение",
    note: "Стенку видят ваши друзья.", full: "На стенке уже 50 постов, удалите старые",
  },
  en: {
    drop: "Drop a picture here or tap to choose", close: "Close",
    title: "Wall", add: "Add a meme", capPh: "Caption (optional)", post: "Post", cancel: "Cancel",
    posting: "Posting…", empty: "Nothing here yet. Add your first meme!", emptyOther: "Nothing here yet",
    del: "Delete", delSure: "Really delete?", err: "Something went wrong. Please try again",
    tooBig: "File is too big (max 8 MB)", animBig: "Animation is too big (max 6 MB)", notImage: "Not an image",
    note: "Your friends can see your wall.", full: "The wall already has 50 posts, delete some old ones",
  },
  be: {
    drop: "Перацягніце відарыс сюды або націсніце", close: "Закрыць",
    title: "Сцяна", add: "Дадаць мем", capPh: "Подпіс (неабавязкова)", post: "Апублікаваць", cancel: "Адмена",
    posting: "Публікуем…", empty: "Пакуль пуста. Дадайце першы мем!", emptyOther: "Тут пакуль нічога няма",
    del: "Выдаліць", delSure: "Дакладна выдаліць?", err: "Не атрымалася. Паспрабуйце яшчэ раз",
    tooBig: "Файл занадта вялікі (да 8 МБ)", animBig: "Анімацыя занадта цяжкая (да 6 МБ)", notImage: "Гэта не відарыс",
    note: "Сцяну бачаць вашы сябры.", full: "На сцяне ўжо 50 пастоў, выдаліце старыя",
  },
  uk: {
    drop: "Перетягніть зображення сюди або натисніть", close: "Закрити",
    title: "Стіна", add: "Додати мем", capPh: "Підпис (необов'язково)", post: "Опублікувати", cancel: "Скасувати",
    posting: "Публікуємо…", empty: "Поки порожньо. Додайте перший мем!", emptyOther: "Тут поки нічого немає",
    del: "Видалити", delSure: "Точно видалити?", err: "Не вдалося. Спробуйте ще раз",
    tooBig: "Файл завеликий (до 8 МБ)", animBig: "Анімація занадто важка (до 6 МБ)", notImage: "Це не зображення",
    note: "Стіну бачать ваші друзі.", full: "На стіні вже 50 постів, видаліть старі",
  },
  de: {
    drop: "Bild hierher ziehen oder antippen", close: "Schließen",
    title: "Pinnwand", add: "Meme hinzufügen", capPh: "Beschriftung (optional)", post: "Posten", cancel: "Abbrechen",
    posting: "Wird gepostet…", empty: "Noch leer. Füge dein erstes Meme hinzu!", emptyOther: "Hier ist noch nichts",
    del: "Löschen", delSure: "Wirklich löschen?", err: "Das hat nicht geklappt. Bitte erneut versuchen",
    tooBig: "Datei ist zu groß (max. 8 MB)", animBig: "Animation ist zu groß (max. 6 MB)", notImage: "Das ist kein Bild",
    note: "Deine Pinnwand sehen deine Freunde.", full: "Die Pinnwand hat schon 50 Beiträge, lösche alte",
  },
  fr: {
    drop: "Déposez une image ici ou touchez pour choisir", close: "Fermer",
    title: "Mur", add: "Ajouter un mème", capPh: "Légende (facultatif)", post: "Publier", cancel: "Annuler",
    posting: "Publication…", empty: "Rien pour l'instant. Ajoutez votre premier mème !", emptyOther: "Rien ici pour l'instant",
    del: "Supprimer", delSure: "Vraiment supprimer ?", err: "Échec. Réessayez",
    tooBig: "Fichier trop volumineux (8 Mo max.)", animBig: "Animation trop lourde (6 Mo max.)", notImage: "Ce n'est pas une image",
    note: "Vos amis peuvent voir votre mur.", full: "Le mur compte déjà 50 publications, supprimez les anciennes",
  },
  es: {
    drop: "Suelta una imagen aquí o toca para elegir", close: "Cerrar",
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
  const [open, setOpen] = useState<Post | null>(null);
  const [drag, setDrag] = useState(false);
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

  const take = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg(t("notImage")); return; }
    setFile(f);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    take(f);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  const tracks = (posts ?? []).filter((p) => p.track_title);
  const images = (posts ?? []).filter((p) => !p.track_title);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow-sm)" }}>
      {/* Шапка доски */}
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel) 70%)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[18px]" aria-hidden>🖼️</span>
          <span className="text-[15px] font-bold">{t("title")}</span>
          {posts && posts.length > 0 && (
            <span className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--accent-deep)]">{posts.length}</span>
          )}
        </div>
        {isOwn && !file && (
          <button
            onClick={() => input.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] pl-3 pr-4 text-[12.5px] font-semibold text-[var(--accent-ink)] transition-all hover:brightness-105 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />{t("add")}
          </button>
        )}
        {isOwn && <input ref={input} type="file" accept="image/*" className="hidden" onChange={onPick} />}
      </div>

      <div className="p-4">
        {isOwn && file && preview && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] [animation:pop_.25s_ease-out]">
            <div className="grid place-items-center bg-[var(--hover)] p-3">
              <img src={preview} alt="" className="max-h-72 w-auto max-w-full rounded-xl object-contain" style={{ boxShadow: "var(--shadow-sm)" }} />
            </div>
            <div className="p-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
                placeholder={t("capPh")}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] tabular-nums text-[var(--ink-faint)]">{caption.length}/{CAPTION_MAX}</span>
                <span className="flex gap-1.5">
                  <button onClick={reset} disabled={busy} className="h-9 rounded-full border border-[var(--line)] px-4 text-[12.5px] font-semibold text-[var(--ink-faint)] transition-colors hover:bg-[var(--hover)]">
                    {t("cancel")}
                  </button>
                  <button onClick={publish} disabled={busy} className="h-9 rounded-full bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95 disabled:opacity-60">
                    {busy ? t("posting") : t("post")}
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}

        {msg && <div className="mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12.5px] font-semibold text-[var(--danger)]">{msg}</div>}

        {posts === null ? (
          <div className="columns-2 gap-3">
            {[150, 110, 130, 170].map((h, i) => (
              <div key={i} className="mb-3 animate-pulse rounded-xl bg-[var(--hover)]" style={{ height: h }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <button
            type="button"
            disabled={!isOwn || !!file}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { if (isOwn) { e.preventDefault(); setDrag(true); } }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (isOwn) take(e.dataTransfer.files?.[0]); }}
            className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              drag ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel-2)]"
            } ${isOwn ? "cursor-pointer hover:border-[var(--accent)]" : "cursor-default"}`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-deep)]">
              <ImageIcon className="h-7 w-7" />
            </span>
            <span className="text-[13.5px] font-semibold">{isOwn ? t("empty") : t("emptyOther")}</span>
            {isOwn && <span className="text-[12px] text-[var(--ink-faint)]">{t("drop")}</span>}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {tracks.length > 0 && tracks.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-xl border border-[var(--line)]" style={{ boxShadow: "var(--shadow-sm)", background: "linear-gradient(120deg, var(--accent-soft), var(--panel-2) 85%)" }}>
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <Cover src={safeCoverUrl(p.track_cover)} size={72} className="shadow-md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">♪ {makePlaylist(lang)("wallTrack")}</div>
                      <div className="truncate text-[15px] font-bold">{p.track_title}</div>
                      {p.track_artist && <div className="truncate text-[13px] text-[var(--ink-soft)]">{p.track_artist}</div>}
                    </div>
                  </div>
                  {(p.track_url || p.track_preview) && <div className="mt-3"><TrackPlayer url={p.track_url ?? null} preview={p.track_preview} lang={lang} title={p.track_title ?? ""} artist={p.track_artist ?? null} cover={safeCoverUrl(p.track_cover)} /></div>}
                  {p.caption && <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-snug">{p.caption}</p>}
                </div>
                {isOwn && (
                  <button
                    onClick={() => remove(p)}
                    aria-label={t("del")}
                    className={`absolute right-1.5 top-1.5 flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition-all active:scale-90 ${
                      confirmId === p.id ? "bg-[var(--danger)] text-white" : "bg-black/45 text-white hover:bg-[var(--danger)]"
                    }`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />{confirmId === p.id && t("delSure")}
                  </button>
                )}
              </div>
            ))}
          <div
            className={images.length ? "columns-2 gap-3" : "hidden"}
            onDragOver={(e) => { if (isOwn) e.preventDefault(); }}
            onDrop={(e) => { if (!isOwn) return; e.preventDefault(); take(e.dataTransfer.files?.[0]); }}
          >
            {images.map((p, i) => (
              <figure
                key={p.id}
                className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-2)] transition-all hover:-translate-y-0.5 [animation:rise_.35s_ease-out_both]"
                style={{ boxShadow: "var(--shadow-sm)", animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <button type="button" onClick={() => setOpen(p)} className="block w-full text-left" aria-label={p.caption ?? t("title")}>
                  {p.media_path && urls[p.media_path] ? (
                    <img src={urls[p.media_path!]} alt={p.caption ?? ""} loading="lazy" className="block w-full" />
                  ) : (
                    <div className="h-32 animate-pulse bg-[var(--hover)]" />
                  )}
                  <figcaption className="px-2.5 py-2">
                      {p.caption && <p className="line-clamp-3 whitespace-pre-wrap break-words text-[12.5px] font-medium leading-snug">{p.caption}</p>}
                      <span className="text-[10.5px] text-[var(--ink-faint)]">{fmt(p.created_at)}</span>
                    </figcaption>
                </button>
                {isOwn && (
                  <button
                    onClick={() => remove(p)}
                    aria-label={t("del")}
                    className={`absolute right-1.5 top-1.5 flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold backdrop-blur transition-all active:scale-90 ${
                      confirmId === p.id ? "bg-[var(--danger)] text-white" : "bg-black/45 text-white opacity-90 hover:bg-[var(--danger)] sm:opacity-0 sm:group-hover:opacity-100"
                    }`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />{confirmId === p.id && t("delSure")}
                  </button>
                )}
              </figure>
            ))}
          </div>
          </div>
        )}
        {isOwn && <p className="mt-1 text-[11.5px] text-[var(--ink-faint)]">{t("note")}</p>}
      </div>

      {/* Просмотр на весь экран */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/85 p-4 backdrop-blur-sm [animation:fadein_.2s_ease-out]"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setOpen(null)}
            aria-label={t("close")}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <XIcon className="h-5 w-5" />
          </button>
          {open.media_path && urls[open.media_path] && (
            <img src={urls[open.media_path!]} alt={open.caption ?? ""} className="max-h-[75vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          )}
          <div className="max-w-md text-center text-white" onClick={(e) => e.stopPropagation()}>
            {open.caption && <p className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-snug">{open.caption}</p>}
            <span className="text-[12px] text-white/70">{fmt(open.created_at)}</span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
