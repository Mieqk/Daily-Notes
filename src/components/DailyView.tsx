import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang, TKey } from "../i18n";
import { MOODS, TEMPLATES, localeOf } from "../i18n";
import type { Task, WritingFontId, SleepData } from "../store";
import {
  FONT_STACKS,
  countWords,
  fileToDataURL,
  fromISO,
  readingMinutes,
  shiftISO,
  todayISO,
} from "../store";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BellIcon,
  BriefcaseIcon,
  BrushIcon,
  CheckIcon,
  ImageIcon,
  LeafIcon,
  MicIcon,
  MoodVisual,
  PenIcon,
  PlusIcon,
  PrinterIcon,
  TagIcon,
  TrashIcon,
} from "../icons";

export interface Reminder {
  time: string;
  enabled: boolean;
}

interface DailyViewProps {
  date: string;
  onDate: (iso: string) => void;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  tasks: Record<string, Task[]>;
  setTasks: React.Dispatch<React.SetStateAction<Record<string, Task[]>>>;
  moods: Record<string, number>;
  setMoods: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  tags: Record<string, string[]>;
  setTags: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  photos: Record<string, string[]>;
  setPhotos: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  reminder: Reminder;
  setReminder: React.Dispatch<React.SetStateAction<Reminder>>;
  moodEmoji: string[];
  writingFont: WritingFontId;
  lang: Lang;
  t: (k: TKey) => string;
  showToast: (msg: string) => void;
}

const TPL_ICONS = [BriefcaseIcon, LeafIcon, BrushIcon];

