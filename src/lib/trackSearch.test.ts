import { describe, expect, it } from "vitest";
import { bestMatch, bigArt, parseItunes, safeCoverUrl, safePreviewUrl, type FoundTrack } from "./trackSearch";

describe("trackSearch", () => {
  it("разбирает ответ и отбрасывает лишнее", () => {
    const out = parseItunes({ results: [
      { trackName: "Natural", artistName: "Imagine Dragons", artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg", previewUrl: "https://audio-ssl.itunes.apple.com/p.m4a", trackViewUrl: "https://music.apple.com/us/album/x" },
      { trackName: "natural", artistName: "imagine dragons" },
      { trackName: "Evil", artistName: "X", artworkUrl100: "https://evil.example/a.jpg", previewUrl: "http://audio-ssl.itunes.apple.com/p.m4a" },
      { artistName: "no title" },
    ] });
    expect(out).toHaveLength(2);
    expect(out[0].cover).toBe("https://is1-ssl.mzstatic.com/image/thumb/x/300x300bb.jpg");
    expect(out[0].preview).toContain("audio-ssl.itunes.apple.com");
    expect(out[1]).toMatchObject({ title: "Evil", cover: null, preview: null });
  });
  it("мусор на входе не ломает", () => {
    expect(parseItunes(null)).toEqual([]);
    expect(parseItunes({ results: "x" })).toEqual([]);
  });
  it("проверяет хосты", () => {
    expect(safeCoverUrl("https://i.ytimg.com/vi/abc/hqdefault.jpg")).not.toBeNull();
    expect(safeCoverUrl("https://notmzstatic.com/a.jpg")).toBeNull();
    expect(safePreviewUrl("https://evil.example/a.m4a")).toBeNull();
  });
  it("увеличивает обложку", () => {
    expect(bigArt("https://a.mzstatic.com/100x100bb.jpg")).toBe("https://a.mzstatic.com/300x300bb.jpg");
  });
  it("подбирает только точное совпадение", () => {
    const f = (title: string, artist: string): FoundTrack => ({ title, artist, url: null, cover: "c", preview: "p" });
    const list = [f("Natural (Live)", "Imagine Dragons"), f("Natural Woman", "Aretha"), f("Natural", "Imagine Dragons")];
    expect(bestMatch(list, "natural", "Imagine Dragons")).toBe(list[0]);
    expect(bestMatch(list, "Natural", "Aretha")).toBeNull();
    expect(bestMatch(list, "Natural", null)).toBe(list[0]);
    expect(bestMatch(list, "Other", null)).toBeNull();
    expect(bestMatch([], "x", null)).toBeNull();
  });
});
