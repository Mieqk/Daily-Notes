import { useMemo, useState } from "react";
import type { Lang, TKey } from "../i18n";
import { localeOf } from "../i18n";
import type { Task, WritingFontId } from "../store";
import { FONT_STACKS, countWords, fromISO, todayISO } from "../store";
import { ArrowRightIcon, CheckIcon, MoodVisual, SearchIcon, TagIcon } from "../icons";

interface NotesViewProps {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  tags: Record<string, string[]>;
  photos: Record<string, string[]>;
  moodEmoji: string[];
  writingFont: WritingFontId;
  onOpen: (iso: string) => void;
  lang: Lang;
  t: (k: TKey) => string;
}

export default function NotesView({
  notes,
  tasks,
  moods,
  tags,
  photos,
  moodEmoji,
  writingFont,
  onOpen,
  lang,
  t,
}: NotesViewProps) {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const locale = localeOf(lang);

  const entries = Object.keys(notes)
    .filter((k) => (notes[k] ?? "").trim().length > 0)
    .sort((a, b) => b.localeCompare(a));

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const iso of entries) {
      for (const tag of tags[iso] ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [entries, tags]);

  const q = query.trim().toLowerCase();
  const filtered = entries.filter((iso) => {
    if (tagFilter && !(tags[iso] ?? []).includes(tagFilter)) return false;
    if (!q) return true;
    const text = (notes[iso] ?? "").toLowerCase();
    const taskText = (tasks[iso] ?? []).map((x) => x.text).join(" ").toLowerCase();
    const tagText = (tags[iso] ?? []).join(" ").toLowerCase();
    return text.includes(q) || taskText.includes(q) || tagText.includes(q);
  });

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "long",
    }).format(fromISO(iso));

  return (
    <div className="mx-auto max-w-6xl">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[var(--ink-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
          />
        </div>
        <span className="ml-auto text-sm text-[var(--ink-faint)]">
          {t("entriesLabel")}: <b className="text-[var(--ink)]">{filtered.length}</b>
        </span>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <TagIcon className="h-4 w-4 text-[var(--ink-faint)]" />
          <button
            onClick={() => setTagFilter(null)}
            className={`h-8 rounded-full px-3 text-[12.5px] font-semibold transition-all duration-150 active:scale-95 ${
              tagFilter === null
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-[var(--hover)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            {t("allTags")}
          </button>
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`h-8 rounded-full px-3 text-[12.5px] font-semibold transition-all duration-150 active:scale-95 ${
                tagFilter === tag
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "bg-[var(--hover)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              #{tag} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty archive */}
      {entries.length === 0 && (
        <div className="animate-rise flex flex-col items-center gap-4 py-16 text-center">
          <svg
            viewBox="0 0 120 90"
            className="w-44 text-[var(--ink-faint)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="14" y="10" width="62" height="68" rx="7" />
            <path d="M26 28h38M26 40h38M26 52h24" />
            <path
              d="M82 64 102 44a5.5 5.5 0 0 1 8 8L90 72l-13 4 5-12Z"
              fill="var(--accent)"
              stroke="var(--accent)"
            />
            <path d="m97 49 6 6" stroke="var(--accent-ink)" />
          </svg>
          <h3 className="font-display text-xl font-bold">{t("notesEmptyTitle")}</h3>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-faint)]">{t("notesEmptyText")}</p>
          <button
            onClick={() => onOpen(todayISO())}
            className="mt-2 h-11 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-ink)] transition-all duration-200 hover:brightness-110 active:scale-95"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {t("notesEmptyCta")}
          </button>
        </div>
      )}

      {/* No search results */}
      {entries.length > 0 && filtered.length === 0 && (
        <div className="animate-rise flex flex-col items-center gap-2 py-16 text-center">
          <h3 className="font-display text-xl font-bold">{t("noResults")}</h3>
          <p className="text-sm text-[var(--ink-faint)]">{t("noResultsText")}</p>
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((iso, i) => {
          const text = notes[iso] ?? "";
          const dayTasks = tasks[iso] ?? [];
          const done = dayTasks.filter((x) => x.done).length;
          const mood = moods[iso];
          const dayTags = tags[iso] ?? [];
          const photo = (photos[iso] ?? [])[0];
          return (
            <button
              key={iso}
              onClick={() => onOpen(iso)}
              className="animate-rise group flex flex-col gap-3 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)]"
              style={{
                animationDelay: `${Math.min(i, 12) * 45}ms`,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {photo && <img src={photo} alt="" className="h-28 w-full object-cover" />}
              <span className="flex flex-col gap-3 p-5 pt-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-[13px] font-bold capitalize text-[var(--accent-deep)]">
                    {fmt(iso)}
                  </span>
                  {mood !== undefined && (
                    <MoodVisual level={mood} emoji={moodEmoji[mood]} className="h-5 w-5 text-[18px] text-[var(--accent)]" />
                  )}
                </span>
                <span
                  className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-[var(--ink-soft)]"
                  style={{ fontFamily: FONT_STACKS[writingFont] }}
                >
                  {text}
                </span>
                {dayTags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {dayTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-deep)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                )}
                <span className="mt-auto flex items-center gap-3 pt-1 text-xs text-[var(--ink-faint)]">
                  {dayTasks.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {done}/{dayTasks.length}
                    </span>
                  )}
                  <span>
                    {countWords(text)} {t("words")}
                  </span>
                  <ArrowRightIcon className="ml-auto h-4 w-4 text-[var(--accent)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
