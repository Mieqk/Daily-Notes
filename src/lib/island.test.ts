// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyIslandActions, islandActivity, islandAvailable, islandClear, islandNotify, islandSyncTasks, islandTasksLinked } from "./island";

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

describe("общий список задач с островом", () => {
  afterEach(() => { delete w().dailyNotesDesktop; localStorage.clear(); });

  const tasks = [{ id: "a", text: "Зарядка", done: false }, { id: "b", text: "Отчёт", done: true }];

  it("отправляет задачи дня и возвращает действия с острова", async () => {
    const syncTasks = vi.fn().mockResolvedValue([{ type: "toggle", id: "a", text: "", done: true }]);
    (w() as any).dailyNotesDesktop = { island: { notify: vi.fn(), activity: vi.fn(), syncTasks } };

    const actions = await islandSyncTasks("2026-03-10", [{ ...tasks[0], extra: 1 } as any, tasks[1]]);
    expect(syncTasks).toHaveBeenCalledWith({ day: "2026-03-10", tasks });   // только id, text, done
    expect(actions).toEqual([{ type: "toggle", id: "a", text: "", done: true }]);
    expect(islandTasksLinked()).toBe(true);
  });

  it("старое приложение (нет syncTasks), ошибка или null: связи нет", async () => {
    (w() as any).dailyNotesDesktop = { island: { notify: vi.fn(), activity: vi.fn() } };
    expect(await islandSyncTasks("2026-03-10", tasks)).toBeNull();
    expect(islandTasksLinked()).toBe(false);

    (w() as any).dailyNotesDesktop = { island: { notify: vi.fn(), activity: vi.fn(), syncTasks: vi.fn().mockRejectedValue(new Error("x")) } };
    expect(await islandSyncTasks("2026-03-10", tasks)).toBeNull();

    (w() as any).dailyNotesDesktop = { island: { notify: vi.fn(), activity: vi.fn(), syncTasks: vi.fn().mockResolvedValue(null) } };
    expect(await islandSyncTasks("2026-03-10", tasks)).toBeNull();
    expect(islandTasksLinked()).toBe(false);
  });

  it("пустой список действий — связь есть, менять нечего", async () => {
    (w() as any).dailyNotesDesktop = { island: { notify: vi.fn(), activity: vi.fn(), syncTasks: vi.fn().mockResolvedValue([]) } };
    expect(await islandSyncTasks("2026-03-10", tasks)).toEqual([]);
    expect(islandTasksLinked()).toBe(true);
  });

  it("применяет отметку и новую задачу", () => {
    const next = applyIslandActions(tasks, [
      { type: "toggle", id: "a", text: "", done: true },
      { type: "add", id: "tmp", text: "  Купить хлеб  ", done: false },
    ], () => "new-id");
    expect(next).toEqual([
      { id: "a", text: "Зарядка", done: true },
      { id: "b", text: "Отчёт", done: true },
      { id: "new-id", text: "Купить хлеб", done: false },
    ]);
    expect(tasks[0].done).toBe(false);   // исходный список не тронут
  });

  it("если менять нечего, возвращает тот же список", () => {
    const same = applyIslandActions(tasks, [
      { type: "toggle", id: "b", text: "", done: true },        // уже отмечена
      { type: "toggle", id: "нет такой", text: "", done: true },
      { type: "add", id: "tmp", text: "   ", done: false },      // пустая
    ], () => "new-id");
    expect(same).toBe(tasks);
  });
});
