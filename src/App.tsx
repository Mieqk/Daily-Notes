import { isSealed } from "./store";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Lang, TKey } from "./i18n";
import { STRINGS, localeOf } from "./i18n";
import { makeUI } from "./ui-strings";
import type { ThemeId } from "./themes";
import { updateCustomSwatch } from "./themes";
import { applyLook, sanitizeLook, DEFAULT_LOOK } from "./look";
import type { Look } from "./look";
import type { BgId, Tab, Task, SleepData, WritingFontId } from "./store";
import { verifyBiometric } from "./lib/biometric";
import { makeDevice } from "./device-strings";
import { buildBackup } from "./lib/backup";
import { applyDeepLink } from "./lib/deepLink";
import { buildMarkdown, downloadText, hashPin, shiftISO, toISO, todayISO, useNow, useStored } from "./store";
import { BG_IMAGES } from "./bg";
import Sidebar from "./components/Sidebar";
import DailyView from "./components/DailyView";
import type { Reminder } from "./components/DailyView";
const StatsView = lazy(() => import("./components/StatsView"));
import NotesView from "./components/NotesView";
import SettingsView from "./components/SettingsView";
import PlannerView from "./components/PlannerView";
import LockScreen from "./components/LockScreen";
import SleepView from "./components/SleepView";
import SleepSuggestion from "./components/SleepSuggestion";
import { useSleepAuto } from "./lib/sleepAuto";
import HobbyView from "./components/HobbyView";
import InstallPrompt from "./components/InstallPrompt";
import NewPasswordScreen from "./components/NewPasswordScreen";
import AuthScreen from "./components/AuthScreen";
import E2eeGate from "./components/E2eeGate";
import { initE2ee, useE2eeStatus, encryptionActive, convertAllRemote, openEntry } from "./lib/e2ee";
import { makeE2ee } from "./e2ee-strings";
import { makeSleepAuto } from "./sleep-auto-strings";
import MobileMenu from "./components/MobileMenu";
import FriendsView from "./components/FriendsView";
import PairView from "./components/PairView";
import AccountMenu from "./components/AccountMenu";
import { useNotifications } from "./hooks/useNotifications";
import { usePlaceReminders } from "./hooks/usePlaceReminders";
import { useChatUnread } from "./hooks/useChatUnread";
import { startPresenceHeartbeat } from "./lib/presence";
import { useCalls } from "./hooks/useCalls";
import CallOverlay from "./components/CallOverlay";
import { useGcalSync } from "./hooks/useGcalSync";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { isLocalMode, setLocalMode, performInitialSync, mergeLocalIntoRemote, subscribeToSyncStatus, syncEntry, syncTasks, syncSleep, syncSettings, deleteAllRemote, flushPendingSync, decodeTitle, decodeNote, type SyncStatus } from "./lib/sync";

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
  const { user, loading: authLoading, recovery } = useAuth();
  const userId = user?.id ?? null;
  const e2eeStatus = useE2eeStatus();
  // Пока не ясно, включено ли шифрование (или ключ закрыт), на сервер ничего не пишем и с сервера не читаем
  const e2eeReady = e2eeStatus === 'off' || e2eeStatus === 'unavailable' || e2eeStatus === 'unlocked';
  useEffect(() => { if (userId) void initE2ee(userId); }, [userId]);

  // «Питание» и «Тренировки» переехали внутрь «Хобби»: старое сохранённое значение открывает нужную подвкладку
  useState(() => {
    applyDeepLink();
    try {
      const old = JSON.parse(localStorage.getItem("dn.tab") || '""');
      if (old === "food" || old === "workout") {
        localStorage.setItem("dn.hobbyTab", JSON.stringify(old));
        localStorage.setItem("dn.tab", '"hobby"');
      }
    } catch { /* не критично */ }
  });
  const [tab, setTab] = useStored<Tab>("dn.tab", "daily");
  const [theme, setTheme] = useStored<ThemeId>("dn.theme", "day");
  const [lookRaw, setLookRaw] = useStored<Look>("dn.look", DEFAULT_LOOK);
  const look = sanitizeLook(lookRaw);
  const setLook = (l: Look) => setLookRaw(sanitizeLook(l));
  const [lang, setLang] = useStored<Lang>("dn.lang", "ru");
  const u = makeUI(lang);
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
  const [bioId, setBioId] = useStored<string | null>("dn.bio", null);
  const [sleep, setSleep] = useStored<Record<string, SleepData>>("dn.sleep", {});
  const [autoSleep, setAutoSleep] = useStored<boolean>("dn.sleepAuto", false);
  const [capsules, setCapsules] = useStored<Record<string, string>>("dn.capsules", {});

  const [date, setDate] = useState<string>(todayISO());
  const [locked, setLocked] = useState<boolean>(() => Boolean(pinHash));
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(true);
  const [syncStatus, setSyncStatusState] = useState<SyncStatus>('idle');
  const [writtenOn, setWrittenOn] = useState<Record<string, boolean>>({});

  const remoteSnapshot = useRef<Snapshot | null>(null);
  const initialLoadDone = useRef(false);
  const lastUpdateTime = useRef<{ [key: string]: number }>({});
  const lastLocalSettingsRef = useRef({ theme, lang, fontScale, writingFont, bg, moodEmoji, look: JSON.stringify(look) });

  const localRef = useRef({ notes, tasks, moods, tags, photos, sleep });
  localRef.current = { notes, tasks, moods, tags, photos, sleep };

  useNotifications(userId, lang, reminder);
  const chatUnread = useChatUnread(userId);
  const call = useCalls(userId, lang);
  useEffect(() => (userId ? startPresenceHeartbeat(userId) : undefined), [userId]);
  useGcalSync(userId, tasks);

  const now = useNow(1000);
  const locale = localeOf(lang);
  const t = (k: TKey) => STRINGS[lang][k] ?? STRINGS.ru[k];

  const showToast = (msg: string) => setToast({ id: Date.now(), msg });
  const saveSleep = (iso: string, d: SleepData) => { setSleep((prev) => ({ ...prev, [iso]: d })); showToast(makeSleepAuto(lang)("saved")); };
  const sleepAuto = useSleepAuto(autoSleep, sleep, saveSleep);
  usePlaceReminders(lang, showToast);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(id); }, [toast]);
  useEffect(() => {
    const onFull = () => showToast(u('storageFull'));
    window.addEventListener('dn-storage-full', onFull);
    return () => window.removeEventListener('dn-storage-full', onFull);
  });
  // Уходим со страницы — отправляем накопленные правки, не дожидаясь 2 секунд
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') flushPendingSync(); };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flushPendingSync);
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flushPendingSync); };
  }, []);
  useEffect(() => { const unsubscribe = subscribeToSyncStatus(setSyncStatusState); return unsubscribe; }, []);

  useEffect(() => {
    lastLocalSettingsRef.current = { theme, lang, fontScale, writingFont, bg, moodEmoji, look: JSON.stringify(look) };
  }, [theme, lang, fontScale, writingFont, bg, moodEmoji, lookRaw]);

  const markSnapshotAsSent = (n: typeof notes, tk: typeof tasks, md: typeof moods, tg: typeof tags, ph: typeof photos, sl: typeof sleep) => {
    remoteSnapshot.current = { notes: clone(n), tasks: clone(tk), moods: clone(md), tags: clone(tg), photos: clone(ph), sleep: clone(sl) };
  };

  useEffect(() => {
    if (!authLoading && userId) {
      setLocalMode(false);
      setShowAuth(false);
      if (!e2eeReady) return;
      let cancelled = false;

      const load = async (attempt: number) => {
        const remote = await performInitialSync(userId);
        if (cancelled) return;

        if (remote) {
          // Первый вход на этом устройстве: не затираем то, что уже записано локально
          const firstLogin = localStorage.getItem("dn.syncedUser") === null;
          let data = { notes: remote.notes, tasks: remote.tasks, moods: remote.moods, tags: remote.tags, photos: remote.photos, sleep: remote.sleep };
          if (firstLogin) {
            const m = mergeLocalIntoRemote(data, localRef.current);
            data = m.merged;
            m.entries.forEach((d) => syncEntry(userId, d, data.notes[d] ?? "", data.moods[d] ?? null, data.tags[d] ?? [], data.photos[d] ?? []));
            m.taskDates.forEach((d) => syncTasks(userId, d, data.tasks[d] ?? []));
            m.sleepDates.forEach((d) => syncSleep(userId, d, data.sleep[d]));
          }
          try { localStorage.setItem("dn.syncedUser", userId); } catch { /* ignore */ }

          setNotes(data.notes);
          setTasks(data.tasks);
          setMoods(data.moods);
          setTags(data.tags);
          setPhotos(data.photos);
          setSleep(data.sleep);
          setWrittenOn(remote.writtenOn || {});

          const s = remote.settings as Record<string, any>;
          if (s) {
            if (s.theme) setTheme(s.theme);
            if (s.lang) setLang(s.lang);
            if (s.font !== undefined) setFontScale(Number(s.font));
            if (s.writingFont) setWritingFont(s.writingFont);
            if (s.bg) setBg(s.bg);
            if (s.look) setLookRaw(sanitizeLook(s.look));
            if (s.moodEmoji) setMoodEmoji(s.moodEmoji);
            if (s.capsules && typeof s.capsules === 'object') setCapsules((local) => ({ ...local, ...s.capsules }));
          }

          remoteSnapshot.current = {
            notes: clone(data.notes), tasks: clone(data.tasks), moods: clone(data.moods),
            tags: clone(data.tags), photos: clone(data.photos), sleep: clone(data.sleep),
          };
          initialLoadDone.current = true;
          // старые открытые строки (до включения шифрования или с другого устройства) дошифровываем
          if (remote.plainRows > 0 && encryptionActive()) void convertAllRemote(userId, true).catch((e) => console.error('[E2EE] background encrypt failed', e));
          if (remote.unreadable > 0) showToast(makeE2ee(lang)('unreadable'));
        } else if (attempt < 5) {
          window.setTimeout(() => { if (!cancelled) load(attempt + 1); }, 2000);
        } else {
          remoteSnapshot.current = { notes: {}, tasks: {}, moods: {}, tags: {}, photos: {}, sleep: {} };
          initialLoadDone.current = true;
          showToast(u('loadFail'));
        }
      };

      load(0);
      return () => { cancelled = true; };
    } else if (!authLoading && !userId && isLocalMode()) {
      setShowAuth(false);
    } else if (!authLoading && !userId) {
      setShowAuth(true);
    }
  }, [userId, authLoading, e2eeReady]);

  useEffect(() => {
    if (!userId || isLocalMode() || !supabase) return;

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${userId}` }, async (payload) => {
        const entry = payload.new as Record<string, any>;
        if (!entry || !entry.date) return;
        const nowMs = Date.now();
        if (nowMs - (lastUpdateTime.current[entry.date] || 0) < 3000) return;

        const body = await openEntry(userId, entry as { date: string; content?: string | null; tags?: string[] | null; photos?: unknown });
        if (!body) return;
        entry.content = body.c; entry.tags = body.t; entry.photos = body.p;
        setNotes((prev) => ({ ...prev, [entry.date]: entry.content || '' }));
        if (entry.mood !== null && entry.mood !== undefined) setMoods((prev) => ({ ...prev, [entry.date]: entry.mood }));
        if (Array.isArray(entry.tags)) setTags((prev) => ({ ...prev, [entry.date]: entry.tags }));
        if (entry.photos && Array.isArray(entry.photos)) setPhotos((prev) => ({ ...prev, [entry.date]: entry.photos }));
        if (entry.created_at) {
          setWrittenOn((prev) => ({ ...prev, [entry.date]: toISO(new Date(entry.created_at)) === entry.date }));
        }

        if (remoteSnapshot.current) {
          remoteSnapshot.current.notes[entry.date] = entry.content || '';
          if (entry.mood !== null && entry.mood !== undefined) remoteSnapshot.current.moods[entry.date] = entry.mood;
          if (Array.isArray(entry.tags)) remoteSnapshot.current.tags[entry.date] = entry.tags;
          if (entry.photos && Array.isArray(entry.photos)) remoteSnapshot.current.photos[entry.date] = entry.photos;
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, async (payload) => {
        const d = (payload.new as Record<string, any>)?.date || (payload.old as Record<string, any>)?.date;
        if (!d) return;
        const nowMs = Date.now();
        if (nowMs - (lastUpdateTime.current[`tasks-${d}`] || 0) < 3000) return;
        if (!supabase) return;
        const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).eq('date', d);
        if (data) {
          const mapped: Task[] = [];
          for (const task of data) {
            const text = await decodeTitle(userId, task);
            if (text !== null) mapped.push({ id: task.id, text, done: task.completed });
          }
          setTasks((prev) => ({ ...prev, [d]: mapped }));
          if (remoteSnapshot.current) remoteSnapshot.current.tasks[d] = clone(mapped);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_logs', filter: `user_id=eq.${userId}` }, async (payload) => {
        const s = payload.new as Record<string, any>;
        if (!s || !s.date) return;
        const nowMs = Date.now();
        if (nowMs - (lastUpdateTime.current[`sleep-${s.date}`] || 0) < 3000) return;
        const note = await decodeNote(userId, s as { date: string; note: string | null });
        if (note === null) return;
        const val = { hours: Number(s.hours) || 0, quality: s.quality || 0, bedtime: s.sleep_start || '', waketime: s.sleep_end || '', awakenings: Number(s.awakenings) || 0, note };
        setSleep((prev) => ({ ...prev, [s.date]: val }));
        if (remoteSnapshot.current) remoteSnapshot.current.sleep[s.date] = clone(val);
      })
      .subscribe();

    return () => { if (supabase) supabase.removeChannel(channel); };
  }, [userId]);

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
            if (settings.look && JSON.stringify(sanitizeLook(settings.look)) !== last.look) setLookRaw(sanitizeLook(settings.look));
            if (settings.moodEmoji && JSON.stringify(settings.moodEmoji) !== JSON.stringify(last.moodEmoji)) setMoodEmoji(settings.moodEmoji);
            if (settings.capsules && typeof settings.capsules === 'object') setCapsules((local) => ({ ...local, ...settings.capsules }));
          }
        }
      )
      .subscribe();

    return () => { if (supabase) supabase.removeChannel(profileChannel); };
  }, [userId]);

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

  // Отправляем все даты, где задачи изменились: планировщик меняет сразу несколько дней
  const prevTasks = useRef(tasks);
  useEffect(() => {
    const prev = prevTasks.current;
    prevTasks.current = tasks;
    if (!userId || isLocalMode() || !initialLoadDone.current) return;
    const snap = remoteSnapshot.current;
    if (snap && JSON.stringify(snap.tasks) === JSON.stringify(tasks)) return;
    const changed = [...new Set([...Object.keys(prev), ...Object.keys(tasks), date])]
      .filter((d) => d === date || JSON.stringify(prev[d] ?? []) !== JSON.stringify(tasks[d] ?? []))
      .slice(0, 100);
    for (const d of changed) {
      lastUpdateTime.current[`tasks-${d}`] = Date.now();
      syncTasks(userId, d, tasks[d] ?? []);
    }
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
    if (userId && !isLocalMode() && initialLoadDone.current) syncSettings(userId, { theme, lang, font: fontScale, writingFont, bg, moodEmoji, capsules, look });
  }, [theme, lang, fontScale, writingFont, bg, moodEmoji, capsules, lookRaw, userId]);

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
    if (userId && !isLocalMode()) syncSettings(userId, { theme: newTheme, lang, font: fontScale, writingFont, bg, moodEmoji, capsules, look });
  };

  useEffect(() => { updateCustomSwatch(look); applyLook(theme, look); }, [theme, lookRaw]);
  useEffect(() => { document.documentElement.style.fontSize = FONT_SCALES[fontScale] ?? "100%"; }, [fontScale]);
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.title = lang === "ru" || lang === "be" || lang === "uk" ? "Дейли Ноутс" : "Daily Notes";
  }, [lang]);

  const today = todayISO();
  let streak = 0;
  {
    let iso = writtenOn[today] && (notes[today] ?? "").trim() ? today : shiftISO(today, -1);
    for (; (notes[iso] ?? "").trim() && writtenOn[iso]; iso = shiftISO(iso, -1)) streak += 1;
  }
  const weekMarks = Array.from({ length: 7 }, (_, i) => Boolean((notes[shiftISO(today, i - 6)] ?? "").trim()));
  const notesCount = Object.keys(notes).filter((k) => (notes[k] ?? "").trim()).length;
  const tasksCount = Object.values(tasks).reduce((sum, list) => sum + (list?.length ?? 0), 0);
  const hasMood = (iso: string) => moods[iso] !== undefined;

  const clearAll = async () => {
    if (userId && !isLocalMode()) {
      const ok = await deleteAllRemote(userId);
      if (!ok) { showToast(u('syncError')); return; }
      remoteSnapshot.current = { notes: {}, tasks: {}, moods: {}, tags: {}, photos: {}, sleep: {} };
    }
    setNotes({}); setTasks({}); setMoods({}); setTags({}); setPhotos({}); setSleep({}); setDate(todayISO());
  };
  const exportMd = () => downloadText("daily-notes.md", buildMarkdown(Object.fromEntries(Object.entries(notes).map(([d, v]) => [d, isSealed(capsules, d) ? `(${u("capUntil").replace("{date}", capsules[d])})` : v])), tasks, moods, tags, lang), "text/markdown;charset=utf-8");
  const exportJson = () => downloadText(`daily-notes-backup-${todayISO()}.json`, JSON.stringify(buildBackup(localStorage), null, 2), "application/json;charset=utf-8");
  const openDate = (iso: string) => { setDate(iso); setTab("daily"); };
  const pinLen = pinHash ? Math.max(4, parseInt(pinHash.slice(-1), 36) || 4) : 4;

  if (locked && pinHash) return <LockScreen pinLength={pinLen} onTry={(pin) => { if (hashPin(pin) === pinHash) { setLocked(false); return true; } return false; }} t={t} onBiometric={bioId ? async () => { if (await verifyBiometric(bioId)) { setLocked(false); return true; } return false; } : undefined} bioLabel={makeDevice(lang)("bioUnlock")} bioFailText={makeDevice(lang)("bioFail")} />;

  const tabMeta: Record<Tab, { title: string; sub: string }> = {
    daily: { title: t("dailyTitle"), sub: t("dailySub") },
    plan: { title: t("planTitle"), sub: t("planSub") },
    stats: { title: t("statsTitle"), sub: t("statsSub") },
    notes: { title: t("notesTitle"), sub: t("notesSub") },
    sleep: { title: t("sleepTitle"), sub: t("sleepSub") },
    pair: { title: t("pairTitle"), sub: t("pairSub") },
    hobby: { title: t("hobbyTitle"), sub: t("hobbySub") },
    friends: { title: t("friendsTitle"), sub: t("friendsSub") },
    settings: { title: t("settingsTitle"), sub: t("settingsSub") },
  };

  const clock = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateChip = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(now);

  if (recovery) return <NewPasswordScreen lang={lang} />;
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><div className="animate-pulse text-[var(--ink-faint)]">{makeUI(lang)('loading')}</div></div>;
  if (userId && (e2eeStatus === 'locked' || e2eeStatus === 'error')) return <E2eeGate userId={userId} lang={lang} status={e2eeStatus} />;

  if (showAuth) return <AuthScreen lang={lang} onContinueLocally={() => { setLocalMode(true); setShowAuth(false); }} theme={theme} onTheme={handleThemeChange} />;

  const syncBadge = userId ? (
    syncStatus === 'syncing' ? <span className="hidden items-center gap-1.5 rounded-full border sm:flex border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />Синхронизация...</span> :
    syncStatus === 'error' ? <span className="hidden items-center gap-1.5 rounded-full border sm:flex border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400">{u('syncError')}</span> :
    <span className="hidden items-center gap-1.5 rounded-full border sm:flex border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Синхронизировано</span>
  ) : <span className="hidden items-center gap-1.5 rounded-full border sm:flex border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" />Локально</span>;

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

      <Sidebar tab={tab} onTab={setTab} theme={theme} onTheme={handleThemeChange} lang={lang} onLang={setLang} t={t} streak={streak} weekMarks={weekMarks} notesCount={notesCount} selectedDate={date} onPickDate={openDate} hasMood={hasMood} hasPin={Boolean(pinHash)} onLock={() => setLocked(true)} friendsBadge={chatUnread.total} />

      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        <header className="flex min-h-[74px] shrink-0 py-2 items-center gap-4 border-b border-[var(--line)] px-4 sm:px-8">
          <MobileMenu tab={tab} onTab={setTab} t={t} lang={lang} selectedDate={date} onPickDate={openDate} hasMood={hasMood} friendsBadge={chatUnread.total} />
          <div className="min-w-0">
            <h1 className="font-display truncate py-0.5 text-xl font-bold leading-snug tracking-tight sm:text-2xl">{tabMeta[tab].title}</h1>
            <p className="hidden truncate text-xs text-[var(--ink-faint)] sm:block">{tabMeta[tab].sub}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {syncBadge}
            <span className="hidden items-center gap-2.5 sm:flex">
              <span className="animate-livedot h-2 w-2 rounded-full bg-[var(--accent)]" />
              <span className="font-display text-lg font-semibold tabular-nums tracking-tight">{clock}</span>
            </span>
            <span className="hidden h-9 items-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-medium text-[var(--ink-soft)] sm:flex">{dateChip}</span>
            {userId && <AccountMenu userId={userId} lang={lang} streak={streak} notesCount={notesCount} hasPin={Boolean(pinHash)} onLock={() => setLocked(true)} onGoFriends={() => setTab("friends")} />}
          </div>
        </header>

        <main key={tab + date} className="animate-rise min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-6 sm:px-8 sm:pt-8">
          {sleepAuto.cand && <SleepSuggestion cand={sleepAuto.cand} lang={lang} onAccept={sleepAuto.accept} onDismiss={sleepAuto.dismiss} />}
          {tab === "daily" && <DailyView userId={userId} capsules={capsules} setCapsules={setCapsules} date={date} onDate={setDate} notes={notes} setNotes={setNotes} tasks={tasks} setTasks={setTasks} moods={moods} setMoods={setMoods} tags={tags} setTags={setTags} photos={photos} setPhotos={setPhotos} reminder={reminder} setReminder={setReminder} moodEmoji={moodEmoji} writingFont={writingFont} onWritingFont={setWritingFont} lang={lang} t={t} showToast={showToast} />}
          {tab === "stats" && <Suspense fallback={<div className="grid h-64 place-items-center text-sm text-[var(--ink-faint)]"><span className="animate-livedot h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /></div>}><StatsView notes={notes} tasks={tasks} moods={moods} sleep={sleep} moodEmoji={moodEmoji} lang={lang} t={t} /></Suspense>}
          {tab === "sleep" && <SleepView sleep={sleep} lang={lang} t={t} autoSleep={autoSleep} setAutoSleep={setAutoSleep} setSleep={(iso, data) => setSleep((prev) => { const next = { ...prev }; if (data) next[iso] = data; else delete next[iso]; return next; })} />}
          {tab === "pair" && !userId && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
              <h3 className="text-[16px] font-bold">{t("friendsGuestTitle")}</h3>
              <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{t("friendsGuestBody")}</p>
              <button onClick={() => { setLocalMode(false); setShowAuth(true); }} className="mt-2 h-11 rounded-lg bg-[var(--accent)] px-5 text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95">{t("loginBtn")}</button>
            </div>
          )}
          {tab === "pair" && userId && <PairView userId={userId} lang={lang} sleep={sleep} />}
          {tab === "hobby" && <HobbyView lang={lang} />}
          {tab === "plan" && <PlannerView moods={moods} moodEmoji={moodEmoji} tasks={tasks} setTasks={setTasks} onOpen={openDate} lang={lang} showToast={showToast} />}
          {tab === "notes" && <NotesView capsules={capsules} notes={notes} tasks={tasks} moods={moods} tags={tags} photos={photos} moodEmoji={moodEmoji} writingFont={writingFont} onOpen={openDate} lang={lang} t={t} />}
          {tab === "friends" && !userId && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
              <h3 className="text-[16px] font-bold">{t("friendsGuestTitle")}</h3>
              <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{t("friendsGuestBody")}</p>
              <button onClick={() => { setLocalMode(false); setShowAuth(true); }} className="mt-2 h-11 rounded-lg bg-[var(--accent)] px-5 text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95">{t("loginBtn")}</button>
            </div>
          )}
          {tab === "friends" && userId && <FriendsView userId={userId} lang={lang} moodEmoji={moodEmoji} streak={streak} notesCount={notesCount} chatUnread={chatUnread.byFriend} />}
          {tab === "settings" && <SettingsView userId={userId} look={look} onLook={setLook} theme={theme} onTheme={handleThemeChange} lang={lang} onLang={setLang} writingFont={writingFont} onWritingFont={setWritingFont} fontScale={fontScale} onFontScale={setFontScale} bg={bg} onBg={setBg} moodEmoji={moodEmoji} onMoodEmoji={setMoodEmoji} pinHash={pinHash} onPinChange={(h) => { setPinHash(h); if (!h) setBioId(null); }} bioId={bioId} onBioChange={setBioId} onClearAll={clearAll} onExportMd={exportMd} onExportJson={exportJson} t={t} notesCount={notesCount} tasksCount={tasksCount} tasks={tasks} showToast={showToast} />}
        </main>
      </div>

      {toast && (
        <div key={toast.id} className="animate-rise fixed left-1/2 z-[70] -translate-x-1/2" style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-2.5 text-[13.5px] font-semibold" style={{ boxShadow: "var(--shadow)" }}>
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />{toast.msg}
          </div>
        </div>
      )}
      <CallOverlay call={call} />
      <InstallPrompt lang={lang} />
    </div>
  );
}
