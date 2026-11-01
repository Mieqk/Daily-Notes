import { describe, expect, it } from "vitest";
import { filterFriends, toggleFav } from "./friendsFilter";
import { BREATH_PATTERNS, cycleLength, phaseAt } from "./breathing";

const L = [
  { id: "a", n: "Борис", on: false },
  { id: "b", n: "Анна", on: true },
  { id: "c", n: "Вера", on: false },
  { id: "d", n: "Глеб", on: true },
];
const o = { id: (x: typeof L[0]) => x.id, name: (x: typeof L[0]) => x.n, online: (x: typeof L[0]) => x.on };

describe("filterFriends", () => {
  it("сортирует: избранные, затем в сети, затем по алфавиту", () => {
    const r = filterFriends(L, { ...o, q: "", filter: "all", favs: ["c"] });
    expect(r.map((x) => x.id)).toEqual(["c", "b", "d", "a"]);
  });
  it("фильтрует по сети и избранным", () => {
    expect(filterFriends(L, { ...o, q: "", filter: "online", favs: [] }).map((x) => x.id)).toEqual(["b", "d"]);
    expect(filterFriends(L, { ...o, q: "", filter: "fav", favs: ["a", "d"] }).map((x) => x.id)).toEqual(["d", "a"]);
  });
  it("ищет без учёта регистра", () => {
    expect(filterFriends(L, { ...o, q: " ГЛ ", filter: "all", favs: [] }).map((x) => x.id)).toEqual(["d"]);
  });
  it("toggleFav добавляет и убирает", () => {
    expect(toggleFav([], "x")).toEqual(["x"]);
    expect(toggleFav(["x", "y"], "x")).toEqual(["y"]);
  });
});

describe("phaseAt", () => {
  const box = BREATH_PATTERNS[0];
  it("идёт по фазам и кругам", () => {
    expect(cycleLength(box)).toBe(16);
    expect(phaseAt(box, 0)).toEqual({ phase: "in", left: 4, cycle: 0 });
    expect(phaseAt(box, 5)).toEqual({ phase: "hold", left: 3, cycle: 0 });
    expect(phaseAt(box, 8)).toEqual({ phase: "out", left: 4, cycle: 0 });
    expect(phaseAt(box, 16).cycle).toBe(1);
  });
});
