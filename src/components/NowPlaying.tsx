import { useState } from "react";
import type { Lang } from "../i18n";
import { isLive, type NowPlaying } from "../lib/nowPlaying";
import type { FoundTrack } from "../lib/trackSearch";
import { makeNowPlaying } from "../now-playing-strings";
import { makeSearch } from "../music-search-strings";
import { Cover, PreviewButton, TrackSearch } from "./MusicParts";

/** Карточка как в Telegram: обложка, трек жирным, исполнитель; рядом кнопка превью, если оно есть, или ссылка на трек. */
export function MusicBar({ music, lang, onClear }: { music: NowPlaying; lang: Lang; onClear?: () => void }) {
  const n = makeNowPlaying(lang);
  const s = makeSearch(lang);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] p-3" style={{ background: "linear-gradient(120deg, var(--accent-soft), var(--panel) 85%)", boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">♪ {isLive(music.at) ? n("live") : n("recent")}</span>
        {onClear && <button onClick={onClear} className="text-[12px] font-semibold text-[var(--ink-faint)] hover:text-[var(--danger)]">{s("clear")}</button>}
      </div>
      <div className="flex items-center gap-3">
        <Cover src={music.cover} size={64} className="shadow-md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{music.title}</div>
          {music.artist && <div className="truncate text-[13px] text-[var(--ink-soft)]">{music.artist}</div>}
          {music.url && (
            <a href={music.url} target="_blank" rel="noopener noreferrer" aria-label={`${n("open")}: ${music.title}`} className="mt-0.5 inline-block text-[12px] font-semibold text-[var(--accent-deep)] hover:underline">
              {n("open")} ›
            </a>
          )}
        </div>
        {music.preview && <PreviewButton src={music.preview} lang={lang} size={44} />}
      </div>
    </div>
  );
}

/** Выбор своего трека «сейчас играет»: нашли, тапнули, готово. */
export function MusicEditor({ lang, music, onSave }: {
  lang: Lang; music: NowPlaying | null;
  onSave: (v: { music_title: string | null; music_artist: string | null; music_url: string | null; music_cover: string | null; music_preview: string | null; music_at: string | null }) => Promise<boolean>;
}) {
  const n = makeNowPlaying(lang);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (t: FoundTrack) => {
    const ok = await onSave({ music_title: t.title, music_artist: t.artist, music_url: t.url, music_cover: t.cover, music_preview: t.preview, music_at: new Date().toISOString() });
    setMsg({ ok, text: ok ? n("saved") : n("failed") });
    return ok;
  };
  const clear = async () => {
    const ok = await onSave({ music_title: null, music_artist: null, music_url: null, music_cover: null, music_preview: null, music_at: null });
    setMsg({ ok, text: ok ? n("saved") : n("failed") });
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{n("title")}</div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{n("hint")}</p>
      {music && <div className="mb-3"><MusicBar music={music} lang={lang} onClear={clear} /></div>}
      <TrackSearch lang={lang} onPick={save} actionLabel={n("set")} />
      {msg && <p className={`mt-2 text-[12px] font-semibold ${msg.ok ? "text-[var(--accent-deep)]" : "text-[var(--danger)]"}`} role="status">{msg.text}</p>}
    </div>
  );
}
