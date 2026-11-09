import { describe, expect, it } from "vitest";
import { embedOf } from "./musicEmbed";

describe("embedOf", () => {
  it("Spotify", () => {
    expect(embedOf("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc")?.src).toBe("https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT");
    expect(embedOf("https://open.spotify.com/intl-ru/track/4cOdK2wGLETKBW3PvgPWqT")?.kind).toBe("spotify");
    expect(embedOf("https://open.spotify.com/track/")).toBeNull();
  });
  it("YouTube", () => {
    expect(embedOf("https://youtu.be/HyHNuVaZJ-k")?.src).toContain("/embed/HyHNuVaZJ-k");
    expect(embedOf("https://music.youtube.com/watch?v=HyHNuVaZJ-k&list=x")?.kind).toBe("youtube");
    expect(embedOf("https://www.youtube.com/watch?v=bad")).toBeNull();
  });
  it("Яндекс Музыка", () => {
    expect(embedOf("https://music.yandex.ru/album/123/track/456")?.src).toBe("https://music.yandex.ru/iframe/track/456/123");
    expect(embedOf("https://music.yandex.ru/album/123")).toBeNull();
  });
  it("чужие и небезопасные ссылки без плеера", () => {
    expect(embedOf("https://evil.example/track/1")).toBeNull();
    expect(embedOf("http://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBeNull();
    expect(embedOf(null)).toBeNull();
  });
});
