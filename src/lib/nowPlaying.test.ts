import { describe, expect, it } from "vitest";
import { cleanMusic, isLive, nowPlayingOf, safeMusicUrl } from "./nowPlaying";

describe("nowPlaying", () => {
  it("пропускает только https-ссылки известных сервисов", () => {
    expect(safeMusicUrl("https://open.spotify.com/track/abc")).toContain("open.spotify.com");
    expect(safeMusicUrl("https://music.yandex.ru/album/1/track/2")).not.toBeNull();
    expect(safeMusicUrl("http://open.spotify.com/track/abc")).toBeNull();
    expect(safeMusicUrl("https://evil.example/spotify.com")).toBeNull();
    expect(safeMusicUrl("https://notspotify.com/x")).toBeNull();
    expect(safeMusicUrl("javascript:alert(1)")).toBeNull();
    expect(safeMusicUrl("")).toBeNull();
  });
  it("чистит ввод", () => {
    expect(cleanMusic("  ", "x", "")).toBeNull();
    expect(cleanMusic(" Feel Good Inc. ", " Gorillaz ", "bad")).toEqual({ title: "Feel Good Inc.", artist: "Gorillaz", url: null });
    expect(cleanMusic("A", "", "")?.artist).toBeNull();
  });
  it("различает «сейчас» и «недавно»", () => {
    const now = Date.parse("2026-11-09T12:00:00Z");
    expect(isLive("2026-11-09T11:55:00Z", now)).toBe(true);
    expect(isLive("2026-11-09T11:30:00Z", now)).toBe(false);
    expect(isLive(null, now)).toBe(false);
  });
  it("читает колонки профиля", () => {
    expect(nowPlayingOf({ music_title: null })).toBeNull();
    expect(nowPlayingOf({ music_title: "T", music_artist: " ", music_at: "x" })).toEqual({ title: "T", artist: null, url: null, at: "x" });
  });
});
