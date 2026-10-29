/** Чистая логика мини-игр (без React и без браузера), чтобы её можно было проверять тестами. */

export type Rng = () => number;

export type GameId = "g2048" | "memory" | "snake" | "mines" | "reaction" | "puzzle" | "ttt";

/** Для каких игр лучше меньшее число (ходы, секунды, миллисекунды). */
const LOWER_IS_BETTER: Record<GameId, boolean> = { g2048: false, memory: true, snake: false, mines: true, reaction: true, puzzle: true, ttt: false };

export type Bests = Partial<Record<GameId, number>>;

/** Новый рекорд, если результат лучше прежнего (или прежнего нет). */
export function isRecord(id: GameId, old: number | undefined, value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  if (old === undefined || !Number.isFinite(old)) return true;
  return LOWER_IS_BETTER[id] ? value < old : value > old;
}

/** Рекорды из хранилища: оставляем только известные игры и положительные числа (файл копии мог быть любым). */
export function cleanBests(raw: unknown): Bests {
  const out: Bests = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const id of Object.keys(LOWER_IS_BETTER) as GameId[]) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) out[id] = v;
  }
  return out;
}

/* ---------- 2048 ---------- */

export const SIZE_2048 = 4;
export type Dir = "up" | "down" | "left" | "right";

/** Сдвиг одной строки влево со слиянием: каждая плитка сливается не больше одного раза за ход. */
export function slideLine(line: number[]): { line: number[]; gained: number } {
  const tiles = line.filter((v) => v > 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      gained += tiles[i] * 2;
      i++;
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained };
}

/** Ход по доске 4×4 (массив из 16 клеток по строкам). `moved` — изменилось ли что-нибудь. */
export function move2048(board: number[], dir: Dir): { board: number[]; gained: number; moved: boolean } {
  const n = SIZE_2048;
  const next = board.slice();
  let gained = 0;
  for (let k = 0; k < n; k++) {
    const idx = Array.from({ length: n }, (_, i) =>
      dir === "left" ? k * n + i : dir === "right" ? k * n + (n - 1 - i) : dir === "up" ? i * n + k : (n - 1 - i) * n + k);
    const res = slideLine(idx.map((j) => board[j]));
    gained += res.gained;
    idx.forEach((j, i) => { next[j] = res.line[i]; });
  }
  return { board: next, gained, moved: next.some((v, i) => v !== board[i]) };
}

/** Добавляет 2 (чаще) или 4 в случайную пустую клетку. */
export function addTile2048(board: number[], rng: Rng = Math.random): number[] {
  const empty = board.flatMap((v, i) => (v === 0 ? [i] : []));
  if (!empty.length) return board;
  const next = board.slice();
  next[empty[Math.floor(rng() * empty.length)]] = rng() < 0.9 ? 2 : 4;
  return next;
}

export const newBoard2048 = (rng: Rng = Math.random): number[] => addTile2048(addTile2048(Array(SIZE_2048 * SIZE_2048).fill(0), rng), rng);

export const canMove2048 = (board: number[]): boolean =>
  (["left", "right", "up", "down"] as Dir[]).some((d) => move2048(board, d).moved);

/* ---------- Память ---------- */

/** Перемешивание Фишера — Йетса. */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Колода из `pairs` пар: числа 0..pairs-1, каждое дважды, вперемешку. */
export const makeDeck = (pairs: number, rng: Rng = Math.random): number[] =>
  shuffle(Array.from({ length: pairs * 2 }, (_, i) => i % pairs), rng);

/* ---------- Змейка ---------- */

export interface Pt { x: number; y: number }
export interface SnakeState { w: number; h: number; snake: Pt[]; dir: Dir; food: Pt | null; alive: boolean; score: number }

const STEP: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export const isReverse = (a: Dir, b: Dir): boolean => OPPOSITE[a] === b;

function placeFood(w: number, h: number, snake: Pt[], rng: Rng): Pt | null {
  const free: Pt[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y });
  return free.length ? free[Math.floor(rng() * free.length)] : null;
}

export function newSnake(w = 15, h = 15, rng: Rng = Math.random): SnakeState {
  const cy = Math.floor(h / 2);
  const snake = [{ x: 4, y: cy }, { x: 3, y: cy }, { x: 2, y: cy }];
  return { w, h, snake, dir: "right", food: placeFood(w, h, snake, rng), alive: true, score: 0 };
}

/** Один шаг змейки. Разворот на 180° игнорируется; стена и собственный хвост заканчивают игру. */
export function stepSnake(s: SnakeState, want: Dir, rng: Rng = Math.random): SnakeState {
  if (!s.alive) return s;
  const dir = isReverse(s.dir, want) ? s.dir : want;
  const head = { x: s.snake[0].x + STEP[dir].x, y: s.snake[0].y + STEP[dir].y };
  const ate = !!s.food && head.x === s.food.x && head.y === s.food.y;
  // хвост освободит клетку в этот же ход, если змейка не растёт
  const body = ate ? s.snake : s.snake.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= s.w || head.y >= s.h || body.some((p) => p.x === head.x && p.y === head.y)) {
    return { ...s, dir, alive: false };
  }
  const snake = [head, ...body];
  return { ...s, dir, snake, score: s.score + (ate ? 1 : 0), food: ate ? placeFood(s.w, s.h, snake, rng) : s.food };
}

