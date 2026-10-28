import { afterEach, describe, expect, it, vi } from "vitest";
import { applyDeepLink } from "./deepLink";

function setup(search: string) {
  const store: Record<string, string> = {};
  const replaced: string[] = [];
  vi.stubGlobal("localStorage", { setItem: (k: string, v: string) => { store[k] = v; } });
  vi.stubGlobal("window", {
    location: { search, pathname: "/", hash: "" },
    history: { replaceState: (_a: unknown, _b: unknown, url: string) => replaced.push(url) },
  });
  return { store, replaced };
}

afterEach(() => vi.unstubAllGlobals());

describe("applyDeepLink", () => {
  it("открывает раздел и убирает только свои параметры", () => {
    const { store, replaced } = setup("?tab=plan&gcal=connected");
    applyDeepLink();
    expect(store["dn.tab"]).toBe('"plan"');
    expect(replaced).toEqual(["/?gcal=connected"]);
  });

  it("не трогает чужие параметры, если своих нет", () => {
    const { store, replaced } = setup("?gcal=connected");
    applyDeepLink();
    expect(store).toEqual({});
    expect(replaced).toEqual([]);
  });
});
