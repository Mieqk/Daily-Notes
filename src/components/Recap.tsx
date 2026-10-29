import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { plural } from "../plural";
import { makeRecap } from "../recap-strings";
import type { RecapKey } from "../recap-strings";
import { computeBadges, computeRecap, habitStreaks } from "../lib/recap";
import type { HabitKey, RecapData } from "../lib/recap";
import { fromISO, todayISO } from "../store";
import { DownloadIcon, FlameIcon } from "../icons";

const W = 1080;
const H = 1350;

function cssVar(name: string, fallback: string) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface CardInput {
  lang: Lang;
  range: 7 | 30;
  data: RecapData;
  moodEmoji: string[];
  bestStreak: number;
}

/** Рисует карточку итогов. В неё попадают только числа и даты, без текстов записей. */
function drawCard(canvas: HTMLCanvasElement, { lang, range, data, moodEmoji, bestStreak }: CardInput) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = makeRecap(lang);
  const r = computeRecap(data, range, todayISO());
  const bg = cssVar("--bg", "#edefe8");
  const panel = cssVar("--panel-2", "#fdfdf9");
  const ink = cssVar("--ink", "#1b231e");
  const soft = cssVar("--ink-soft", "#4c5a51");
  const line = cssVar("--line", "#d8ddd0");
  const accent = cssVar("--accent", "#226b52");
  const accentInk = cssVar("--accent-ink", "#f0f6ef");
  const accentSoft = cssVar("--accent-soft", "#dce9de");
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // шапка
  ctx.fillStyle = accent;
  roundRect(ctx, 60, 60, W - 120, 250, 40);
  ctx.fill();
  ctx.fillStyle = accentInk;
  ctx.font = `600 30px ${font}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText("Daily Notes", 100, 126);
  ctx.globalAlpha = 1;
  ctx.font = `800 70px ${font}`;
  ctx.fillText(s(range === 7 ? "weekTitle" : "monthTitle"), 100, 210);
  const fmt = new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long" });
  ctx.font = `500 32px ${font}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(`${fmt.format(fromISO(r.from))} — ${fmt.format(fromISO(r.to))}`, 100, 268);
  ctx.globalAlpha = 1;

  // плитки
  const mood = r.avgMood !== null ? Math.max(0, Math.min(4, Math.round(r.avgMood))) : null;
  const tiles: [string, string][] = [
    [s("cEntries"), `${r.entries}`],
    [s("cTasks"), r.tasksTotal ? `${r.tasksDone}/${r.tasksTotal}` : "—"],
    [s("cMood"), r.avgMood !== null ? `${moodEmoji[mood as number] ?? ""} ${r.avgMood.toFixed(1)}` : "—"],
    [s("cSleep"), r.avgSleep !== null ? `${r.avgSleep.toFixed(1)} ${s("hrs")}` : "—"],
    [s("cWords"), r.words.toLocaleString(localeOf(lang))],
    [s("cStreak"), `🔥 ${bestStreak}`],
  ];
  const tw = (W - 120 - 30) / 2;
  const th = 190;
  tiles.forEach(([label, value], i) => {
    const x = 60 + (i % 2) * (tw + 30);
    const y = 350 + Math.floor(i / 2) * (th + 30);
    ctx.fillStyle = panel;
    roundRect(ctx, x, y, tw, th, 32);
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = soft;
    ctx.font = `600 28px ${font}`;
    ctx.fillText(label.toUpperCase(), x + 36, y + 60);
    ctx.fillStyle = ink;
    ctx.font = `800 70px ${font}`;
    ctx.fillText(value, x + 36, y + 150, tw - 72);
  });

  // активные дни
  const by = 350 + 3 * (th + 30) + 20;
  const cols = range === 7 ? 7 : 10;
  const rows = Math.ceil(range / cols);
  const gap = range === 7 ? 18 : 12;
  const size = Math.min(80, (W - 120 - gap * (cols - 1)) / cols);
  const gridW = cols * size + (cols - 1) * gap;
  const gx = (W - gridW) / 2;
  r.active.forEach((on, i) => {
    const x = gx + (i % cols) * (size + gap);
    const y = by + Math.floor(i / cols) * (size + gap);
    ctx.fillStyle = on ? accent : accentSoft;
    roundRect(ctx, x, y, size, size, size / 4);
    ctx.fill();
  });
  const endY = by + rows * (size + gap);
  ctx.fillStyle = soft;
  ctx.font = `500 26px ${font}`;
  ctx.textAlign = "center";
  ctx.fillText(`${r.active.filter(Boolean).length} / ${range} ${plural(lang, range, "day")}`, W / 2, Math.min(endY + 30, H - 70));
  ctx.textAlign = "start";
}

async function shareCanvas(canvas: HTMLCanvasElement, title: string, name: string): Promise<"shared" | "saved" | "fail"> {
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return "fail";
  const file = new File([blob], name, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "saved";
}

/** Свёрнутость блока помним на устройстве. */
function useHidden(key: string): [boolean, () => void] {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(key) === "1"; } catch { return false; }
  });
  const toggle = () => {
    setHidden((h) => {
      try { localStorage.setItem(key, h ? "0" : "1"); } catch { /* ignore */ }
      return !h;
    });
  };
  return [hidden, toggle];
}

