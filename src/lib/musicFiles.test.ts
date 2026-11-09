import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, checkMusicFile, isOwnFileUrl, titleFromFilename } from "./musicFiles";

describe("musicFiles", () => {
  it("проверяет тип и размер файла", () => {
    expect(checkMusicFile({ name: "a.mp3", type: "audio/mpeg", size: 1000 })).toBe("ok");
    expect(checkMusicFile({ name: "a.flac", type: "", size: 1000 })).toBe("ok");
    expect(checkMusicFile({ name: "a.pdf", type: "application/pdf", size: 10 })).toBe("notAudio");
    expect(checkMusicFile({ name: "a.mp3", type: "audio/mpeg", size: MAX_FILE_BYTES + 1 })).toBe("tooBig");
  });
  it("название и исполнитель из имени файла", () => {
    expect(titleFromFilename("Queen - Bohemian Rhapsody.mp3")).toEqual({ artist: "Queen", title: "Bohemian Rhapsody" });
    expect(titleFromFilename("my_song.m4a")).toEqual({ artist: null, title: "my song" });
    expect(titleFromFilename(".mp3").title).toBe("Track");
  });
  it("узнаёт ссылку на наш файл", () => {
    expect(isOwnFileUrl("https://x.supabase.co/storage/v1/object/sign/music-files/u/a.mp3?token=1")).toBe(true);
    expect(isOwnFileUrl("https://audio-ssl.itunes.apple.com/a.m4a")).toBe(false);
    expect(isOwnFileUrl(null)).toBe(false);
  });
});
