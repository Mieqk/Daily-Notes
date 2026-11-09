import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { embedOf } from "../lib/musicEmbed";
import { api, useMusic, type PlayerTrack } from "../lib/musicStore";
import { makeSearch } from "../music-search-strings";
import { Cover, TrackPlayer } from "./MusicParts";
import { SeekBar, Transport, VolumeControl } from "./PlayerControls";

export type { PlayerTrack };

/**
 * Плеер в карточке плейлиста: большая обложка с размытой подложкой, перемотка, управление и громкость.
 * Играет через общий плеер: если уйти на другой экран, музыка продолжится, а внизу появится мини-плеер.
 */
export default function MusicPlayer({ tracks, selId, onSel, lang }: { tracks: PlayerTrack[]; selId: string | null; onSel: (id: string) => void; lang: Lang }) {
  const s = makeSearch(lang);
  const m = useMusic();
  const cur = tracks.find((t) => t.id === selId) ?? null;
  const active = !!cur && m.curId === cur.id;
  const [fullId, setFullId] = useState<string | null>(null);

  // автопереход на следующий трек или перемотка кнопками: выбранной строкой становится играющий трек плейлиста
  useEffect(() => {
    if (m.curId && m.curId !== selId && tracks.some((t) => t.id === m.curId)) onSel(m.curId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.curId]);

  if (!cur) {
    return <div className="mb-3 rounded-2xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-[13px] text-[var(--ink-faint)]">{s("pickOne")}</div>;
  }
  const playable = tracks.filter((t) => t.preview);
  const canFull = !!embedOf(cur.url);
  const showFull = canFull && fullId === cur.id;
  const openFull = () => { if (active && m.playing) api.toggle(); setFullId(cur.id); };
  const toggle = () => { if (active) api.toggle(); else if (cur.preview) api.playQueue(playable, cur.id); };

  return (
    <div className="relative mb-3 overflow-hidden rounded-3xl border border-[var(--line)]" style={{ boxShadow: "var(--shadow-sm)" }}>
      {cur.cover && <img src={cur.cover} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--panel) 55%, transparent), var(--panel) 92%)" }} />
      <div className="relative px-4 pb-4 pt-5 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
          <Cover src={cur.cover} size={132} className="!rounded-2xl shadow-2xl" />
          <div className="min-w-0 text-center sm:flex-1 sm:text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-deep)]">♪ {s("queue")} {playable.findIndex((t) => t.id === cur.id) >= 0 ? `${playable.findIndex((t) => t.id === cur.id) + 1}/${playable.length}` : ""}</div>
            <div className="truncate text-[20px] font-bold leading-tight">{cur.title}</div>
            {cur.artist && <div className="truncate text-[14px] text-[var(--ink-soft)]">{cur.artist}</div>}
          </div>
        </div>

        {showFull ? (
          <div className="mt-4 flex flex-col gap-2">
            <TrackPlayer url={cur.url} lang={lang} />
            {cur.preview && <button onClick={() => setFullId(null)} className="mx-auto h-8 rounded-full px-3 text-[12px] font-semibold text-[var(--accent-deep)] hover:underline">‹ {s("backPreview")}</button>}
          </div>
        ) : cur.preview ? (
          <div className="mt-4 flex flex-col gap-2">
            <SeekBar lang={lang} active={active} />
            <Transport lang={lang} active={active} onToggle={toggle} />
            <VolumeControl lang={lang} className="mx-auto w-full max-w-xs" />
            {canFull && (
              <button onClick={openFull} title={s("fullHint")} className="mx-auto h-9 rounded-full bg-[var(--accent)] px-4 text-[12.5px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95">{s("fullHere")}</button>
            )}
            <p className="text-center text-[11px] text-[var(--ink-faint)]">{s("preview")}{cur.url && !canFull && <> · <a href={cur.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent-deep)] hover:underline">{s("full")} ›</a></>}</p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-[12px] text-[var(--ink-faint)]">{s("noPreview")}</p>
            <TrackPlayer url={cur.url} lang={lang} />
          </div>
        )}
      </div>
    </div>
  );
}
