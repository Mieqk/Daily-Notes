import { describe, expect, it } from "vitest";
import { base64url, pkceChallenge, randomString, toFound } from "./spotify";

describe("spotify", () => {
  it("PKCE: пример из RFC 7636", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("base64url без спецсимволов", () => {
    expect(base64url(new Uint8Array([251, 255, 254]))).toBe("-__-");
    expect(randomString(96)).toMatch(/^[A-Za-z0-9_-]{96}$/);
  });
  it("переводит трек Spotify в наш формат", () => {
    const t = toFound({ id: "1", name: " Natural ", type: "track", artists: [{ name: "Imagine Dragons" }, { name: "X" }], album: { images: [{ url: "big", width: 640 }, { url: "mid", width: 300 }, { url: "small", width: 64 }] }, external_urls: { spotify: "https://open.spotify.com/track/1" } });
    expect(t).toEqual({ title: "Natural", artist: "Imagine Dragons, X", url: "https://open.spotify.com/track/1", cover: "mid", preview: null });
  });
  it("пропускает локальные файлы, подкасты и пустое", () => {
    expect(toFound({ name: "a", is_local: true })).toBeNull();
    expect(toFound({ name: "a", type: "episode" })).toBeNull();
    expect(toFound({ name: " " })).toBeNull();
    expect(toFound(null)).toBeNull();
  });
});
