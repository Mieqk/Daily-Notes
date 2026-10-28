import { describe, expect, it } from "vitest";
import { EMPTY_MEMORY, MAX_FACTS, addFact, memoryForRequest, removeFact, sanitizeMemory } from "./sparkMemory";
import { parseDeepLink } from "./deepLink";

describe("sparkMemory", () => {
  it("по умолчанию выключена и в запрос ничего не уходит", () => {
    expect(EMPTY_MEMORY.on).toBe(false);
    expect(memoryForRequest({ on: false, facts: [{ id: "1", text: "бегаю" }] })).toEqual([]);
    expect(memoryForRequest({ on: true, facts: [{ id: "1", text: "бегаю" }] })).toEqual(["бегаю"]);
  });

  it("добавляет, не пускает пустое и повторы, удаляет", () => {
    let m = addFact({ on: true, facts: [] }, "  Цель:  English ", "a");
    expect(m.facts).toEqual([{ id: "a", text: "Цель: English" }]);
    expect(addFact(m, "цель: english", "b")).toBe(m);
    expect(addFact(m, "   ", "c")).toBe(m);
    m = removeFact(m, "a");
    expect(m.facts).toEqual([]);
  });

  it("не больше лимита, мусор в хранилище превращается в пустую память", () => {
    let m = { on: true, facts: [] as { id: string; text: string }[] };
    for (let i = 0; i < MAX_FACTS + 5; i++) m = addFact(m, `факт ${i}`, String(i));
    expect(m.facts).toHaveLength(MAX_FACTS);
    expect(sanitizeMemory("мусор")).toEqual({ on: false, facts: [] });
    expect(sanitizeMemory({ on: "yes", facts: [{ text: "x" }] }).on).toBe(false);
  });
});

describe("parseDeepLink", () => {
  it("понимает известные разделы и подвкладку «Хобби»", () => {
    expect(parseDeepLink("?tab=plan")).toEqual({ "dn.tab": '"plan"' });
    expect(parseDeepLink("?tab=hobby&sub=ai")).toEqual({ "dn.tab": '"hobby"', "dn.hobbyTab": '"ai"' });
  });
  it("игнорирует неизвестное", () => {
    expect(parseDeepLink("?tab=evil")).toEqual({});
    expect(parseDeepLink("?sub=ai")).toEqual({});
    expect(parseDeepLink("")).toEqual({});
  });
});
