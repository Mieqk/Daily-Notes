import { describe, expect, it } from "vitest";
import { adhocTrack, clamp01, neighborId, type PlayerTrack } from "./musicStore";

const t = (id: string, preview: string | null = "p"): PlayerTrack => ({ id, title: id, artist: null, url: null, cover: null, preview });

describe("musicStore", () => {
  const q = [t("a"), t("b", null), t("c"), t("d")];
  it("следующий и предыдущий пропускают треки без превью", () => {
    expect(neighborId(q, "a", 1, false)).toBe("c");
    expect(neighborId(q, "c", -1, false)).toBe("a");
    expect(neighborId(q, "d", 1, false)).toBeNull();
    expect(neighborId(q, "d", 1, true)).toBe("a");
    expect(neighborId(q, "a", -1, true)).toBe("d");
  });
  it("без текущего берёт первый или последний", () => {
    expect(neighborId(q, null, 1, false)).toBe("a");
    expect(neighborId(q, null, -1, false)).toBe("d");
    expect(neighborId([t("x", null)], null, 1, true)).toBeNull();
  });
  it("громкость держится в пределах 0..1", () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(NaN)).toBe(1);
  });
  it("id трека вне плейлиста берётся из превью", () => {
    expect(adhocTrack({ title: "T", artist: null, url: null, cover: null, preview: "https://x/p.m4a" }).id).toBe("pv:https://x/p.m4a");
  });
});
