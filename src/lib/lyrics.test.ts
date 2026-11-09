import { describe, expect, it } from "vitest";
import { activeLine, cleanTitle, cyrillicShare, parseLrc, pickBest, toLyrics } from "./lyrics";

describe("lyrics", () => {
  const lrc = "[00:10.50] one\n[00:20.00] two\n[00:05.00][01:00.00] hi\ngarbage\n[ar:x]";
  it("парсит LRC и сортирует", () => {
    const l = parseLrc(lrc);
    expect(l.map((x) => x.text)).toEqual(["hi", "one", "two", "hi"]);
    expect(l[1].t).toBeCloseTo(10.5);
    expect(l[3].t).toBe(60);
  });
  it("находит активную строку", () => {
    const l = parseLrc(lrc);
    expect(activeLine(l, 0)).toBe(-1);
    expect(activeLine(l, 5)).toBe(0);
    expect(activeLine(l, 15)).toBe(1);
    expect(activeLine(l, 999)).toBe(3);
  });
  it("toLyrics: пусто и инструментал", () => {
    expect(toLyrics(null)).toBeNull();
    expect(toLyrics({ instrumental: true, plainLyrics: "x" })).toBeNull();
    expect(toLyrics({ plainLyrics: "a\nb" })?.synced).toBeNull();
    expect(toLyrics({ syncedLyrics: "[00:01.00] a" })?.synced).toHaveLength(1);
  });
  it("чистит название", () => {
    expect(cleanTitle("Song (feat. X)")).toBe("Song");
    expect(cleanTitle("Song - Remastered 2011")).toBe("Song");
    expect(cleanTitle("Song")).toBe("Song");
  });
  it("доля кириллицы", () => {
    expect(cyrillicShare("Кино")).toBe(1);
    expect(cyrillicShare("Kino")).toBe(0);
    expect(cyrillicShare("123")).toBe(0);
  });
  it("для русской песни выбирает кириллический текст, а не транслит", () => {
    const list = [
      { id: 1, duration: 177, syncedLyrics: "[00:01.00] Zvezda po imeni Solntse" },
      { id: 2, duration: 177, syncedLyrics: "[00:01.00] Звезда по имени Солнце" },
    ];
    expect(pickBest(list, { title: "Звезда по имени Солнце", artist: "Кино", dur: 177 })?.id).toBe(2);
  });
  it("учитывает длину трека", () => {
    const list = [
      { id: 1, duration: 240, syncedLyrics: "[00:01.00] a" },
      { id: 2, duration: 180, syncedLyrics: "[00:01.00] a" },
    ];
    expect(pickBest(list, { title: "Song", artist: "X", dur: 181 })?.id).toBe(2);
  });
  it("пропускает инструментал и пустые", () => {
    expect(pickBest([{ id: 1, instrumental: true, plainLyrics: "x" }, { id: 2 }], { title: "a", artist: null, dur: null })).toBeNull();
  });
});
