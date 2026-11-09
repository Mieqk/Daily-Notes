import { describe, expect, it } from "vitest";
import { cacheYoutube, cachedYoutube, pickVideoId } from "./youtubeSearch";
import { youtubeId } from "./musicEmbed";

describe("youtubeSearch", () => {
  it("берёт первый корректный id из ответа", () => {
    expect(pickVideoId({ items: [{ id: { videoId: "bad" } }, { id: { videoId: "dQw4w9WgXcQ" } }] })).toBe("dQw4w9WgXcQ");
    expect(pickVideoId({ items: [] })).toBeNull();
    expect(pickVideoId(null)).toBeNull();
  });
  it("запоминает найденное видео без учёта регистра", () => {
    cacheYoutube("Song", "Artist", "dQw4w9WgXcQ");
    expect(cachedYoutube("song", "artist")).toBe("dQw4w9WgXcQ");
    expect(cachedYoutube("other", null)).toBeNull();
    cacheYoutube("x", null, "not-an-id");
    expect(cachedYoutube("x", null)).toBeNull();
  });
  it("id видео из ссылки", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
    expect(youtubeId(null)).toBeNull();
  });
});
