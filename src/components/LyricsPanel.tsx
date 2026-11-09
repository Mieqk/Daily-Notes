import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { makeLyrics } from "../lyrics-strings";
import { activeLine, findLyrics, getOffset, setOffset, type Lyrics } from "../lib/lyrics";
import { api, useMusic } from "../lib/musicStore";

/** Текст песни: подсвечивает строку, которая звучит, и по касанию перематывает на неё. Подсветка работает только на полных треках. */
export function LyricsPanel({ lang, title, artist, tall = false }: { lang: Lang; title: string; artist: string | null; tall?: boolean }) {
  const s = makeLyrics(lang);
  const m = useMusic();
  const [data, setData] = useState<Lyrics | null | undefined>(undefined); // undefined = грузим
  const [offset, setOff] = useState(() => getOffset(title, artist));
  const boxRef = useRef<HTMLDivElement>(null);
  const full = m.dur > 40; // у превью 30 секунд: его время не совпадает с временем песни
  const durKey = full ? Math.round(m.dur) : null;
  const lastTrack = useRef("");

  useEffect(() => {
    const id = `${artist ?? ""}|${title}`;
    if (lastTrack.current !== id) { lastTrack.current = id; setData(undefined); setOff(getOffset(title, artist)); }
    const ac = new AbortController();
    findLyrics(title, artist, durKey, ac.signal).then((d) => setData(d)).catch(() => { /* отмена */ });
    return () => ac.abort();
  }, [title, artist, durKey]);

  const lines = data?.synced ?? null;
  const idx = lines && full ? activeLine(lines, m.time + offset + 0.15) : -1;
  useEffect(() => {
    const box = boxRef.current;
    const el = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !el) return;
    // прокручиваем только сам список, а не всю страницу
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [idx]);

  const shift = (d: number) => { const v = Math.round((offset + d) * 10) / 10; setOff(v); setOffset(title, artist, v); };

  if (data === undefined) return <p className="py-6 text-center text-[13px] text-[var(--ink-soft)]">{s("loading")}</p>;
  if (!data) return <p className="py-6 text-center text-[13px] text-[var(--ink-soft)]">{s("none")}</p>;
  return (
    <div>
      <div ref={boxRef} className={`relative overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-[var(--panel)]/70 px-4 py-5 text-center backdrop-blur ${tall ? "h-[min(62vh,560px)]" : "max-h-[46vh]"}`}>
        {lines ? lines.map((l, i) => (
          <button key={i} data-active={i === idx} disabled={!full} onClick={() => api.seek(Math.max(0, l.t - offset))}
            className={`block w-full py-1.5 text-[17px] font-bold leading-snug transition-all duration-300 sm:text-[19px] lg:text-[22px] ${i === idx ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"} ${full ? "active:opacity-70" : "cursor-default"}`}>
            {l.text || "♪"}
          </button>
        )) : <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--ink-soft)] lg:text-[17px]">{data.plain}</p>}
      </div>
      {lines && full && (
        <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-[var(--ink-soft)]">
          <span>{s("shift")}</span>
          <button onClick={() => shift(-0.5)} aria-label="-0.5" className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] font-bold active:scale-90">−</button>
          <span className="w-12 text-center tabular-nums">{offset > 0 ? "+" : ""}{offset.toFixed(1)} c</span>
          <button onClick={() => shift(0.5)} aria-label="+0.5" className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] font-bold active:scale-90">+</button>
          {offset !== 0 && <button onClick={() => { setOff(0); setOffset(title, artist, 0); }} className="px-2 font-semibold text-[var(--accent-deep)]">{s("reset")}</button>}
        </div>
      )}
      <p className="mt-2 text-center text-[11px] text-[var(--ink-faint)]">
        {!lines ? s("plainOnly") + " · " : !full ? s("previewNote") + " · " : ""}{s("source")}
      </p>
    </div>
  );
}
