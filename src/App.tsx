import { useEffect, useState } from "react";
import type { Lang, TKey } from "./i18n";
import { STRINGS, localeOf } from "./i18n";
import type { ThemeId } from "./themes";
import type { Tab, Task } from "./store";
import { shiftISO, todayISO, useNow, useStored } from "./store";
import Sidebar from "./components/Sidebar";
import DailyView from "./components/DailyView";
import NotesView from "./components/NotesView";
import SettingsView from "./components/SettingsView";

const FONT_SCALES = ["93.75%", "100%", "109%"];

export default function App() {
  const [tab, setTab] = useStored<Tab>("dn.tab", "daily");
  const [theme, setTheme] = useStored<ThemeId>("dn.theme", "day");
  const [lang, setLang] = useStored<Lang>("dn.lang", "ru");
  const [fontScale, setFontScale] = useStored<number>("dn.font", 1);
  const [notes, setNotes] = useStored<Record<string, string>>("dn.notes", {});
  const [tasks, setTasks] = useStored<Record<string, Task[]>>("dn.tasks", {});
  const [moods, setMoods] = useStored<Record<string, number>>("dn.moods", {});
  const [date, setDate] = useState<string>(todayISO());

  const now = useNow(1000);
  const locale = localeOf(lang);
  const t = (k: TKey) => STRINGS[lang][k] ?? STRINGS.ru[k];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALES[fontScale] ?? "100%";
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.title =
      lang === "ru" ? "Дейли Ноутс — ежедневные заметки" : "Daily Notes — everyday journal";
  }, [lang]);

  /* ---------- derived ---------- */

  const today = todayISO();
  let streak = 0;
  for (let iso = today; (notes[iso] ?? "").trim().length > 0; iso = shiftISO(iso, -1)) {
    streak += 1;
  }
  const weekMarks = Array.from({ length: 7 }, (_, i) =>
    Boolean((notes[shiftISO(today, i - 6)] ?? "").trim())
  );
  const notesCount = Object.keys(notes).filter((k) => (notes[k] ?? "").trim()).length;
  const tasksCount = Object.values(tasks).reduce((sum, list) => sum + (list?.length ?? 0), 0);

  const clearAll = () => {
    setNotes({});
    setTasks({});
    setMoods({});
    setDate(todayISO());
  };

  const openDate = (iso: string) => {
    setDate(iso);
    setTab("daily");
  };

  const tabMeta: Record<Tab, { title: string; sub: string }> = {
    daily: { title: t("dailyTitle"), sub: t("dailySub") },
    notes: { title: t("notesTitle"), sub: t("notesSub") },
    settings: { title: t("settingsTitle"), sub: t("settingsSub") },
  };

  const clock = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateChip = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)] md:flex-row">
      {/* ---------- ambient background ---------- */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="bg-dots absolute inset-0 opacity-70" />
        <div
          className="animate-drift1 absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full blur-3xl"
          style={{ background: "var(--glow1)" }}
        />
        <div
          className="animate-drift2 absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "var(--glow2)" }}
        />
        <div className="noise absolute inset-0 opacity-[0.05]" />
      </div>

      {/* ---------- sidebar (desktop aside + mobile top bar) ---------- */}
      <Sidebar
        tab={tab}
        onTab={setTab}
        theme={theme}
        onTheme={setTheme}
        lang={lang}
        onLang={setLang}
        t={t}
        streak={streak}
        weekMarks={weekMarks}
        notesCount={notesCount}
      />

      {/* ---------- main column ---------- */}
      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-[74px] shrink-0 items-center gap-4 border-b border-[var(--line)] px-4 sm:px-8">
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {tabMeta[tab].title}
            </h1>
            <p className="hidden truncate text-xs text-[var(--ink-faint)] sm:block">
              {tabMeta[tab].sub}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-2.5">
              <span className="animate-livedot h-2 w-2 rounded-full bg-[var(--accent)]" />
              <span className="font-display text-lg font-semibold tabular-nums tracking-tight">
                {clock}
              </span>
            </span>
            <span className="hidden h-9 items-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-medium text-[var(--ink-soft)] sm:flex">
              {dateChip}
            </span>
          </div>
        </header>

        <main
          key={tab + date}
          className="animate-rise min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8"
        >
          {tab === "daily" && (
            <DailyView
              date={date}
              onDate={setDate}
              notes={notes}
              setNotes={setNotes}
              tasks={tasks}
              setTasks={setTasks}
              moods={moods}
              setMoods={setMoods}
              lang={lang}
              t={t}
            />
          )}
          {tab === "notes" && (
            <NotesView
              notes={notes}
              tasks={tasks}
              moods={moods}
              onOpen={openDate}
              lang={lang}
              t={t}
            />
          )}
          {tab === "settings" && (
            <SettingsView
              theme={theme}
              onTheme={setTheme}
              lang={lang}
              onLang={setLang}
              fontScale={fontScale}
              onFontScale={setFontScale}
              onClearAll={clearAll}
              t={t}
              notesCount={notesCount}
              tasksCount={tasksCount}
            />
          )}
        </main>
      </div>
    </div>
  );
}
