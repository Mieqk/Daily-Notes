import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { makeLyrics } from "../lyrics-strings";
import { activeLine, findLyrics, type Lyrics } from "../lib/lyrics";
import { api, useMusic } from "../lib/musicStore";

/** Текст песни: подсвечивает строку, которая звучит, и по касанию перематывает на неё. Только для полных треков. */
export function LyricsPanel({ lang, title, artist }: { lang: Lang; title: string; artist: string | null }) {
  const s = makeLyrics(lang);
  const m = useMusic();
  const [data, setData] = useState<Lyrics | null | undefined>(undefined); // undefined = грузим
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setData(undefined);
    const ac = new AbortController();
    findLyrics(title, artist, ac.signal).then(setData).catch(() => { /* отмена */ });
    return () => ac.abort();
  }, [title, artist]);

  const full = m.dur > 40; // у превью 30 секунд: его время не совпадает с временем песни
  const lines = data?.synced ?? null;
  const idx = lines && full ? activeLine(lines, m.time + 0.3) : -1;
  useEffect(() => {
    const el = boxRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [idx]);

  if (data === undefined) return <p className="py-6 text-center text-[13px] text-[var(--ink-soft)]">{s("loading")}</p>;
  if (!data) return <p className="py-6 text-center text-[13px] text-[var(--ink-soft)]">{s("none")}</p>;
  return (
    <div>
      <div ref={boxRef} className="max-h-[46vh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-[var(--panel)]/70 px-4 py-5 text-center backdrop-blur">
        {lines ? lines.map((l, i) => (
          <button key={i} data-active={i === idx} disabled={!full} onClick={() => api.seek(l.t)}
            className={`block w-full py-1 text-[17px] font-bold leading-snug transition-all duration-300 ${i === idx ? "scale-100 text-[var(--ink)]" : "scale-[0.97] text-[var(--ink-faint)]"} ${full ? "active:opacity-70" : "cursor-default"}`}>
            {l.text || "♪"}
          </button>
        )) : <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-soft)]">{data.plain}</p>}
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--ink-faint)]">
        {!lines ? s("plainOnly") + " · " : !full ? s("previewNote") + " · " : ""}{s("source")}
      </p>
    </div>
  );
}