export default function DailyView(props: DailyViewProps) {
  const {
    date,
    onDate,
    notes,
    setNotes,
    tasks,
    setTasks,
    moods,
    setMoods,
    tags,
    setTags,
    photos,
    setPhotos,
    reminder,
    setReminder,
    moodEmoji,
    writingFont,
    lang,
    t,
    showToast,
  } = props;

  const locale = localeOf(lang);
  const isToday = date === todayISO();
  const value = notes[date] ?? "";
  const dayTasks = tasks[date] ?? [];
  const dayTags = tags[date] ?? [];
  const dayPhotos = photos[date] ?? [];
  const done = dayTasks.filter((x) => x.done).length;
  const pct = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;

  const [taskInput, setTaskInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [listening, setListening] = useState(false);
  const [appliedTpl, setAppliedTpl] = useState<string | null>(null);
  const statusTimer = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => () => window.clearTimeout(statusTimer.current), []);
  useEffect(() => () => recRef.current?.stop(), []);

  const dateObj = fromISO(date);
  const dateLong = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(dateObj);
  const dateShort = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(dateObj);

  const bumpStatus = () => {
    setStatus("saving");
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus("saved"), 600);
  };

  const setText = (v: string) => {
    setNotes((m) => ({ ...m, [date]: v }));
    bumpStatus();
  };

  /* ---------- voice ---------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR: any =
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

  const isVoiceSupported = !!SR;

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    if (!isVoiceSupported) {
      showToast(t("voiceUnsupported"));
      return;
    }
    try {
      const rec = new SR();
      rec.lang = lang === "ru" ? "ru-RU" : lang === "be" ? "ru-RU" : lang === "uk" ? "uk-UA" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US";
      rec.interimResults = false;
      rec.continuous = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        let extra = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) extra += e.results[i][0].transcript + " ";
        }
        if (extra) {
          setNotes((m) => {
            const cur = m[date] ?? "";
            return { ...m, [date]: cur + (cur && !cur.endsWith(" ") ? " " : "") + extra.trim() + " " };
          });
          bumpStatus();
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        if (e.error === "not-allowed") {
          showToast(t("voicePermissionDenied"));
        } else if (e.error === "no-speech") {
          showToast(t("voiceNoSpeech"));
        } else {
          showToast(t("voiceUnsupported"));
        }
        setListening(false);
      };
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      showToast(t("voiceUnsupported"));
      setListening(false);
    }
  };

  /* ---------- photos ---------- */
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of files) {
      if (dayPhotos.length >= 6) break;
      try {
        const url = await fileToDataURL(f);
        setPhotos((m) => ({ ...m, [date]: [...(m[date] ?? []), url].slice(0, 6) }));
        bumpStatus();
      } catch {
        /* skip broken file */
      }
    }
  };

  /* ---------- tags ---------- */
  const addTag = () => {
    const raw = tagInput.trim().replace(/^#/, "").toLowerCase().slice(0, 24);
    if (!raw) return;
    if (!dayTags.includes(raw) && dayTags.length < 8) {
      setTags((m) => ({ ...m, [date]: [...(m[date] ?? []), raw] }));
      bumpStatus();
    }
    setTagInput("");
  };

  /* ---------- templates ---------- */
  const applyTemplate = (idx: number) => {
    const tpl = TEMPLATES[idx];
    const texts = tpl.tasks[lang];
    setTasks((m) => {
      const prev = m[date] ?? [];
      const merged: Task[] = texts.map((text, i) => {
        const existing = prev.find((p) => p.text === text);
        return {
          id: existing?.id ?? `${date}-${i}-${text.length}`,
          text,
          done: existing?.done ?? false,
        };
      });
      return { ...m, [date]: merged };
    });
    if (!(notes[date] ?? "").trim()) {
      setNotes((m) => ({ ...m, [date]: tpl.prompt[lang] }));
    }
    setAppliedTpl(tpl.id);
    window.setTimeout(() => setAppliedTpl(null), 1400);
    showToast(t("toastTpl"));
    bumpStatus();
  };

  const font = FONT_STACKS[writingFont];

  return (
    <div className="mx-auto max-w-6xl">
      {/* ===== Date navigation ===== */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDate(shiftISO(date, -1))}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--ink-faint)] hover:text-[var(--ink)] active:scale-90"
            aria-label="previous day"
          >
            <ArrowLeftIcon className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => onDate(shiftISO(date, 1))}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--ink-faint)] hover:text-[var(--ink)] active:scale-90"
            aria-label="next day"
          >
            <ArrowRightIcon className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-w-0">
          <div className="font-display truncate text-lg font-bold capitalize leading-tight">
            {dateLong}
          </div>
          <div className="text-xs text-[var(--ink-faint)]">{dateShort}</div>
        </div>
        {!isToday && (
          <button
            onClick={() => onDate(todayISO())}
            className="ml-auto h-9 rounded-full border border-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-deep)] transition-all duration-150 hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] active:scale-95"
          >
            {t("btnToday")}
          </button>
        )}
        {isToday && (
          <span className="ml-auto flex h-8 items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3.5 text-[12px] font-bold text-[var(--accent-deep)]">
            <span className="animate-livedot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t("todayBadge")}
          </span>
        )}
      </div>

      {/* ===== Mood ===== */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <span className="px-1 text-[12.5px] font-semibold text-[var(--ink-soft)]">{t("mood")}</span>
        <div className="flex flex-wrap gap-2">
          {MOODS[lang].map((label, i) => {
            const active = moods[date] === i;
            return (
              <button
                key={label}
                title={label}
                onClick={() => {
                  setMoods((m) => ({ ...m, [date]: i }));
                  bumpStatus();
                }}
                className={`flex h-11 items-center gap-2 rounded-xl border px-3 transition-all duration-200 active:scale-90 ${
                  active
                    ? "scale-105 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                    : "border-transparent text-[var(--ink-faint)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                }`}
                style={active ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                <span className="flex h-6 w-6 items-center justify-center text-[20px] leading-none">
                  {moodEmoji[i] || <MoodVisual level={i} emoji="" className="h-6 w-6" />}
                </span>
                <span className={`text-[13px] font-semibold ${active ? "" : "hidden sm:inline"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Templates ===== */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          {t("templates")}
        </span>
        {TEMPLATES.map((tpl, idx) => {
          const Icon = TPL_ICONS[idx];
          const applied = appliedTpl === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(idx)}
              className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-all duration-200 active:scale-95 ${
                applied
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
              }`}
            >
              {applied ? <CheckIcon className="animate-checkpop h-4 w-4" /> : <Icon className="h-4 w-4" />}
              {tpl.name[lang]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* ===== Journal column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow-sm)" }}>
            <textarea
              value={value}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("placeholder")}
              rows={10}
              spellCheck={false}
              className="w-full resize-y bg-transparent px-5 pb-2 pt-5 text-[15.5px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
              style={{ fontFamily: font }}
            />
            {/* photos */}
            {dayPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 pb-3">
                {dayPhotos.map((src, i) => (
                  <span key={i} className="group relative">
                    <img
                      src={src}
                      alt=""
                      className="h-20 w-24 rounded-lg border border-[var(--line)] object-cover"
                    />
                    <button
                      onClick={() => {
                        setPhotos((m) => ({ ...m, [date]: (m[date] ?? []).filter((_, j) => j !== i) }));
                        bumpStatus();
                      }}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--danger)] text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100"
                      aria-label="remove photo"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* toolbar */}
            <div className="flex items-center gap-2 border-t border-[var(--line)] px-4 py-2.5">
              <button
                onClick={toggleVoice}
                title={SR ? undefined : t("voiceUnsupported")}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-all duration-200 active:scale-95 ${
                  listening
                    ? "animate-pulsering bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--ink-soft)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                } ${SR ? "" : "cursor-not-allowed opacity-40"}`}
              >
                <MicIcon className="h-4 w-4" />
                {listening ? t("voiceListening") : ""}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-[var(--ink-soft)] transition-all duration-200 hover:bg-[var(--hover)] hover:text-[var(--ink)] active:scale-95"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t("addPhoto")}</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
              <span
                className="hidden h-7 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[11px] font-semibold text-[var(--ink-soft)] min-[420px]:flex"
                title={`${t("secFont")}: ${t("settingsTitle")}`}
              >
                <PenIcon className="h-3 w-3 text-[var(--accent)]" />
                {writingFont === "body" ? t("fontBody") : writingFont === "serif" ? t("fontSerif") : t("fontMono")}
              </span>
              <span className="ml-auto text-[11.5px] tabular-nums text-[var(--ink-faint)]">
                {countWords(value)} {t("words")} · {value.length} {t("chars")}
              </span>
              <span
                className={`flex items-center gap-1.5 text-[11.5px] font-semibold transition-colors ${
                  status === "saving"
                    ? "text-[var(--ink-faint)]"
                    : status === "saved"
                      ? "text-[var(--accent)]"
                      : "text-[var(--ink-faint)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === "saving"
                      ? "animate-livedot bg-[var(--ink-faint)]"
                      : status === "saved"
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--line)]"
                  }`}
                />
                {status === "saving" ? t("saving") : status === "saved" ? t("saved") : t("autosave")}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
              <TagIcon className="h-4 w-4" />
              {t("tagsLbl")}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {dayTags.map((tag) => (
                <span
                  key={tag}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--accent-soft)] pl-3 pr-1.5 text-[12.5px] font-semibold text-[var(--accent-deep)]"
                >
                  #{tag}
                  <button
                    onClick={() => {
                      setTags((m) => ({ ...m, [date]: (m[date] ?? []).filter((x) => x !== tag) }));
                      bumpStatus();
                    }}
                    className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
                    aria-label={`remove ${tag}`}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder={t("tagPlaceholder")}
                className="h-8 min-w-[130px] flex-1 rounded-full border border-dashed border-[var(--line)] bg-transparent px-3 text-[12.5px] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        {/* ===== Side column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Tasks */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold">{t("tasksTitle")}</h3>
              {dayTasks.length > 0 && (
                <span className="text-xs font-bold text-[var(--ink-faint)]">
                  {done} {t("ofWord")} {dayTasks.length}
                </span>
              )}
            </div>
            {dayTasks.length > 0 && (
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--hover)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <form
              className="mb-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = taskInput.trim();
                if (!text) return;
                setTasks((m) => ({
                  ...m,
                  [date]: [...(m[date] ?? []), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, done: false }],
                }));
                setTaskInput("");
                bumpStatus();
              }}
            >
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder={t("taskPlaceholder")}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] transition-all duration-150 hover:brightness-110 active:scale-90"
                aria-label="add task"
              >
                <PlusIcon className="h-4.5 w-4.5" />
              </button>
            </form>
            <ul className="mt-1 flex flex-col">
              {dayTasks.length === 0 && (
                <li className="py-4 text-center text-[12.5px] text-[var(--ink-faint)]">{t("tasksEmpty")}</li>
              )}
              {dayTasks.map((task) => (
                <li key={task.id} className="group flex items-center gap-2.5 py-1.5">
                  <button
                    onClick={() => {
                      setTasks((m) => ({
                        ...m,
                        [date]: (m[date] ?? []).map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)),
                      }));
                      bumpStatus();
                    }}
                    className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 transition-all duration-200 active:scale-75 ${
                      task.done
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "border-[var(--line)] bg-transparent hover:border-[var(--accent)]"
                    }`}
                    aria-label="toggle task"
                  >
                    {task.done && <CheckIcon className="animate-checkpop h-3 w-3" />}
                  </button>
                  <span
                    className={`flex-1 cursor-pointer text-[13.5px] leading-snug transition-all duration-200 ${
                      task.done ? "text-[var(--ink-faint)] line-through" : "text-[var(--ink)]"
                    }`}
                    onClick={() => {
                      setTasks((m) => ({
                        ...m,
                        [date]: (m[date] ?? []).map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)),
                      }));
                      bumpStatus();
                    }}
                  >
                    {task.text}
                  </span>
                  <button
                    onClick={() => {
                      setTasks((m) => ({ ...m, [date]: (m[date] ?? []).filter((x) => x.id !== task.id) }));
                      bumpStatus();
                    }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--ink-faint)] opacity-0 transition-all duration-150 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100"
                    aria-label="delete task"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Reminder */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                  reminder.enabled ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--hover)] text-[var(--ink-faint)]"
                }`}
              >
                <BellIcon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold">{t("reminderTitle")}</div>
                <div className="text-[11px] text-[var(--ink-faint)]">{t("reminderSub")}</div>
              </div>
              <button
                onClick={() => setReminder((r) => ({ ...r, enabled: !r.enabled }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                  reminder.enabled ? "bg-[var(--accent)]" : "bg-[var(--hover)]"
                }`}
                role="switch"
                aria-checked={reminder.enabled}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--panel-2)] shadow transition-all duration-200 ${
                    reminder.enabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            <input
              type="time"
              value={reminder.time}
              onChange={(e) => setReminder((r) => ({ ...r, time: e.target.value || "20:00" }))}
              disabled={!reminder.enabled}
              className="mt-3 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm font-semibold tabular-nums outline-none transition-opacity focus:border-[var(--accent)] disabled:opacity-40"
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="mb-3 text-[14.5px] font-bold">{t("summaryTitle")}</h3>
            <dl className="flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--ink-faint)]">{t("summaryMood")}</dt>
                <dd className="flex items-center gap-2 font-semibold">
                  {moods[date] !== undefined ? (
                    <>
                      <MoodVisual level={Math.max(0, Math.min(4, moods[date]))} emoji={moodEmoji[Math.max(0, Math.min(4, moods[date]))]} className="h-5 w-5 text-[18px]" />
                      {MOODS[lang][moods[date]]}
                    </>
                  ) : (
                    <span className="text-[var(--ink-faint)]">{t("noMood")}</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--ink-faint)]">{t("summaryTasks")}</dt>
                <dd className="font-semibold tabular-nums">
                  {done} {t("ofWord")} {dayTasks.length}
                  {dayTasks.length > 0 && <span className="ml-1 text-[var(--ink-faint)]">({pct}%)</span>}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--ink-faint)]">{t("summaryText")}</dt>
                <dd className="font-semibold tabular-nums">
                  {countWords(value)} {t("words")}
                  {value.trim() && (
                    <span className="ml-1 text-[var(--ink-faint)]">· {readingMinutes(value)} {t("readMin")}</span>
                  )}
                </dd>
              </div>
            </dl>
            <button
              onClick={() => window.print()}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] text-[13px] font-semibold text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-[0.98]"
            >
              <PrinterIcon className="h-4 w-4" />
              {t("printDay")}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Print sheet (экспорт в PDF через диалог печати) ===== */}
      <div id="print-sheet" className="hidden" style={{ fontFamily: "Georgia, 'Lora', serif" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6 }}>
          {t("name")}
        </div>
        <h1 style={{ fontSize: 28, margin: "8px 0 2px", textTransform: "capitalize" }}>{dateLong}</h1>
        <div style={{ fontSize: 14, opacity: 0.65, marginBottom: 20 }}>{dateShort}</div>
        {moods[date] !== undefined && (
          <div style={{ marginBottom: 12, fontSize: 15 }}>
            {t("summaryMood")}: <b>{MOODS[lang][moods[date]]}</b>
          </div>
        )}
        {dayTags.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.7 }}>
            {dayTags.map((x) => `#${x}`).join("  ")}
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.7 }}>{value}</div>
        {dayTasks.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 17, marginBottom: 8 }}>{t("tasksTitle")}</h2>
            {dayTasks.map((task) => (
              <div key={task.id} style={{ fontSize: 14, marginBottom: 4 }}>
                {task.done ? "☑" : "☐"} {task.text}
              </div>
            ))}
          </div>
        )}
        {dayPhotos.length > 0 && (
          <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dayPhotos.map((src, i) => (
              <img key={i} src={src} alt="" style={{ width: 180, height: 130, objectFit: "cover", borderRadius: 8 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
