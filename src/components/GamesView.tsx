import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../i18n";
import { makeGames } from "../games-strings";
import { useStored } from "../store";
import {
  addTile2048, canMove2048, cleanBests, isRecord, makeDeck, move2048, newBoard2048, newSnake, placeMines, revealCells,
  countAround, minesWon, stepSnake, isPuzzleSolved, shufflePuzzle, slideTile, tttComputerMove, tttWinner, PUZZLE_N, type Mark, MINES_COUNT, MINES_H, MINES_W, type Bests, type Dir, type GameId,
} from "../lib/games";

type T = (k: Parameters<ReturnType<typeof makeGames>>[0]) => string;
interface GameProps { t: T; best: number | undefined; submit: (v: number) => void }

const GAMES: { id: GameId; icon: string }[] = [
  { id: "g2048", icon: "🔢" },
  { id: "memory", icon: "🃏" },
  { id: "snake", icon: "🐍" },
  { id: "mines", icon: "💣" },
  { id: "reaction", icon: "⚡" },
  { id: "puzzle", icon: "🧩" },
  { id: "ttt", icon: "❌" },
];

const DESC = { g2048: "g2048Desc", memory: "memoryDesc", snake: "snakeDesc", mines: "minesDesc", reaction: "reactionDesc", puzzle: "puzzleDesc", ttt: "tttDesc" } as const;
const UNIT = { g2048: "", memory: "", snake: "", mines: "sec", reaction: "ms", puzzle: "", ttt: "" } as const;

const btn = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--hover)] active:scale-[0.98]";
const primary = "rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90 active:scale-[0.98]";

/** Свайп по элементу: возвращает обработчики указателя. Прокрутка страницы блокируется только на самом поле (touch-none). */
function useSwipe(onDir: (d: Dir) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    },
    onPointerCancel: () => { start.current = null; },
  };
}

const KEY_DIR: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };

/** Стрелки с клавиатуры, пока игра на экране. */
function useArrowKeys(onDir: (d: Dir) => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key];
      if (!d || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      onDir(d);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onDir]);
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-center">
      <div className="truncate text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className="text-base font-bold tabular-nums text-[var(--ink)]">{value}</div>
    </div>
  );
}