/* ---------- Сапёр ---------- */

export const MINES_W = 9;
export const MINES_H = 9;
export const MINES_COUNT = 10;

/** Мины расставляются после первого нажатия: сама клетка и её соседи всегда безопасны. */
export function placeMines(w: number, h: number, count: number, safe: number, rng: Rng = Math.random): boolean[] {
  const sx = safe % w, sy = Math.floor(safe / w);
  const cand: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = Math.floor(i / w);
    if (Math.abs(x - sx) > 1 || Math.abs(y - sy) > 1) cand.push(i);
  }
  const mines = Array<boolean>(w * h).fill(false);
  shuffle(cand, rng).slice(0, count).forEach((i) => { mines[i] = true; });
  return mines;
}

export function neighbours(i: number, w: number, h: number): number[] {
  const x = i % w, y = Math.floor(i / w);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
  }
  return out;
}

export const countAround = (mines: boolean[], i: number, w: number, h: number): number =>
  neighbours(i, w, h).filter((j) => mines[j]).length;

/** Открывает клетку; пустая (0 мин рядом) раскрывает соседей волной. Флажки не открываются. */
export function revealCells(mines: boolean[], open: boolean[], flags: boolean[], from: number, w: number, h: number): boolean[] {
  if (open[from] || flags[from]) return open;
  const next = open.slice();
  const stack = [from];
  while (stack.length) {
    const i = stack.pop() as number;
    if (next[i] || flags[i]) continue;
    next[i] = true;
    if (!mines[i] && countAround(mines, i, w, h) === 0) stack.push(...neighbours(i, w, h));
  }
  return next;
}

/** Победа: открыты все клетки без мин. */
export const minesWon = (mines: boolean[], open: boolean[]): boolean => mines.every((m, i) => m || open[i]);

/* ---------- Пятнашки ---------- */

export const PUZZLE_N = 4;

export const solvedPuzzle = (n = PUZZLE_N): number[] => Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));

export const isPuzzleSolved = (board: number[]): boolean => board.every((v, i) => v === (i + 1) % board.length);

/** Сдвигает плитку на пустую клетку (0), если они соседи по стороне. Иначе возвращает ту же доску. */
export function slideTile(board: number[], idx: number, n = PUZZLE_N): number[] {
  const hole = board.indexOf(0);
  const dx = Math.abs((idx % n) - (hole % n)), dy = Math.abs(Math.floor(idx / n) - Math.floor(hole / n));
  if (dx + dy !== 1) return board;
  const next = board.slice();
  next[hole] = board[idx];
  next[idx] = 0;
  return next;
}

/** Перемешивание случайными ходами из собранной доски: такая доска всегда решается. */
export function shufflePuzzle(rng: Rng = Math.random, n = PUZZLE_N, moves = 200): number[] {
  let board = solvedPuzzle(n);
  let prev = -1;
  for (let i = 0; i < moves; i++) {
    const hole = board.indexOf(0);
    const opts = neighbours(hole, n, n).filter((j) => Math.abs((j % n) - (hole % n)) + Math.abs(Math.floor(j / n) - Math.floor(hole / n)) === 1 && j !== prev);
    const pick = opts[Math.floor(rng() * opts.length)];
    prev = hole;
    board = slideTile(board, pick, n);
  }
  return isPuzzleSolved(board) ? shufflePuzzle(rng, n, moves) : board;
}

/* ---------- Крестики-нолики ---------- */

export type Mark = "X" | "O" | null;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function tttWinner(b: Mark[]): "X" | "O" | "draw" | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? "draw" : null;
}

/** Оценка позиции для `me`: чем быстрее победа, тем выше счёт; чем позже поражение, тем лучше. */
function minimax(b: Mark[], turn: "X" | "O", me: "X" | "O", depth = 0): number {
  const w = tttWinner(b);
  if (w) return w === "draw" ? 0 : w === me ? 10 - depth : depth - 10;
  const scores = b.flatMap((v, i) => (v ? [] : [minimax(b.map((x, j) => (j === i ? turn : x)), turn === "X" ? "O" : "X", me, depth + 1)]));
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

/** Ход компьютера: обычно лучший, но с вероятностью `blunder` случайный, чтобы у человека был шанс выиграть. */
export function tttComputerMove(b: Mark[], mark: "X" | "O", rng: Rng = Math.random, blunder = 0.25): number {
  const free = b.flatMap((v, i) => (v ? [] : [i]));
  if (rng() < blunder) return free[Math.floor(rng() * free.length)];
  const other = mark === "X" ? "O" : "X";
  let best = -Infinity, picks: number[] = [];
  for (const i of free) {
    const sc = minimax(b.map((x, j) => (j === i ? mark : x)), other, mark, 1);
    if (sc > best) { best = sc; picks = [i]; } else if (sc === best) picks.push(i);
  }
  return picks[Math.floor(rng() * picks.length)];
}
