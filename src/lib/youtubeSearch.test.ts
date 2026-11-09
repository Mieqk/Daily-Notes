import { describe, expect, it } from "vitest";
import { cacheYoutube, cachedYoutube, looksRelevant, parseYoutubeTracks, pickVideoId } from "./youtubeSearch";
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
  it("разбирает результаты поиска YouTube", () => {
    const r = parseYoutubeTracks({ items: [
      { id: { videoId: "dQw4w9WgXcQ" }, snippet: { title: "Song &amp; Dance", channelTitle: "Naturalena - Topic", thumbnails: { medium: { url: "https://i.ytimg.com/vi/x/mqdefault.jpg" } } } },
      { id: { videoId: "bad" }, snippet: { title: "x" } },
    ] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ title: "Song & Dance", artist: "Naturalena", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
  });
  it("понимает, что Apple ничего подходящего не нашёл", () => {
    expect(looksRelevant("naturalena", [{ title: "Эмбиент", artist: "Алина Воробейкина" }])).toBe(false);
    expect(looksRelevant("queen bohemian", [{ title: "Bohemian Rhapsody", artist: "Queen" }])).toBe(true);
  });
});
