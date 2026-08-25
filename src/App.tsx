import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Lang, TKey } from "./i18n";
import { STRINGS, localeOf } from "./i18n";
import type { ThemeId } from "./themes";
import type { BgId, Tab, Task, SleepData, WritingFontId } from "./store";
import { buildMarkdown, downloadText, hashPin, shiftISO, toISO, todayISO, useNow, useStored } from "./store";
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
import MobileBottomNav from "./components/MobileBottomNav";
import FriendsView from "./components/FriendsView";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { isLocalMode, setLocalMode, performInitialSync, subscribeToSyncStatus, syncEntry, syncTasks, syncSleep, syncSettings, type SyncStatus } from "./lib/sync";

const FONT_SCALES = ["93.75%", "100%", "109%"];

type Snapshot = {
  notes: Record<string, string>;
  tasks: Record<string, Task[]>;
  moods: Record<string, number>;
  tags: Record<string, string[]>;
  photos: Record<string, string[]>;
  sleep: Record<string, SleepData>;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [tab, setTab] = useStored<Tab>("dn.tab", "daily");
  const [theme, setTheme] = useStored<ThemeId>("dn.theme", "day");
  const [lang, setLang] = useStored<Lang>("dn.lang", "ru");
  const [fontScale, setFontScale] = useStored<number>("dn.font", 1);
  // useStored = страховка: данные переживут случайную перезагрузку до синхрона
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
  const [writtenOn, setWrittenOn] = useState<Record<string, boolean>>({});

  const remoteSnapshot = useRef<Snapshot | null>(null);
  const initialLoadDone = useRef(false);
  const lastUpdateTime = useRef<{ [key: string]: number }>({});
  const lastLocalSettingsRef = useRef({ theme, lang, fontScale, writingFont, bg, moodEmoji });

  const now = useNow(1000);
  const locale = localeOf(lang);
  const t = (k: TKey) => STRINGS[lang][k] ?? STRINGS.ru[k];

  const showToast = (msg: string) => setToast({ id: Date.now(), msg });
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(id); }, [toast]);
  useEffect(() => { const unsubscribe = subscribeToSyncStatus(setSyncStatusState); return unsubscribe; }, []);

  useEffect(() => {
    lastLocalSettingsRef.current = { theme, lang, fontScale, writingFont, bg, moodEmoji };
  }, [theme, lang, fontScale, writingFont, bg, moodEmoji]);

  const markSnapshotAsSent = (n: typeof notes, tk: typeof tasks, md: typeof moods, tg: typeof tags, ph: typeof photos, sl: typeof sleep) => {
    remoteSnapshot.current = { notes: clone(n), tasks: clone(tk), moods: clone(md), tags: clone(tg), photos: clone(ph), sleep: clone(sl) };
  };

  // 1. Загрузка данных
  useEffect(() => {
    if (!authLoading && userId) {
      setLocalMode(false);
      setShowAuth(false);
      let cancelled = false;

      const load = async (attempt: number) => {
        const remote = await performInitialSync(userId);
        if (cancelled) return;

        if (remote) {
          setNotes(remote.notes);
          setTasks(remote.tasks);
          setMoods(remote.moods);
          setTags(remote.tags);
          setPhotos(remote.photos);
          setSleep(remote.sleep);
          setWrittenOn(remote.writtenOn || {});

          const s = remote.settings as Record<string, any>;
          if (s) {
            if (s.theme) setTheme(s.theme);
            if (s.lang) setLang(s.lang);
            if (s.font !== undefined) setFontScale(Number(s.font));
            if (s.writingFont) setWritingFont(s.writingFont);
            if (s.bg) setBg(s.bg);
            if (s.moodEmoji) setMoodEmoji(s.moodEmoji);
          }

          remoteSnapshot.current = {
            notes: clone(remote.notes), tasks: clone(remote.tasks), moods: clone(remote.moods),
            tags: clone(remote.tags), photos: clone(remote.photos), sleep: clone(remote.sleep),
          };
          initialLoadDone.current = true;
        } else if (attempt < 5) {
          window.setTimeout(() => { if (!cancelled) load(attempt + 1); }, 2000);
        } else {
          remoteSnapshot.current = { notes: {}, tasks: {}, moods: {}, tags: {}, photos: {}, sleep: {} };
          initialLoadDone.current = true;
          showToast('Не удалось загрузить данные с сервера');
        }
      };

      load(0);
      return () => { cancelled = true; };
    } else if (!authLoading && !userId && isLocalMode()) {
      setShowAuth(false);
    } else if (!authLoading && !userId) {
      setShowAuth(true);
    }
  }, [userId, authLoading]);

  // 2. Realtime
  useEffect(() => {
    if (!userId || isLocalMode() || !supabase) return;

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${userId}` }, (payload) => {
        const entry = payload.new;
        if (!entry) return;
        const nowMs = Date.now();
        if (nowMs - (lastUpdateTime.current[entry.date] || 0) < 3000) return;

        setNotes((prev) => ({ ...prev, [entry.date]: entry.content || '' }));
        if (entry.mood !== null && entry.mood !== undefined) setMoods((prev) => ({ ...prev, [entry.date]: entry.mood }));
        if (entry.tags && entry.tags.length > 0) setTags((prev) => ({ ...prev, [entry.date]: entry.tags }));
        if (entry.photos && Array.isArray(entry.photos)) setPhotos((prev) => ({ ...prev, [entry.date]: entry.photos }));
        if (entry.created_at) {
          setWrittenOn((prev) => ({ ...prev, [entry.date]: toISO(new Date(entry.created_at)) === entry.date }));
        }

        if (remoteSnapshot.current) {
          remoteSnapshot.current.notes[entry.date] = entry.content || '';
          if (entry.mood !== null && entry.mood !== undefined) remoteSnapshot.current.moods[entry.date] = entry.mood;
          if (entry.tags && entry.tags.length > 0) remoteSnapshot.current.tags[entry.date] = entry.tags;
          if (entry.photos && Array.isArray(entry.photos)) remoteSnapshot.current.photos[entry.date] = entry.photos;
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, async (payload) => {
        const d = payload.new?.date || payload.old?.date;
        if (!d) return;
        const nowMs = Date.now();
        if (nowMs - (lastUpdateTime.current[`tasks-${d}`] || 0) < 3000) return;
        const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('date', d);
        if (data) {
          const mapped = data.map((task) => ({ id: task.id, text: task.title, done: task.completed }));
          setTasks((prev) => ({ ...prev, [d]: mapped }));
          if (remoteSnapshot.current) remoteSnapshot.current.tasks[d] = clone(mapped);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_logs', filter: `user_id=eq.${userId}` }, (payload) => {
        const s = payload.new;
        if (!s) return;
        const nowMs = Date.now();
        if (nowMs - (lastUpdateTime.current[`sleep-${s.date}`] || 0) < 3000) return;
        const val = { hours: Number(s.hours) || 0, quality: s.quality || 0, bedtime: s.sleep_start || '', waketime: s.sleep_end || '', awakenings: Number(s.awakenings) || 0, note: s.note || '' };
        setSleep((prev) => ({ ...prev, [s.date]: val }));
        if (remoteSnapshot.current) remoteSnapshot.current.sleep[s.date] = clone(val);
      })
      .subscribe();

    return () => { if (supabase) supabase.removeChannel(channel); };
  }, [userId]);

  // 3. Realtime настройки
  useEffect(() => {
    if (!userId || isLocalMode() || !supabase) return;

    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const settings = payload.new.settings as Record<string, any>;
          if (settings) {
            const last = lastLocalSettingsRef.current;
            if (settings.theme && settings.theme !== last.theme) setTheme(settings.theme);
            if (settings.lang && settings.lang !== last.lang) setLang(settings.lang);
            if (settings.font !== undefined && settings.font !== last.fontScale) setFontScale(Number(settings.font));
            if (settings.writingFont && settings.writingFont !== last.writingFont) setWritingFont(settings.writingFont);
            if (settings.bg && settings.bg !== last.bg) setBg(settings.bg);
            if (settings.moodEmoji && JSON.stringify(settings.moodEmoji) !== JSON.stringify(last.moodEmoji)) setMoodEmoji(settings.moodEmoji);
          }
        }
      )
      .subscribe();

    return () => { if (supabase) supabase.removeChannel(profileChannel); };
  }, [userId]);

  // 4. Отправка изменений
  useEffect(() => {
    if (!userId || isLocalMode() || !initialLoadDone.current) return;
    const snap = remoteSnapshot.current;
    const unchanged = snap &&
      JSON.stringify(snap.notes) === JSON.stringify(notes) &&
      JSON.stringify(snap.moods) === JSON.stringify(moods) &&
      JSON.stringify(snap.tags) === JSON.stringify(tags) &&
      JSON.stringify(snap.photos) === JSON.stringify(photos);
    if (unchanged) return;
    setWrittenOn((prev) => (prev[date] !== undefined ? prev : { ...prev, [date]: date === todayISO() }));
    lastUpdateTime.current[date] = Date.now();
    syncEntry(userId, date, notes[date] ?? "", moods[date] ?? null, tags[date] ?? [], photos[date] ?? []);
    markSnapshotAsSent(notes, tasks, moods, tags, photos, sleep);
  }, [notes, moods, tags, photos, date, userId]);

  useEffect(() => {
    if (!userId || isLocalMode() || !initialLoadDone.current) return;
    const snap = remoteSnapshot.current;
    if (snap && JSON.stringify(snap.tasks) === JSON.stringify(tasks)) return;
    lastUpdateTime.current[`tasks-${date}`] = Date.now();
    syncTasks(userId, date, tasks[date] ?? []);
    markSnapshotAsSent(notes, tasks, moods, tags, photos, sleep);
  }, [tasks, date, userId]);

  useEffect(() => {
    if (!userId || isLocalMode() || !initialLoadDone.current) return;
    const snap = remoteSnapshot.current;
    if (snap && JSON.stringify(snap.sleep) === JSON.stringify(sleep)) return;
    const s = sleep[date];
    if (s) {
      lastUpdateTime.current[`sleep-${date}`] = Date.now();
      syncSleep(userId, date, s);
      markSnapshotAsSent(notes, tasks, moods, tags, photos, sleep);
    }
  }, [sleep, date, userId]);

  useEffect(() => {
    if (userId && !isLocalMode()) syncSettings(userId, { theme, lang, font: fontScale, writingFont, bg, moodEmoji });
  }, [theme, lang, fontScale, writingFont, bg, moodEmoji, userId]);

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
    if (userId && !isLocalMode()) syncSettings(userId, { theme: newTheme, lang, font: fontScale, writingFont, bg, moodEmoji });
  };

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { document.documentElement.style.fontSize = FONT_SCALES[fontScale] ?? "100%"; }, [fontScale]);
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.title = lang === "ru" ? "Дейли Ноутс" : "Daily Notes";
  }, [lang]);

  // ===== ЧЕСТНАЯ СЕРИЯ =====
  // День засчитывается, только если заметка создана в этот же день.
  // Если сегодня ещё не писал — серия показывается по вчерашнюю (не сгорает днём).
  const today = todayISO();
  let streak = 0;
  {
    let iso = writtenOn[today] && (notes[today] ?? "").trim() ? today : shiftISO(today, -1);
    for (; (notes[iso] ?? "").trim() && writtenOn[iso]; iso = shiftISO(iso, -1)) streak += 1;
  }
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

  const syncBadge = userId ? (
    syncStatus === 'syncing' ? <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />Синхронизация...</span> :
    syncStatus === 'error' ? <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400">Ошибка</span> :
    <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Синхронизировано</span>
  ) : <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" />Локально</span>;

  return (
    <div className="relative flex h-full flex-col overflow-hidden overscroll-none bg-[var(--bg)] text-[var(--ink)] md:flex-row">
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

        <main key={tab + date} className="animate-rise min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8 sm:py-8">
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
      <MobileBottomNav tab={tab} onTab={setTab} />
      <InstallPrompt />
    </div>
  );
}