function Banner({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-center text-sm font-semibold text-[var(--ink)]">{children}</div>;
}

/* ---------- 2048 ---------- */

function Game2048({ t, best, submit }: GameProps) {
  const [board, setBoard] = useState(() => newBoard2048());
  const [score, setScore] = useState(0);
  const [keepGoing, setKeepGoing] = useState(false);
  const startBest = useRef(best);
  const over = useMemo(() => !canMove2048(board), [board]);
  const won = !keepGoing && board.some((v) => v >= 2048);

  const go = useCallback((d: Dir) => {
    if (over || won) return;
    const r = move2048(board, d);
    if (!r.moved) return;
    setBoard(addTile2048(r.board));
    setScore((s) => s + r.gained);
    if (r.gained) submit(score + r.gained);
  }, [board, over, won, score, submit]);

  useArrowKeys(go);
  const swipe = useSwipe(go);
  const restart = () => { setBoard(newBoard2048()); setScore(0); setKeepGoing(false); startBest.current = best; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Stat label={t("score")} value={score} /><Stat label={t("best")} value={Math.max(best ?? 0, score) || t("none")} /></div>
      <div {...swipe} className="mx-auto grid aspect-square w-full max-w-[22rem] touch-none select-none grid-cols-4 grid-rows-4 gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2" role="grid">
        {board.map((v, i) => {
          const level = v ? Math.log2(v) : 0;
          const pct = Math.min(96, 16 + level * 9);
          return (
            <div key={i} className={`flex items-center justify-center rounded-lg font-bold tabular-nums ${v >= 1000 ? "text-lg" : v >= 100 ? "text-xl" : "text-2xl"}`}
              style={{ background: v ? `color-mix(in srgb, var(--accent) ${pct}%, var(--panel))` : "var(--hover)", color: pct > 55 ? "var(--accent-ink)" : "var(--ink)" }}>
              {v || ""}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-[var(--ink-soft)]">{t("swipe")}</p>
      {over && <Banner>{t("gameOver")}{isRecord("g2048", startBest.current, score) && ` · ${t("record")}`}</Banner>}
      {won && (
        <Banner>
          {t("youWin")} <button className={`${btn} ml-2`} onClick={() => setKeepGoing(true)}>{t("keep")}</button>
        </Banner>
      )}
      <button className={`${primary} self-center`} onClick={restart}>{t("newGame")}</button>
    </div>
  );
}

/* ---------- Память ---------- */

const SYMBOLS = ["🌿", "🔥", "🌙", "⭐", "🌊", "🍀", "🦋", "🍓"];

function MemoryGame({ t, best, submit }: GameProps) {
  const [deck, setDeck] = useState(() => makeDeck(SYMBOLS.length));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<boolean[]>(() => Array(SYMBOLS.length * 2).fill(false));
  const [moves, setMoves] = useState(0);
  const startBest = useRef(best);
  const done = matched.every(Boolean);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    if (deck[a] === deck[b]) {
      setMatched((m) => m.map((x, i) => x || i === a || i === b));
      setOpen([]);
      return;
    }
    const id = setTimeout(() => setOpen([]), 750);
    return () => clearTimeout(id);
  }, [open, deck]);

  useEffect(() => { if (done) submit(moves); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (i: number) => {
    if (open.length >= 2 || open.includes(i) || matched[i]) return;
    if (open.length === 1) setMoves((m) => m + 1);
    setOpen([...open, i]);
  };
  const restart = () => { setDeck(makeDeck(SYMBOLS.length)); setOpen([]); setMatched(Array(SYMBOLS.length * 2).fill(false)); setMoves(0); startBest.current = best; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Stat label={t("moves")} value={moves} /><Stat label={t("best")} value={best ?? t("none")} /></div>
      <div className="mx-auto grid w-full max-w-[22rem] grid-cols-4 gap-2">
        {deck.map((v, i) => {
          const shown = open.includes(i) || matched[i];
          return (
            <button key={i} onClick={() => flip(i)} aria-label={shown ? SYMBOLS[v] : t("card")}
              className={`flex aspect-square items-center justify-center rounded-xl border border-[var(--line)] text-2xl transition-all ${matched[i] ? "bg-[var(--hover)] opacity-60" : shown ? "bg-[var(--panel)]" : "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90"}`}>
              {shown ? SYMBOLS[v] : "?"}
            </button>
          );
        })}
      </div>
      {done && <Banner>{t("youWin")}{isRecord("memory", startBest.current, moves) && ` · ${t("record")}`}</Banner>}
      <button className={`${primary} self-center`} onClick={restart}>{t("newGame")}</button>
    </div>
  );
}

/* ---------- Змейка ---------- */

function SnakeGame({ t, best, submit }: GameProps) {
  const [state, setState] = useState(() => newSnake());
  const [status, setStatus] = useState<"ready" | "play" | "paused">("ready");
  const want = useRef<Dir>("right");
  const startBest = useRef(best);
  const { w, h, snake, food, alive, score } = state;

  useEffect(() => {
    if (status !== "play") return;
    const id = setInterval(() => setState((s) => stepSnake(s, want.current)), 130);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => { if (!alive) submit(score); }, [alive]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = () => { if (document.hidden) setStatus((s) => (s === "play" ? "paused" : s)); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);

  const steer = useCallback((d: Dir) => {
    want.current = d;
    setStatus((s) => (s === "play" ? s : "play"));
  }, []);
  useArrowKeys(steer);
  const swipe = useSwipe(steer);

  const restart = () => { setState(newSnake()); want.current = "right"; setStatus("ready"); startBest.current = best; };
  const cells = useMemo(() => {
    const m = new Map<number, "head" | "body" | "food">();
    if (food) m.set(food.y * w + food.x, "food");
    snake.forEach((p, i) => m.set(p.y * w + p.x, i === 0 ? "head" : "body"));
    return m;
  }, [snake, food, w]);
  const dpad = (d: Dir, label: string, glyph: string, cls: string) => (
    <button aria-label={label} className={`${btn} h-11 ${cls}`} onPointerDown={(e) => { e.preventDefault(); steer(d); }}>{glyph}</button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Stat label={t("score")} value={score} /><Stat label={t("best")} value={Math.max(best ?? 0, score) || t("none")} /></div>
      <div {...swipe} className="relative mx-auto aspect-square w-full max-w-[22rem] touch-none select-none overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, gridTemplateRows: `repeat(${h}, 1fr)` }}>
          {Array.from({ length: w * h }, (_, i) => {
            const c = cells.get(i);
            return (
              <div key={i} className="p-[1px]">
                {c && <div className={`h-full w-full ${c === "food" ? "rounded-full" : "rounded-[3px]"}`} style={{ background: c === "food" ? "var(--ink-soft)" : "var(--accent)", opacity: c === "body" ? 0.7 : 1 }} />}
              </div>
            );
          })}
        </div>
        {status !== "play" && alive && (
          <button className="absolute inset-0 flex items-center justify-center bg-[var(--panel)]/70 text-sm font-semibold text-[var(--ink)]" onClick={() => setStatus("play")}>
            {status === "paused" ? t("resume") : t("start")}
          </button>
        )}
      </div>
      <div className="mx-auto grid w-full max-w-[14rem] grid-cols-3 gap-1.5">
        <span />{dpad("up", t("up"), "▲", "")}<span />
        {dpad("left", t("left"), "◀", "")}
        <button className={`${btn} h-11`} disabled={!alive || status === "ready"} onClick={() => setStatus((s) => (s === "play" ? "paused" : "play"))}>{status === "play" ? "⏸" : "▶"}</button>
        {dpad("right", t("right"), "▶", "")}
        <span />{dpad("down", t("down"), "▼", "")}<span />
      </div>
      {!alive && <Banner>{t("gameOver")}{isRecord("snake", startBest.current, score) && ` · ${t("record")}`}</Banner>}
      <button className={`${primary} self-center`} onClick={restart}>{t("newGame")}</button>
    </div>
  );
}

/* ---------- Сапёр ---------- */

const NUM_COLORS = ["", "#3b82f6", "#16a34a", "#ef4444", "#8b5cf6", "#d97706", "#0891b2", "#ec4899", "#6b7280"];

function MinesGame({ t, best, submit }: GameProps) {
  const total = MINES_W * MINES_H;
  const [mines, setMines] = useState<boolean[] | null>(null);
  const [open, setOpen] = useState<boolean[]>(() => Array(total).fill(false));
  const [flags, setFlags] = useState<boolean[]>(() => Array(total).fill(false));
  const [flagMode, setFlagMode] = useState(false);
  const [lost, setLost] = useState(false);
  const [secs, setSecs] = useState(0);
  const startBest = useRef(best);
  const won = !!mines && !lost && minesWon(mines, open);
  const running = !!mines && !lost && !won;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => { if (won) submit(Math.max(1, secs)); }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFlag = (i: number) => { if (!open[i]) setFlags((f) => f.map((x, j) => (j === i ? !x : x))); };
  const tap = (i: number) => {
    if (lost || won) return;
    if (flagMode) { toggleFlag(i); return; }
    if (flags[i] || open[i]) return;
    const m = mines ?? placeMines(MINES_W, MINES_H, MINES_COUNT, i);
    if (!mines) setMines(m);
    if (m[i]) { setOpen((o) => o.map((x, j) => x || m[j])); setLost(true); return; }
    setOpen(revealCells(m, open, flags, i, MINES_W, MINES_H));
  };
  const restart = () => {
    setMines(null); setOpen(Array(total).fill(false)); setFlags(Array(total).fill(false));
    setLost(false); setSecs(0); setFlagMode(false); startBest.current = best;
  };
  const left = MINES_COUNT - flags.filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Stat label={t("mineLeft")} value={left} />
        <Stat label={t("time")} value={`${secs} ${t("sec")}`} />
        <Stat label={t("best")} value={best ? `${best} ${t("sec")}` : t("none")} />
      </div>
      <div className="mx-auto grid w-full max-w-[22rem] gap-[3px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5" style={{ gridTemplateColumns: `repeat(${MINES_W}, 1fr)` }}>
        {Array.from({ length: total }, (_, i) => {
          const isOpen = open[i];
          const isMine = !!mines?.[i];
          const n = isOpen && mines && !isMine ? countAround(mines, i, MINES_W, MINES_H) : 0;
          return (
            <button key={i} onClick={() => tap(i)} onContextMenu={(e) => { e.preventDefault(); if (!lost && !won) toggleFlag(i); }}
              className={`flex aspect-square select-none items-center justify-center rounded-md text-sm font-bold ${isOpen ? (isMine ? "bg-red-500/30" : "bg-[var(--hover)]") : "border border-[var(--line)] bg-[var(--accent)]/80 hover:bg-[var(--accent)]"}`}
              style={{ color: NUM_COLORS[n] }}>
              {isOpen ? (isMine ? "💣" : n || "") : flags[i] ? "🚩" : ""}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button aria-pressed={flagMode} onClick={() => setFlagMode((f) => !f)} className={flagMode ? primary : btn}>🚩 {t("flag")}</button>
        <button className={primary} onClick={restart}>{t("newGame")}</button>
      </div>
      {flagMode && <p className="text-center text-xs text-[var(--ink-soft)]">{t("flagOn")}</p>}
      {lost && <Banner>{t("gameOver")}</Banner>}
      {won && <Banner>{t("youWin")}{isRecord("mines", startBest.current, Math.max(1, secs)) && ` · ${t("record")}`}</Banner>}
    </div>
  );
}

/* ---------- Реакция ---------- */

function ReactionGame({ t, best, submit }: GameProps) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early" | "done">("idle");
  const [ms, setMs] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const since = useRef(0);
  const startBest = useRef(best);

  useEffect(() => () => clearTimeout(timer.current), []);

  const press = () => {
    if (phase === "idle" || phase === "early" || phase === "done") {
      if (phase !== "early") startBest.current = best;
      setPhase("wait");
      timer.current = setTimeout(() => { since.current = performance.now(); setPhase("go"); }, 1500 + Math.random() * 2500);
    } else if (phase === "wait") {
      clearTimeout(timer.current);
      setPhase("early");
    } else {
      const v = Math.max(1, Math.round(performance.now() - since.current));
      setMs(v);
      submit(v);
      setPhase("done");
    }
  };

  const bg = phase === "go" ? "#16a34a" : phase === "wait" ? "#dc2626" : phase === "early" ? "var(--hover)" : "var(--accent)";
  const fg = phase === "go" || phase === "wait" ? "#fff" : phase === "early" ? "var(--ink)" : "var(--accent-ink)";
  const text = phase === "idle" ? t("start") : phase === "wait" ? t("waitGreen") : phase === "go" ? t("tapNow") : phase === "early" ? t("tooSoon") : `${ms} ${t("ms")}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Stat label={t("time")} value={phase === "done" ? `${ms} ${t("ms")}` : t("none")} /><Stat label={t("best")} value={best ? `${best} ${t("ms")}` : t("none")} /></div>
      <button onPointerDown={(e) => { e.preventDefault(); press(); }} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); press(); } }}
        className="mx-auto flex h-56 w-full max-w-[22rem] select-none flex-col items-center justify-center gap-1 rounded-xl text-xl font-bold transition-colors" style={{ background: bg, color: fg }}>
        {text}
        {phase === "done" && <span className="text-xs font-semibold opacity-80">{isRecord("reaction", startBest.current, ms) ? t("record") : t("again")}</span>}
      </button>
    </div>
  );
}

/* ---------- Пятнашки ---------- */

function PuzzleGame({ t, best, submit }: GameProps) {
  const [board, setBoard] = useState(() => shufflePuzzle());
  const [moves, setMoves] = useState(0);
  const startBest = useRef(best);
  const done = isPuzzleSolved(board) && moves > 0;

  useEffect(() => { if (done) submit(moves); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (i: number) => {
    if (done) return;
    const next = slideTile(board, i);
    if (next === board) return;
    setBoard(next);
    setMoves((m) => m + 1);
  };
  const restart = () => { setBoard(shufflePuzzle()); setMoves(0); startBest.current = best; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Stat label={t("moves")} value={moves} /><Stat label={t("best")} value={best ?? t("none")} /></div>
      <div className="mx-auto grid aspect-square w-full max-w-[22rem] gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5" style={{ gridTemplateColumns: `repeat(${PUZZLE_N}, 1fr)`, gridTemplateRows: `repeat(${PUZZLE_N}, 1fr)` }}>
        {board.map((v, i) => (
          v === 0 ? <div key={i} /> : (
            <button key={i} onClick={() => tap(i)} className="flex items-center justify-center rounded-lg bg-[var(--accent)] text-2xl font-bold tabular-nums text-[var(--accent-ink)] transition-transform active:scale-95">{v}</button>
          )
        ))}
      </div>
      {done && <Banner>{t("solved")}{isRecord("puzzle", startBest.current, moves) && ` · ${t("record")}`}</Banner>}
      <button className={`${primary} self-center`} onClick={restart}>{t("newGame")}</button>
    </div>
  );
}

/* ---------- Крестики-нолики ---------- */

function TttGame({ t, best, submit }: GameProps) {
  const [board, setBoard] = useState<Mark[]>(() => Array(9).fill(null));
  const result = tttWinner(board);
  const myTurn = !result && board.filter(Boolean).length % 2 === 0;

  // ход компьютера с короткой паузой, чтобы он не выглядел мгновенным
  useEffect(() => {
    if (result || myTurn) return;
    const move = tttComputerMove(board, "O");
    const id = setTimeout(() => setBoard((b) => b.map((x, i) => (i === move && !x ? "O" : x))), 450);
    return () => clearTimeout(id);
  }, [board, result, myTurn]);

  useEffect(() => { if (result === "X") submit((best ?? 0) + 1); }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (i: number) => { if (myTurn && !board[i]) setBoard(board.map((x, j) => (j === i ? "X" : x))); };
  const status = result === "X" ? t("youWin") : result === "draw" ? t("draw") : result === "O" ? t("gameOver") : myTurn ? t("yourTurn") : t("thinking");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Stat label={t("wins")} value={best ?? 0} /></div>
      <div className="mx-auto grid aspect-square w-full max-w-[22rem] grid-cols-3 grid-rows-3 gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2">
        {board.map((v, i) => (
          <button key={i} onClick={() => tap(i)} disabled={!!v || !myTurn} aria-label={v ?? ""}
            className={`flex items-center justify-center rounded-lg bg-[var(--hover)] text-5xl font-bold ${v === "X" ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"}`}>
            {v === "X" ? "✕" : v === "O" ? "◯" : ""}
          </button>
        ))}
      </div>
      <Banner>{status}</Banner>
      <button className={`${primary} self-center`} onClick={() => setBoard(Array(9).fill(null))}>{t("newGame")}</button>
    </div>
  );
}

/* ---------- Меню ---------- */

export default function GamesView({ lang }: { lang: Lang }) {
  const t = useMemo(() => makeGames(lang), [lang]);
  const [raw, setRaw] = useStored<Bests>("dn.games", {});
  const bests = useMemo(() => cleanBests(raw), [raw]);
  const [game, setGame] = useState<GameId | null>(null);

  const submit = useCallback((id: GameId, v: number) => {
    setRaw((prev) => {
      const cur = cleanBests(prev);
      return isRecord(id, cur[id], v) ? { ...cur, [id]: v } : prev;
    });
  }, [setRaw]);

  if (game) {
    const props = { t, best: bests[game], submit: (v: number) => submit(game, v) };
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        <div className="flex items-center gap-2">
          <button className={btn} onClick={() => setGame(null)}>← {t("back")}</button>
          <h3 className="min-w-0 truncate text-base font-bold text-[var(--ink)]">{t(game)}</h3>
        </div>
        {game === "g2048" && <Game2048 {...props} />}
        {game === "memory" && <MemoryGame {...props} />}
        {game === "snake" && <SnakeGame {...props} />}
        {game === "mines" && <MinesGame {...props} />}
        {game === "reaction" && <ReactionGame {...props} />}
        {game === "puzzle" && <PuzzleGame {...props} />}
        {game === "ttt" && <TttGame {...props} />}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <p className="text-sm text-[var(--ink-soft)]">{t("intro")}</p>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map(({ id, icon }) => {
          const b = bests[id];
          const unit = UNIT[id] ? ` ${t(UNIT[id])}` : "";
          return (
            <button key={id} onClick={() => setGame(id)} className="flex min-w-0 flex-col items-start gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-left transition-colors hover:bg-[var(--hover)] active:scale-[0.99]" style={{ boxShadow: "var(--shadow-sm)" }}>
              <span className="text-2xl" aria-hidden>{icon}</span>
              <span className="text-[15px] font-bold text-[var(--ink)]">{t(id)}</span>
              <span className="text-xs leading-snug text-[var(--ink-soft)]">{t(DESC[id])}</span>
              {b !== undefined && <span className="mt-1 text-[11px] font-semibold text-[var(--accent)]">{t("best")}: {b}{unit}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
