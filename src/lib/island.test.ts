// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { islandActivity, islandAvailable, islandClear, islandNotify } from "./island";

type W = { dailyNotesDesktop?: { island?: { notify: unknown; activity: unknown } } };
const w = () => window as unknown as W;

describe("мост к острову Atoll", () => {
  afterEach(() => { delete w().dailyNotesDesktop; localStorage.clear(); });

  it("без моста (браузер, телефон) ничего не делает и не падает", () => {
    expect(islandAvailable()).toBe(false);
    expect(() => { islandNotify("a", "b"); islandActivity("x", {}); islandClear("x"); }).not.toThrow();
  });

  it("передаёт уведомление и активности в мост приложения", () => {
    const notify = vi.fn().mockResolvedValue(true);
    const activity = vi.fn().mockResolvedValue(true);
    w().dailyNotesDesktop = { island: { notify, activity } };
    expect(islandAvailable()).toBe(true);

    islandNotify("Пора", "Запишите день", "https://example.test/?tab=daily");
    expect(notify).toHaveBeenCalledWith({ title: "Пора", text: "Запишите день", url: "https://example.test/?tab=daily" });

    islandActivity("tasks", { text: "Задачи 3/5", progress: 0.6 });
    expect(activity).toHaveBeenCalledWith({ id: "tasks", text: "Задачи 3/5", progress: 0.6 });

    islandClear("tasks");
    expect(activity).toHaveBeenLastCalledWith({ id: "tasks", clear: true });
  });

  it("выключатель dn.island = 0 отключает мост", () => {
    const notify = vi.fn().mockResolvedValue(true);
    w().dailyNotesDesktop = { island: { notify, activity: vi.fn() } };
    localStorage.setItem("dn.island", "0");
    expect(islandAvailable()).toBe(false);
    islandNotify("a", "b");
    expect(notify).not.toHaveBeenCalled();
  });

  it("ошибка моста не ломает приложение", async () => {
    w().dailyNotesDesktop = { island: { notify: vi.fn().mockRejectedValue(new Error("нет острова")), activity: vi.fn() } };
    expect(() => islandNotify("a", "b")).not.toThrow();
    await Promise.resolve();
  });
});
