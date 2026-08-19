import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Lang, TKey } from "../i18n";
import { MOODS, localeOf } from "../i18n";
import type { Task } from "../store";
import { countWords, fromISO, shiftISO, todayISO, uid } from "../store";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  MoodFace,
  PlusIcon,
  TrashIcon,
} from "../icons";

interface DailyViewProps {
  date: string;
  onDate: (iso: string) => void;
  notes: Record<string, string>;
  setNotes: Dispatch<SetStateAction<Record<string, string>>>;
  tasks: Record<string, Task[]>;
  setTasks: Dispatch<SetStateAction<Record<string, Task[]>>>;
  moods: Record<string, number>;
  setMoods: Dispatch<SetStateAction<Record<string, number>>>;
  lang: Lang;
  t: (k: TKey) => string;
}

type SaveStatus = "idle" | "saving" | "saved";

export default function DailyView({
  date,
  onDate,
  notes,
  setNotes,
  tasks,
  setTasks,
  moods,
  setMoods,
  lang,
  t,
}: DailyViewProps) {
  const [taskInput, setTaskInput] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timers = useRef<number[]>([]);

  const isToday = date === todayISO();
  const locale = localeOf(lang);
  const d = fromISO(date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d);
  const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);

  const text = notes[date] ?? "";
  const words = countWords(text);
  const mood = moods[date];

  const dayTasks = tasks[date] ?? [];
  const doneCount = dayTasks.filter((x) => x.done).length;
  const pct = dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0;

  useEffect(() => {
    setStatus("idle");
    setTaskInput("");
  }, [date]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const onText = (value: string) => {
    setNotes((prev) => ({ ...prev, [date]: value }));
    setStatus("saving");
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [
      window.setTimeout(() => setStatus("saved"), 650),
      window.setTimeout(() => setStatus("idle"), 3200),
    ];
  };

  const addTask = () => {
    const value = taskInput.trim();
    if (!value) return;
    setTasks((prev) => ({
      ...prev,
      [date]: [...(prev[date] ?? []), { id: uid(), text: value, done: false }],
    }));
    setTaskInput("");
  };

  const toggleTask = (id: string) =>
    setTasks((prev) => ({
      ...prev,
      [date]: (prev[date] ?? []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    }));

  const removeTask = (id: string) =>
    setTasks((prev) => ({
      ...prev,
      [date]: (prev[date] ?? []).filter((x) => x.id !== id),
    }));

  const navBtn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-soft)] transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* ============ Left: date + editor ============ */}
      <div className="flex min-w-0 flex-col gap-5">
        {/* Date header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-5">
            <span className="font-display text-[72px] font-bold leading-[0.85] tracking-tight sm:text-[92px]">
              {d.getDate()}
              <span className="text-[var(--accent)]">.</span>
            </span>
            <span className="pb-1.5">
              <span className="font-display block text-xl font-semibold capitalize leading-tight sm:text-2xl">
                {weekday}
              </span>
              <span className="mt-1 block text-sm text-[var(--ink-soft)]">{monthYear}</span>
              {isToday && (
                <span className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-deep)]">
                  {t("todayBadge")}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                onClick={() => onDate(todayISO())}
                className="h-10 rounded-xl border border-[var(--accent)] px-3.5 text-sm font-semibold text-[var(--accent)] transition-all duration-200 hover:bg-[var(--accent-soft)] active:scale-95"
              >
                {t("btnToday")}
              </button>
            )}
            <button onClick={() => onDate(shiftISO(date, -1))} className={navBtn} aria-label="prev day">
              <ArrowLeftIcon className="h-4.5 w-4.5" />
            </button>
            <button onClick={() => onDate(shiftISO(date, 1))} className={navBtn} aria-label="next day">
              <ArrowRightIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Editor card */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-shadow duration-300 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-soft)] sm:p-6">
          {/* Mood */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-[var(--ink-soft)]">{t("mood")}</span>
            <div className="flex items-center gap-1.5">
              {MOODS[lang].map((label, i) => {
                const active = mood === i;
                return (
                  <button
                    key={label}
                    title={label}
                    onClick={() => setMoods((prev) => ({ ...prev, [date]: i }))}
                    className={`grid h-10 w-10 place-items-center rounded-xl border transition-all duration-200 ${
                      active
                        ? "scale-110 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                        : "border-[var(--line)] text-[var(--ink-faint)] hover:-translate-y-0.5 hover:border-[var(--ink-faint)] hover:text-[var(--accent)]"
                    }`}
                    style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
                  >
                    <MoodFace level={i} className="h-6 w-6" />
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder={t("placeholder")}
            spellCheck={false}
            className="min-h-[320px] w-full resize-y bg-transparent text-[16px] leading-[1.75] outline-none placeholder:text-[var(--ink-faint)]"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3.5">
            <span className="text-xs text-[var(--ink-faint)]">
              {words} {t("words")} · {text.length} {t("chars")}
            </span>
            {status === "saving" && (
              <span className="flex items-center gap-2 text-xs font-medium text-[var(--ink-soft)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                {t("saving")}
              </span>
            )}
            {status === "saved" && (
              <span className="animate-fadein flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <CheckIcon className="animate-checkpop h-2.5 w-2.5" />
                </span>
                {t("saved")}
              </span>
            )}
            {status === "idle" && (
              <span className="text-xs text-[var(--ink-faint)]">{t("autosave")}</span>
            )}
          </div>
        </div>
      </div>

      {/* ============ Right: tasks + summary ============ */}
      <div className="flex flex-col gap-5">
        {/* Tasks */}
        <div
          className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-[15px] font-bold">{t("tasksTitle")}</h3>
            <span className="rounded-full bg-[var(--hover)] px-2.5 py-1 text-xs font-bold text-[var(--ink-soft)]">
              {doneCount}/{dayTasks.length}
            </span>
          </div>

          <div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--hover)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 text-right text-[11px] font-medium text-[var(--ink-faint)]">
              {pct}% {t("doneLabel")}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder={t("taskPlaceholder")}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 text-sm outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
            />
            <button
              onClick={addTask}
              disabled={!taskInput.trim()}
              aria-label="add task"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] transition-all duration-200 hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {dayTasks.length === 0 ? (
            <p className="py-5 text-center text-sm text-[var(--ink-faint)]">{t("tasksEmpty")}</p>
          ) : (
            <ul className="-mr-1 flex max-h-[300px] flex-col gap-1 overflow-y-auto pr-1">
              {dayTasks.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--hover)]"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label="toggle task"
                    className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 transition-all duration-200 ${
                      task.done
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "border-[var(--line)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {task.done && <CheckIcon className="animate-checkpop h-3 w-3" />}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-sm leading-snug transition-all duration-200 ${
                      task.done ? "text-[var(--ink-faint)] line-through" : ""
                    }`}
                  >
                    {task.text}
                  </span>
                  <button
                    onClick={() => removeTask(task.id)}
                    aria-label="remove task"
                    className="shrink-0 rounded-md p-1.5 text-[var(--ink-faint)] opacity-0 transition-all duration-150 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Day summary */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h3 className="font-display text-[15px] font-bold">{t("summaryTitle")}</h3>
          <dl className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-[var(--ink-faint)]">{t("summaryMood")}</dt>
              <dd className="flex items-center gap-2 font-semibold">
                {mood !== undefined ? (
                  <>
                    <MoodFace level={mood} className="h-5 w-5 text-[var(--accent)]" />
                    {MOODS[lang][mood]}
                  </>
                ) : (
                  <span className="font-normal text-[var(--ink-faint)]">—</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-[var(--ink-faint)]">{t("summaryTasks")}</dt>
              <dd className="font-semibold">
                {dayTasks.length === 0 ? (
                  <span className="font-normal text-[var(--ink-faint)]">—</span>
                ) : (
                  <>
                    {doneCount} {t("ofWord")} {dayTasks.length}
                  </>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-[var(--ink-faint)]">{t("summaryText")}</dt>
              <dd className="font-semibold">
                {words === 0 ? (
                  <span className="font-normal text-[var(--ink-faint)]">—</span>
                ) : (
                  <>
                    {words} {t("words")} · ~{Math.max(1, Math.round(words / 180))} {t("readMin")}
                  </>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
