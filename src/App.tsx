import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Lang, TKey } from "./i18n";
import { STRINGS, localeOf } from "./i18n";
import type { ThemeId } from "./themes";
import type { BgId, Tab, Task, SleepData, WritingFontId } from "./store";
import { buildMarkdown, downloadText, hashPin, shiftISO, todayISO, useNow, useStored } from "./store";
import { BG_IMAGES } from "./bg";
import Sidebar from "./components/Sidebar";
import DailyView from "./components/DailyView";
import type { Reminder } from "./components/DailyView";
const StatsView = lazy(() => import("./components/StatsView"));
import NotesView from "./components/NotesView";
import SettingsView from "./components/SettingsView";
import LockScreen from "./components/LockScreen";
import SleepView from "./components/SleepView";
import InstallPrompt from "./components/InstallPrompt";
import AuthScreen from "./components/AuthScreen";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { isLocalMode, setLocalMode, performInitialSync, subscribeToSyncStatus, getSyncStatus, syncEntry, syncTasks, syncSleep, syncSettings, type SyncStatus } from "./lib/sync";

const FONT_SCALES = ["93.75%", "100%", "109%"];

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const hasMounted = useRef(false); // БЛОКИРОВЩИК ПЕРВОГО ЗАПУСКА
  
  const [tab, setTab] = useStored<Tab>("dn.tab", "daily");
  const [theme, setTheme] = useStored<ThemeId>("dn.theme", "day");
  const [lang, setLang] = useStored<Lang>("dn.lang", "ru");
  const [fontScale, setFontScale] = useStored<number>("dn.font", 1);
  const [notes, setNotes] = useStored<Record<string, string>>("dn.notes", {});
  const [tasks, setTasks] = useStored<Record<string, Task[]>>("dn.tasks", {});
  const [moods, setMoods] = useStored<Record<string, number>>("dn.moods", {});
  const [tags, setTags] = useStored<Record<string, string[]>>("dn.tags", {});
  const [photos, setPhotos] = useStored<Record<string, string[]>>("dn.photos", {});
  const [reminder, setReminder] = useStored<Reminder>("dn.reminder", { time: "20:00", enabled: false });
  const [moodEmoji, setMoodEmoji] = useStored<string[]>("dn.emoji", ["", "", "", "", ""]);
  const [writingFont, setWritingFont] = useStored<WritingFontId>("dn.wfont", "body");
  const [bg, setBg] = useStored<BgId>("dn.bg", "dots");
  const [pinHash, setPinHash] = useStored<string | null>("dn.pin", null);
  const [sleep, setSleep] = useStored<Record<string, SleepData>>("dn.sleep", {});

  const [date, setDate] = useState<string>(todayISO());
  const [locked, setLocked] = useState<boolean>(() => Boolean(pinHash));
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(true);
  const [syncStatus, setSyncStatusState] = useState<SyncStatus>('idle');

  const now = useNow(1000);
  const locale = localeOf(lang);
  const t = (k: TKey) => STRINGS[lang][k] ?? STRINGS.ru[k];

  const showToast = (msg: string) => setToast({ id: Date.now(), msg });
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(id); }, [toast]);
  useEffect(() => { const unsubscribe = subscribeToSyncStatus(setSyncStatusState); return unsubscribe; }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        setLocalMode(false);
        performInitialSync().then((remote) => {
          if (remote) {
            setNotes(remote.notes || {});
            setTasks(remote.tasks || {});
            setMoods(remote.moods || {});
            setTags(remote.tags || {});
            setPhotos(remote.photos || {});
            setSleep(remote.sleep || {});
          }
        });
        setShowAuth(false);
      } else if (isLocalMode()) {
        setShowAuth(false);
      } else {
        setShowAuth(true);
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || isLocalMode() || !supabase) return;
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${user.id}` }, (payload) => {
        const entry = payload.new;
        if (entry) {
          setNotes((prev) => ({ ...prev, [entry.date]: entry.content || '' }));
          if (entry.mood !== null && entry.mood !== undefined) setMoods((prev) => ({ ...prev, [entry.date]: entry.mood }));
          if (entry.tags && entry.tags.length > 0) setTags((prev) => ({ ...prev, [entry.date]: entry.tags }));
          if (entry.photos && Array.isArray(entry.photos)) setPhotos((prev) => ({ ...prev, [entry.date]: entry.photos }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, async (payload) => {
        const d = payload.new?.date || payload.old?.date;
        if (d) {
          const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', d);
          if (data) setTasks((prev) => ({ ...prev, [d]: data.map((task) => ({ id: task.id, text: task.title, done: task.completed })) }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_logs', filter: `user_id=eq.${user.id}` }, (payload) => {
        const sleep = payload.new;
        if (sleep) setSleep((prev) => ({ ...prev, [sleep.date]: { hours: sleep.sleep_start ? parseFloat(sleep.sleep_start) : 0, quality: sleep.quality || 0, bedtime: sleep.sleep_start || '', waketime: sleep.sleep_end || '' } }));
      })
      .subscribe();
    return () => { if (supabase) supabase.removeChannel(channel); };
  }, [user]);

  // ОТПРАВКА ДАННЫХ В БАЗУ: БЛОКИРУЕТСЯ ПРИ ПЕРВОМ РЕНДЕРЕ
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return; // Первый запуск игнорируется, чтобы не отправить пустоту
    }
    if (user && !isLocalMode()) {
      syncEntry(user.id, date, notes[date] ?? "", moods[date] ?? null, tags[date] ?? [], photos[date] ?? []);
    }
  }, [notes, moods, tags, photos, date, user]);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (user && !isLocalMode()) syncTasks(user.id, date, tasks[date] ?? []);
  }, [tasks, date, user]);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (user && !isLocalMode()) { const s = sleep[date]; if (s) syncSleep(user.id, date, s); }
  }, [sleep, date, user]);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (user && !isLocalMode()) syncSettings(user.id, { theme, lang, font: fontScale, writingFont, bg, moodEmoji });
  }, [theme, lang, fontScale, writingFont, bg, moodEmoji, user]);

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
    if (user && !isLocalMode()) syncSettings(user.id, { theme: newTheme, lang, font: fontScale, writingFont, bg, moodEmoji });
  };

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { document.documentElement.style.fontSize = FONT_SCALES[fontScale] ?? "100%"; }, [fontScale]);
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.title = lang === "ru" ? "Дейли Ноутс" : "Daily Notes";
  }, [lang]);

  const firedRef = useRef<string>("");
  useEffect(() => {
    if (!reminder.enabled || !reminder.time) return;
    const check = () => {
      const [h, m] = reminder.time.split(":").map(Number);
      const target = new Date(); target.setHours(h, m, 0, 0);
      const stamp = `${todayISO()}|${reminder.time}`;
      if (Date.now() >= target.getTime() && firedRef.current !== stamp) {
        firedRef.current = stamp;
        showToast(t("toastReminder"));
        try {
          if ("Notification" in window) {
            const fire = () => new Notification(t("name"), { body: t("toastReminder"), silent: false });
            if (Notification.permission === "granted") fire();
            else if (Notification.permission === "default") Notification.requestPermission().then((p) => p === "granted" && fire());
          }
        } catch { /* ignore */ }
      }
    };
    check();
    const id = window.setInterval(check, 15000);
    return () => window.clearInterval(id);
  }, [reminder.enabled, reminder.time, lang, t]);

  const today = todayISO();
  let streak = 0;
  for (let iso = today; (notes[iso] ?? "").trim().length > 0; iso = shiftISO(iso, -1)) streak += 1;
  const weekMarks = Array.from({ length: 7 }, (_, i) => Boolean((notes[shiftISO(today, i - 6)] ?? "").trim()));
  const notesCount = Object.keys(notes).filter((k) => (notes[k] ?? "").trim()).length;
  const tasksCount = Object.values(tasks).reduce((sum, list) => sum + (list?.length ?? 0), 0);
  const hasEntry = (iso: string) => Boolean((notes[iso] ?? "").trim());

  const clearAll = () => { setNotes({}); setTasks({}); setMoods({}); setTags({}); setPhotos({}); setDate(todayISO()); };
  const exportMd = () => downloadText("daily-notes.md", buildMarkdown(notes, tasks, moods, tags, lang), "text/markdown;charset=utf-8");
  const exportJson = () => downloadText("daily-notes.json", JSON.stringify({ notes, tasks, moods, tags, reminder, moodEmoji, writingFont, theme, lang, bg, sleep }, null, 2), "application/json;charset=utf-8");
  const openDate = (iso: string) => { setDate(iso); setTab("daily"); };
  const pinLen = pinHash ? Math.max(4, parseInt(pinHash.slice(-1), 36) || 4) : 4;

  if (locked && pinHash) return <LockScreen pinLength={pinLen} onTry={(pin) => { if (hashPin(pin) === pinHash) { setLocked(false); return true; } return false; }} t={t} />;

  const tabMeta: Record<Tab, { title: string; sub: string }> = {
    daily: { title: t("dailyTitle"), sub: t("dailySub") }, stats: { title: t("statsTitle"), sub: t("statsSub") },
    notes: { title: t("notesTitle"), sub: t("notesSub") }, sleep: { title: t("sleepTitle"), sub: t("sleepSub") }, settings: { title: t("settingsTitle"), sub: t("settingsSub") },
  };

  const clock = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateChip = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(now);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><div className="animate-pulse text-[var(--ink-faint)]">Загрузка...</div></div>;
  if (showAuth) return <AuthScreen onContinueLocally={() => { setLocalMode(true); setShowAuth(false); }} theme={theme} onTheme={handleThemeChange} />;

  const syncBadge = user ? (
    syncStatus === 'syncing' ? <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />Синхронизация...</span> :
    syncStatus === 'error' ? <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400">Ошибка</span> :
    <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Синхронизировано</span>
  ) : <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" />Локально</span>;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)] md:flex-row">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {bg === "dots" && <div className="bg-dots absolute inset-0 opacity-70" />}
        {bg === "grid" && <div className="bg-grid absolute inset-0 opacity-70" />}
        {(bg === "paper" || bg === "space" || bg === "lines" || bg === "hex" || bg === "waves") && <img src={BG_IMAGES[bg]} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: bg === "paper" ? 0.5 : bg === "space" ? 0.32 : 0.15 }} />}
        <div className="animate-drift1 absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full blur-3xl" style={{ background: "var(--glow1)" }} />
        <div className="animate-drift2 absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: "var(--glow2)" }} />
        <div className="noise absolute inset-0 opacity-[0.05]" />
      </div>

      <Sidebar tab={tab} onTab={setTab} theme={theme} onTheme={handleThemeChange} lang={lang} onLang={setLang} t={t} streak={streak} weekMarks={weekMarks} notesCount={notesCount} selectedDate={date} onPickDate={openDate} hasEntry={hasEntry} hasPin={Boolean(pinHash)} onLock={() => setLocked(true)} />

      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-[74px] shrink-0 items-center gap-4 border-b border-[var(--line)] px-4 sm:px-8">
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-bold leading-tight tracking-tight sm:text-2xl">{tabMeta[tab].title}</h1>
            <p className="hidden truncate text-xs text-[var(--ink-faint)] sm:block">{tabMeta[tab].sub}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {syncBadge}
            <span className="flex items-center gap-2.5">
              <span className="animate-livedot h-2 w-2 rounded-full bg-[var(--accent)]" />
              <span className="font-display text-lg font-semibold tabular-nums tracking-tight">{clock}</span>
            </span>
            <span className="hidden h-9 items-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-medium text-[var(--ink-soft)] sm:flex">{dateChip}</span>
          </div>
        </header>

        <main key={tab + date} className="animate-rise min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          {tab === "daily" && <DailyView date={date} onDate={setDate} notes={notes} setNotes={setNotes} tasks={tasks} setTasks={setTasks} moods={moods} setMoods={setMoods} tags={tags} setTags={setTags} photos={photos} setPhotos={setPhotos} reminder={reminder} setReminder={setReminder} moodEmoji={moodEmoji} writingFont={writingFont} lang={lang} t={t} showToast={showToast} />}
          {tab === "stats" && <Suspense fallback={<div className="grid h-64 place-items-center text-sm text-[var(--ink-faint)]"><span className="animate-livedot h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /></div>}><StatsView notes={notes} tasks={tasks} moods={moods} sleep={sleep} moodEmoji={moodEmoji} lang={lang} t={t} /></Suspense>}
          {tab === "sleep" && <SleepView sleep={sleep} lang={lang} t={t} setSleep={(iso, data) => setSleep({ ...sleep, [iso]: data })} />}
          {tab === "notes" && <NotesView notes={notes} tasks={tasks} moods={moods} tags={tags} photos={photos} moodEmoji={moodEmoji} writingFont={writingFont} onOpen={openDate} lang={lang} t={t} />}
          {tab === "settings" && <SettingsView theme={theme} onTheme={handleThemeChange} lang={lang} onLang={setLang} writingFont={writingFont} onWritingFont={setWritingFont} fontScale={fontScale} onFontScale={setFontScale} bg={bg} onBg={setBg} moodEmoji={moodEmoji} onMoodEmoji={setMoodEmoji} pinHash={pinHash} onPinChange={setPinHash} onClearAll={clearAll} onExportMd={exportMd} onExportJson={exportJson} t={t} notesCount={notesCount} tasksCount={tasksCount} showToast={showToast} />}
        </main>
      </div>

      {toast && (
        <div key={toast.id} className="animate-rise fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-2.5 text-[13.5px] font-semibold" style={{ boxShadow: "var(--shadow)" }}>
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />{toast.msg}
          </div>
        </div>
      )}
      <InstallPrompt />
    </div>
  );
}