const toggleBtn = "h-8 shrink-0 rounded-lg border border-[var(--line)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)]";

interface RecapProps {
  data: RecapData;
  range: 7 | 30;
  moodEmoji: string[];
  lang: Lang;
}

/** Карточка итогов недели/месяца: картинку можно отправить друзьям. */
export function RecapCard({ data, range, moodEmoji, lang }: RecapProps) {
  const s = makeRecap(lang);
  const ref = useRef<HTMLCanvasElement>(null);
  const [themeTick, setThemeTick] = useState(0);
  const [msg, setMsg] = useState("");
  const streaks = useMemo(() => habitStreaks(data, todayISO()), [data]);
  const best = streaks.write.best;
  const [hidden, toggleHidden] = useHidden("dn.recapHidden");

  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    if (!hidden && ref.current) drawCard(ref.current, { lang, range, data, moodEmoji, bestStreak: best });
  }, [hidden, lang, range, data, moodEmoji, best, themeTick]);

  const share = async () => {
    if (!ref.current) return;
    const title = s(range === 7 ? "weekTitle" : "monthTitle");
    const res = await shareCanvas(ref.current, title, `daily-notes-${todayISO()}.png`);
    setMsg(res === "fail" ? s("shareFail") : res === "saved" ? s("saved") : "");
  };

  if (hidden) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="text-[15px] font-bold">{s(range === 7 ? "weekTitle" : "monthTitle")}</h3>
        <button onClick={toggleHidden} aria-expanded={false} className={toggleBtn}>{s("show")}</button>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <canvas ref={ref} role="img" aria-label={s(range === 7 ? "weekTitle" : "monthTitle")} className="aspect-[4/5] w-full max-w-[320px] self-center rounded-xl border border-[var(--line)] sm:self-start" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold">{s(range === 7 ? "weekTitle" : "monthTitle")}</h3>
            <button onClick={toggleHidden} aria-expanded className={toggleBtn}>{s("hide")}</button>
          </div>
          <p className="text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{s("privacy")}</p>
          <button
            onClick={share}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[14px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95 sm:w-auto sm:self-start"
          >
            <DownloadIcon className="h-4 w-4" />
            {s("share")}
          </button>
          <div role="status" className="min-h-[18px] text-[12.5px] text-[var(--ink-soft)]">{msg}</div>
        </div>
      </div>
    </div>
  );
}

const HABITS: { key: HabitKey; label: RecapKey }[] = [
  { key: "write", label: "sWrite" },
  { key: "mood", label: "sMood" },
  { key: "sleep", label: "sSleep" },
  { key: "tasks", label: "sTasks" },
];

/** Серии по ежедневным привычкам и значки. Всё считается из данных, отдельно ничего не хранится. */
export function StreaksAndBadges({ data, lang }: { data: RecapData; lang: Lang }) {
  const s = makeRecap(lang);
  const today = todayISO();
  const streaks = useMemo(() => habitStreaks(data, today), [data, today]);
  const badges = useMemo(() => computeBadges(data, today), [data, today]);
  const nf = new Intl.NumberFormat(localeOf(lang));
  const [hidden, toggleHidden] = useHidden("dn.badgesHidden");

  if (hidden) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="text-[15px] font-bold">{s("streaksTitle")} · {s("badgesTitle")} · {badges.filter((b) => b.done).length}/{badges.length}</h3>
        <button onClick={toggleHidden} aria-expanded={false} className={toggleBtn}>{s("show")}</button>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="mb-2 flex justify-end">
        <button onClick={toggleHidden} aria-expanded className={toggleBtn}>{s("hide")}</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 lg:col-span-2" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">{s("streaksTitle")}</h3>
        <ul className="flex flex-col gap-2">
          {HABITS.map((h) => {
            const st = streaks[h.key];
            return (
              <li key={h.key} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel-2)] px-3 py-2.5">
                <span className="text-[13.5px] font-semibold">{s(h.label)}</span>
                <span className="flex items-center gap-3 text-[12px] text-[var(--ink-soft)]">
                  <span className="flex items-center gap-1 text-[14px] font-bold tabular-nums text-[var(--ink)]">
                    <FlameIcon className={`h-4 w-4 ${st.current > 0 ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"}`} />
                    {st.current}
                  </span>
                  <span className="tabular-nums">{s("record")} {st.best}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 lg:col-span-3" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-3 text-[15px] font-bold">{s("badgesTitle")} · {badges.filter((b) => b.done).length}/{badges.length}</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {badges.map((b) => (
            <li key={b.id} className={`rounded-lg border px-3 py-2.5 ${b.done ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel-2)]"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[13.5px] font-bold ${b.done ? "text-[var(--accent-deep)]" : "text-[var(--ink-soft)]"}`}>{b.done ? "🏅 " : ""}{s(b.id as RecapKey)}</span>
                <span className="text-[11.5px] font-semibold tabular-nums text-[var(--ink-soft)]">{nf.format(Math.min(b.have, b.target))}/{nf.format(b.target)}</span>
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{s(`${b.id}d` as RecapKey)}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hover)]" aria-hidden="true">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${Math.min(100, (b.have / b.target) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  );
}
