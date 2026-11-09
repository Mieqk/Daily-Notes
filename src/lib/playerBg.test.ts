import { describe, expect, it } from "vitest";
import { checkBgFile, DEFAULT_BG, parsePrefs } from "./playerBg";

describe("playerBg", () => {
  it("разбирает настройки и чинит мусор", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_BG);
    expect(parsePrefs("{oops")).toEqual(DEFAULT_BG);
    expect(parsePrefs('{"mode":"color","color":"#112233"}').color).toBe("#112233");
    expect(parsePrefs('{"mode":"color","color":"red"}').color).toBe(DEFAULT_BG.color);
  });
  it("режим file без файла возвращается к обложке", () => {
    expect(parsePrefs('{"mode":"file"}').mode).toBe("cover");
    expect(parsePrefs('{"mode":"file","fileKind":"video"}').mode).toBe("file");
  });
  it("проверяет файлы", () => {
    expect(checkBgFile({ type: "image/gif", size: 1000 })).toEqual({ ok: true, kind: "image" });
    expect(checkBgFile({ type: "video/mp4", size: 1000 })).toEqual({ ok: true, kind: "video" });
    expect(checkBgFile({ type: "video/mp4", size: 99 * 1024 * 1024 })).toEqual({ ok: false, reason: "size" });
    expect(checkBgFile({ type: "audio/mp3", size: 10 })).toEqual({ ok: false, reason: "type" });
  });
});
