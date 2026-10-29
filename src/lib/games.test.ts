import { describe, expect, it } from "vitest";
import {
  addTile2048, canMove2048, cleanBests, countAround, isRecord, makeDeck, move2048, newBoard2048, newSnake,
  placeMines, revealCells, slideLine, stepSnake, minesWon, type SnakeState,
} from "./games";

const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe("2048", () => {
  it("сливает пары и не сливает повторно за один ход", () => {
    expect(slideLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], gained: 8 });
    expect(slideLine([2, 2, 4, 0])).toEqual({ line: [4, 4, 0, 0], gained: 4 });
    expect(slideLine([0, 2, 0, 2])).toEqual({ line: [4, 0, 0, 0], gained: 4 });
    expect(slideLine([4, 2, 2, 0]).line).toEqual([4, 4, 0, 0]);
  });
  it("двигает в каждую сторону", () => {
    const b = [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(move2048(b, "left").board.slice(0, 4)).toEqual([4, 0, 0, 0]);
    expect(move2048(b, "right").board.slice(0, 4)).toEqual([0, 0, 0, 4]);
    expect(move2048(b, "down").board[12]).toBe(2);
    expect(move2048(b, "up").moved).toBe(false);
  });
  it("добавляет плитку только в пустую клетку", () => {
    const full = Array(16).fill(2);
    expect(addTile2048(full)).toBe(full);
    const b = Array(16).fill(2); b[5] = 0;
    expect(addTile2048(b, seq(0, 0))[5]).toBe(2);
    expect(addTile2048(b, seq(0, 0.95))[5]).toBe(4);
  });
  it("новая доска начинается с двух плиток", () => {
    expect(newBoard2048().filter((v) => v > 0)).toHaveLength(2);
  });
  it("видит конец игры", () => {
    const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(canMove2048(stuck)).toBe(false);
    stuck[15] = 2; stuck[14] = 2;
    expect(canMove2048(stuck)).toBe(true);
  });
});

describe("память", () => {
  it("в колоде каждая карта дважды", () => {
    const deck = makeDeck(6);
    expect(deck).toHaveLength(12);
    for (let n = 0; n < 6; n++) expect(deck.filter((v) => v === n)).toHaveLength(2);
  });
});

describe("змейка", () => {
  const base = (over: Partial<SnakeState> = {}): SnakeState => ({
    w: 5, h: 5, snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }], dir: "right", food: { x: 4, y: 4 }, alive: true, score: 0, ...over,
  });
  it("идёт вперёд и тянет хвост", () => {
    const s = stepSnake(base(), "right");
    expect(s.snake).toEqual([{ x: 3, y: 2 }, { x: 2, y: 2 }]);
  });
  it("игнорирует разворот на 180°", () => {
    expect(stepSnake(base(), "left").dir).toBe("right");
  });
  it("растёт и считает очки, еда появляется в свободной клетке", () => {
    const s = stepSnake(base({ food: { x: 3, y: 2 } }), "right", () => 0);
    expect(s.score).toBe(1);
    expect(s.snake).toHaveLength(3);
    expect(s.snake.some((p) => p.x === s.food?.x && p.y === s.food?.y)).toBe(false);
  });
  it("стена и хвост заканчивают игру", () => {
    expect(stepSnake(base({ snake: [{ x: 4, y: 2 }, { x: 3, y: 2 }] }), "right").alive).toBe(false);
    const loop = base({ snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 }], dir: "up" });
    expect(stepSnake(loop, "left").alive).toBe(false);
  });
  it("может зайти в клетку, которую хвост освобождает в этот же ход", () => {
    const sq = base({ snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }], dir: "up" });
    expect(stepSnake(sq, "left").alive).toBe(true);
  });
  it("стартовая змейка живая", () => {
    const s = newSnake();
    expect(s.alive).toBe(true);
    expect(s.food).not.toBeNull();
  });
});

describe("сапёр", () => {
  it("мины ставятся мимо первой клетки и её соседей", () => {
    for (let n = 0; n < 20; n++) {
      const mines = placeMines(9, 9, 10, 40);
      expect(mines.filter(Boolean)).toHaveLength(10);
      for (const i of [40, 30, 31, 32, 39, 41, 48, 49, 50]) expect(mines[i]).toBe(false);
    }
  });
  it("считает мины вокруг", () => {
    const mines = Array(9).fill(false); mines[0] = true; mines[2] = true;
    expect(countAround(mines, 1, 3, 3)).toBe(2);
    expect(countAround(mines, 8, 3, 3)).toBe(0);
  });
  it("пустая клетка раскрывает область, флажок и мину не трогает", () => {
    const mines = Array(25).fill(false); mines[24] = true;
    const flags = Array(25).fill(false);
    const open = revealCells(mines, Array(25).fill(false), flags, 0, 5, 5);
    expect(open[0]).toBe(true);
    expect(open[24]).toBe(false);
    expect(open[18]).toBe(true); // соседи пустых клеток раскрыты
    flags[10] = true;
    expect(revealCells(mines, Array(25).fill(false), flags, 10, 5, 5)[10]).toBe(false);
  });
  it("победа, когда открыто всё без мин", () => {
    const mines = [true, false, false];
    expect(minesWon(mines, [false, true, false])).toBe(false);
    expect(minesWon(mines, [false, true, true])).toBe(true);
  });
});

describe("рекорды", () => {
  it("больше — лучше для очков, меньше — для времени", () => {
    expect(isRecord("g2048", 100, 200)).toBe(true);
    expect(isRecord("g2048", 100, 50)).toBe(false);
    expect(isRecord("reaction", 300, 250)).toBe(true);
    expect(isRecord("mines", undefined, 90)).toBe(true);
    expect(isRecord("snake", undefined, 0)).toBe(false);
  });
  it("чистит мусор из хранилища", () => {
    expect(cleanBests({ g2048: 512, snake: "x", foo: 3, memory: -1 })).toEqual({ g2048: 512 });
    expect(cleanBests(null)).toEqual({});
  });
});
