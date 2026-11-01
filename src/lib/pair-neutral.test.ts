import { describe, expect, it } from "vitest";
import { makePair } from "../pair-strings";
import { makeTogether } from "../pair-together-strings";
import { makeHub } from "../pair-hub-strings";

describe("нейтральные формулировки «Парного»", () => {
  it("для любимого человека остаются прежние строки", () => {
    expect(makeTogether("ru", "love")("title")).toBe("Вдвоём");
    expect(makePair("ru", "love")("emptyTitle")).toBe("Здесь будет сон вашей пары");
    expect(makeTogether("ru")("title")).toBe("Вдвоём");
  });
  it("для друга, семьи и близкого друга нет слов про пару", () => {
    for (const kind of ["friend", "family", "bestie"]) {
      expect(makeTogether("ru", kind)("title")).toBe("Вместе");
      expect(makePair("ru", kind)("emptyTitle")).not.toMatch(/пар/i);
      expect(makeTogether("ru", kind)("eEmpty")).not.toMatch(/годовщин/i);
      expect(makeHub("ru", kind)("pick")).toBe("Выбрать человека");
    }
  });
  it("остальные строки не меняются", () => {
    expect(makeTogether("en", "friend")("goodnight")).toBe("Good night");
  });
});
