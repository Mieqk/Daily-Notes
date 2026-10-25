import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { fromISO, shiftISO, todayISO } from "../store";
import { useSyncedStored, mergeById, mergeLog, preferRemote } from "../lib/fitnessSync";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";
import CoachChat, { SEG, type CoachItem } from "./CoachChat";

interface WSet { id: string; kg: number; reps: number; done: boolean }
interface WEx { id: string; name: string; sets: WSet[] }
interface Tpl { id: string; name: string; ex: { name: string; sets: { kg: number; reps: number }[] }[] }

const L: Record<string, {
  today: string; more: string; build: string; volume: string; setsDone: string; exercises: string; kg: string; reps: string; set: string; addEx: string; exPh: string; addSet: string; last: string; record: string; newRecord: string; empty: string;
  rest: string; stop: string; sec: string;
  tplTitle: string; tplEmpty: string; tplSave: string; tplName: string; tplApply: string; tplSaved: string;
  aiTitle: string; aiHint: string; aiWarn: string; aiEnable: string; aiDisable: string; aiPh: string; aiRun: string; aiLoading: string; aiErr: string; aiNote: string; cancel: string;
}> = {
  ru: { today: "Сегодня", more: "Ещё", build: "Составить", volume: "Объём, кг", setsDone: "Подходов", exercises: "Упражнений", kg: "кг", reps: "повт.", set: "Подход", addEx: "Добавить", exPh: "Название упражнения", addSet: "+ подход", last: "Прошлый раз", record: "Рекорд", newRecord: "Новый рекорд!", empty: "Пока пусто. Добавьте упражнение, возьмите шаблон или попросите ИИ составить тренировку.", rest: "Отдых", stop: "Стоп", sec: "с", tplTitle: "Шаблоны тренировок", tplEmpty: "Шаблонов нет. Соберите тренировку и сохраните её, чтобы повторять одним нажатием.", tplSave: "Сохранить как шаблон", tplName: "Название шаблона", tplApply: "Нажмите, чтобы добавить в день", tplSaved: "Шаблон сохранён", aiTitle: "Составить тренировку с ИИ", aiHint: "Напишите цель, мышцы, время и инвентарь, ИИ предложит упражнения.", aiWarn: "В Google Gemini уйдёт только текст, который вы здесь введёте. Записи дневника и личные данные не отправляются. Функция выключена, пока вы её не включите.", aiEnable: "Включить и разрешить отправку", aiDisable: "Выключить", aiPh: "Например: грудь и трицепс, 45 минут, гантели", aiRun: "Составить и добавить", aiLoading: "ИИ составляет…", aiErr: "Не получилось составить тренировку. Попробуйте описать иначе.", aiNote: "Это общий совет, не медицинский. Веса впишите сами. Нагрузку подбирайте по самочувствию.", cancel: "Отмена" },
  en: { today: "Today", more: "More", build: "Build", volume: "Volume, kg", setsDone: "Sets", exercises: "Exercises", kg: "kg", reps: "reps", set: "Set", addEx: "Add", exPh: "Exercise name", addSet: "+ set", last: "Last time", record: "Record", newRecord: "New record!", empty: "Nothing yet. Add an exercise, pick a template or ask the AI to build a workout.", rest: "Rest", stop: "Stop", sec: "s", tplTitle: "Workout templates", tplEmpty: "No templates. Build a workout and save it to repeat it in one tap.", tplSave: "Save as template", tplName: "Template name", tplApply: "Tap to add to the day", tplSaved: "Template saved", aiTitle: "Build a workout with AI", aiHint: "Write your goal, muscles, time and equipment and the AI suggests exercises.", aiWarn: "Only the text you type here is sent to Google Gemini. Your diary entries and personal data are never sent. This stays off until you turn it on.", aiEnable: "Turn on and allow sending", aiDisable: "Turn off", aiPh: "E.g. chest and triceps, 45 minutes, dumbbells", aiRun: "Build and add", aiLoading: "AI is building…", aiErr: "Couldn't build a workout. Try describing it differently.", aiNote: "General advice, not medical. Fill in your own weights and adjust the load to how you feel.", cancel: "Cancel" },
  be: { today: "Сёння", more: "Яшчэ", build: "Скласці", volume: "Аб'ём, кг", setsDone: "Падыходаў", exercises: "Практыкаванняў", kg: "кг", reps: "паўт.", set: "Падыход", addEx: "Дадаць", exPh: "Назва практыкавання", addSet: "+ падыход", last: "Мінулы раз", record: "Рэкорд", newRecord: "Новы рэкорд!", empty: "Пакуль пуста. Дадайце практыкаванне, вазьміце шаблон або папрасіце ШІ скласці трэніроўку.", rest: "Адпачынак", stop: "Стоп", sec: "с", tplTitle: "Шаблоны трэніровак", tplEmpty: "Шаблонаў няма. Складзіце трэніроўку і захавайце яе, каб паўтараць адным націскам.", tplSave: "Захаваць як шаблон", tplName: "Назва шаблона", tplApply: "Націсніце, каб дадаць у дзень", tplSaved: "Шаблон захаваны", aiTitle: "Скласці трэніроўку з ШІ", aiHint: "Напішыце мэту, мышцы, час і інвентар, ШІ прапануе практыкаванні.", aiWarn: "У Google Gemini пойдзе толькі тэкст, які вы тут увядзяце. Запісы дзённіка і асабістыя даныя не адпраўляюцца. Функцыя выключана, пакуль вы яе не ўключыце.", aiEnable: "Уключыць і дазволіць адпраўку", aiDisable: "Выключыць", aiPh: "Напрыклад: грудзі і трыцэпс, 45 хвілін, гантэлі", aiRun: "Скласці і дадаць", aiLoading: "ШІ складае…", aiErr: "Не атрымалася скласці трэніроўку. Паспрабуйце апісаць інакш.", aiNote: "Гэта агульная парада, не медыцынская. Вагі ўпішыце самі. Нагрузку падбірайце па самаадчуванні.", cancel: "Скасаваць" },
  uk: { today: "Сьогодні", more: "Ще", build: "Скласти", volume: "Обсяг, кг", setsDone: "Підходів", exercises: "Вправ", kg: "кг", reps: "повт.", set: "Підхід", addEx: "Додати", exPh: "Назва вправи", addSet: "+ підхід", last: "Минулого разу", record: "Рекорд", newRecord: "Новий рекорд!", empty: "Поки порожньо. Додайте вправу, візьміть шаблон або попросіть ШІ скласти тренування.", rest: "Відпочинок", stop: "Стоп", sec: "с", tplTitle: "Шаблони тренувань", tplEmpty: "Шаблонів немає. Складіть тренування й збережіть його, щоб повторювати одним дотиком.", tplSave: "Зберегти як шаблон", tplName: "Назва шаблону", tplApply: "Торкніться, щоб додати в день", tplSaved: "Шаблон збережено", aiTitle: "Скласти тренування з ШІ", aiHint: "Напишіть мету, м'язи, час та інвентар, ШІ запропонує вправи.", aiWarn: "До Google Gemini піде лише текст, який ви тут введете. Записи щоденника й особисті дані не надсилаються. Функція вимкнена, доки ви її не ввімкнете.", aiEnable: "Увімкнути й дозволити надсилання", aiDisable: "Вимкнути", aiPh: "Наприклад: груди й трицепс, 45 хвилин, гантелі", aiRun: "Скласти й додати", aiLoading: "ШІ складає…", aiErr: "Не вдалося скласти тренування. Спробуйте описати інакше.", aiNote: "Це загальна порада, не медична. Ваги впишіть самі. Навантаження добирайте за самопочуттям.", cancel: "Скасувати" },
  de: { today: "Heute", more: "Mehr", build: "Erstellen", volume: "Volumen, kg", setsDone: "Sätze", exercises: "Übungen", kg: "kg", reps: "Wdh.", set: "Satz", addEx: "Hinzufügen", exPh: "Name der Übung", addSet: "+ Satz", last: "Letztes Mal", record: "Rekord", newRecord: "Neuer Rekord!", empty: "Noch leer. Fügen Sie eine Übung hinzu, nehmen Sie eine Vorlage oder lassen Sie die KI ein Training erstellen.", rest: "Pause", stop: "Stopp", sec: "s", tplTitle: "Trainingsvorlagen", tplEmpty: "Keine Vorlagen. Stellen Sie ein Training zusammen und speichern Sie es, um es mit einem Tipp zu wiederholen.", tplSave: "Als Vorlage speichern", tplName: "Name der Vorlage", tplApply: "Tippen, um zum Tag hinzuzufügen", tplSaved: "Vorlage gespeichert", aiTitle: "Training mit KI erstellen", aiHint: "Schreiben Sie Ziel, Muskeln, Zeit und Geräte, die KI schlägt Übungen vor.", aiWarn: "Nur der hier eingegebene Text wird an Google Gemini gesendet. Tagebucheinträge und persönliche Daten werden nie gesendet. Die Funktion bleibt aus, bis Sie sie einschalten.", aiEnable: "Einschalten und Senden erlauben", aiDisable: "Ausschalten", aiPh: "Z. B.: Brust und Trizeps, 45 Minuten, Kurzhanteln", aiRun: "Erstellen und hinzufügen", aiLoading: "KI erstellt…", aiErr: "Das Training konnte nicht erstellt werden. Beschreiben Sie es anders.", aiNote: "Allgemeiner Rat, kein medizinischer. Tragen Sie Ihre Gewichte selbst ein und passen Sie die Last Ihrem Befinden an.", cancel: "Abbrechen" },
  fr: { today: "Aujourd’hui", more: "Plus", build: "Composer", volume: "Volume, kg", setsDone: "Séries", exercises: "Exercices", kg: "kg", reps: "rép.", set: "Série", addEx: "Ajouter", exPh: "Nom de l’exercice", addSet: "+ série", last: "Dernière fois", record: "Record", newRecord: "Nouveau record !", empty: "Rien pour l’instant. Ajoute un exercice, prends un modèle ou demande à l’IA de composer une séance.", rest: "Repos", stop: "Stop", sec: "s", tplTitle: "Modèles de séance", tplEmpty: "Aucun modèle. Compose une séance et enregistre-la pour la refaire en un geste.", tplSave: "Enregistrer comme modèle", tplName: "Nom du modèle", tplApply: "Touche pour ajouter à la journée", tplSaved: "Modèle enregistré", aiTitle: "Composer une séance avec l’IA", aiHint: "Écris ton objectif, les muscles, la durée et le matériel, l’IA propose des exercices.", aiWarn: "Seul le texte saisi ici est envoyé à Google Gemini. Tes notes de journal et tes données personnelles ne sont jamais envoyées. La fonction reste désactivée tant que tu ne l’actives pas.", aiEnable: "Activer et autoriser l’envoi", aiDisable: "Désactiver", aiPh: "Ex. : pectoraux et triceps, 45 minutes, haltères", aiRun: "Composer et ajouter", aiLoading: "L’IA compose…", aiErr: "Impossible de composer la séance. Essaie de la décrire autrement.", aiNote: "Conseil général, pas médical. Renseigne tes charges toi-même et adapte l’effort à ton état.", cancel: "Annuler" },
  es: { today: "Hoy", more: "Más", build: "Armar", volume: "Volumen, kg", setsDone: "Series", exercises: "Ejercicios", kg: "kg", reps: "rep.", set: "Serie", addEx: "Añadir", exPh: "Nombre del ejercicio", addSet: "+ serie", last: "Última vez", record: "Récord", newRecord: "¡Nuevo récord!", empty: "Aún no hay nada. Añade un ejercicio, elige una plantilla o pide a la IA que arme un entrenamiento.", rest: "Descanso", stop: "Parar", sec: "s", tplTitle: "Plantillas de entrenamiento", tplEmpty: "No hay plantillas. Arma un entrenamiento y guárdalo para repetirlo con un toque.", tplSave: "Guardar como plantilla", tplName: "Nombre de la plantilla", tplApply: "Toca para añadir al día", tplSaved: "Plantilla guardada", aiTitle: "Armar entrenamiento con IA", aiHint: "Escribe tu objetivo, músculos, tiempo y material y la IA propone ejercicios.", aiWarn: "A Google Gemini solo se envía el texto que escribas aquí. Nunca se envían tus entradas del diario ni datos personales. Se mantiene desactivado hasta que lo actives.", aiEnable: "Activar y permitir el envío", aiDisable: "Desactivar", aiPh: "Ej.: pecho y tríceps, 45 minutos, mancuernas", aiRun: "Armar y añadir", aiLoading: "La IA está armando…", aiErr: "No se pudo armar el entrenamiento. Prueba a describirlo de otra forma.", aiNote: "Consejo general, no médico. Anota tus propios pesos y ajusta la carga a cómo te sientas.", cancel: "Cancelar" },
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const toNum = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : 0; };
const key = (name: string) => name.trim().toLowerCase();
const fmt = (n: number) => String(Math.round(n * 10) / 10);

const inputCls = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";
const btnCls = "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95 disabled:opacity-60";
const primaryCls = "flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all duration-150 active:scale-95 disabled:opacity-50";

export default function WorkoutView({ lang }: { lang: Lang }) {
  const l = L[lang] ?? L.en;
  const [log, setLog] = useSyncedStored<Record<string, WEx[]>>("workoutLog", {}, mergeLog<WEx>());
  const [tpls, setTpls] = useSyncedStored<Tpl[]>("workoutTpl", [], mergeById<Tpl>((t) => t.name.trim().toLowerCase()));
  const [view, setView] = useState<"coach" | "day">("coach");
  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState("");
  const [tplName, setTplName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rest, setRest] = useState(0);
  const [restLen, setRestLen] = useSyncedStored<number>("restLen", 90, preferRemote);

  useEffect(() => {
    if (rest <= 0) return;
    const id = setTimeout(() => setRest((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [rest]);

  const day = log[date] ?? [];
  const setDay = (next: WEx[]) => setLog((prev) => { const n = { ...prev }; if (next.length) n[date] = next; else delete n[date]; return n; });
  const updateEx = (id: string, fn: (e: WEx) => WEx) => setDay(day.map((e) => (e.id === id ? fn(e) : e)));

  // История других дней: прошлый результат и личный рекорд по названию упражнения
  const history = (exName: string) => {
    const k = key(exName);
    let lastDate = "";
    let lastSets: WSet[] = [];
    let best = 0;
    for (const [d, exs] of Object.entries(log)) {
      if (d === date) continue;
      for (const e of exs) {
        if (key(e.name) !== k) continue;
        const done = e.sets.filter((s) => s.done);
        for (const s of done) best = Math.max(best, s.kg);
        if (done.length && d < date && d > lastDate) { lastDate = d; lastSets = done; }
      }
    }
    return { lastSets, best };
  };

  const knownNames = Array.from(new Set([...Object.values(log).flat().map((e) => e.name), ...tpls.flatMap((t) => t.ex.map((e) => e.name))]));
  const blank = (n: string, sets: { kg: number; reps: number }[] = [{ kg: 0, reps: 10 }]): WEx => ({ id: uid(), name: n, sets: sets.map((s) => ({ id: uid(), kg: s.kg, reps: s.reps, done: false })) });

  const addEx = () => {
    const n = name.trim().slice(0, 60);
    if (!n) return;
    const prev = history(n).lastSets;
    setDay([...day, blank(n, prev.length ? prev.map((s) => ({ kg: s.kg, reps: s.reps })) : undefined)]);
    setName("");
  };

  const setField = (exId: string, sid: string, patch: Partial<WSet>) => { if (patch.done) setRest(restLen); updateEx(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })); };
  const addSet = (exId: string) => updateEx(exId, (e) => {
    const last = e.sets[e.sets.length - 1];
    return { ...e, sets: [...e.sets, { id: uid(), kg: last?.kg ?? 0, reps: last?.reps ?? 10, done: false }] };
  });
  const delSet = (exId: string, sid: string) => {
    const ex = day.find((e) => e.id === exId);
    if (!ex) return;
    const sets = ex.sets.filter((s) => s.id !== sid);
    setDay(sets.length ? day.map((e) => (e.id === exId ? { ...e, sets } : e)) : day.filter((e) => e.id !== exId));
  };

  const saveTpl = () => {
    const n = tplName.trim().slice(0, 40);
    if (!n || !day.length) return;
    setTpls((prev) => [...prev, { id: uid(), name: n, ex: day.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps })) })) }]);
    setTplName("");
    setSaving(false);
    setMsg(l.tplSaved);
  };
  const applyTpl = (t: Tpl) => setDay([...day, ...t.ex.map((e) => blank(e.name, e.sets))]);

  const doneSets = day.flatMap((e) => e.sets.filter((s) => s.done));
  const volume = doneSets.reduce((a, s) => a + s.kg * s.reps, 0);
  const topWeights = Object.values(log).flat().reduce<Record<string, number>>((acc, e) => {
    const best = Math.max(0, ...e.sets.filter((x) => x.done).map((x) => x.kg));
    if (best > 0) acc[e.name] = Math.max(acc[e.name] ?? 0, best);
    return acc;
  }, {});
  const coachContext =
    (day.length ? `Today's exercises: ${day.map((e) => `${e.name} ${e.sets.map((x) => `${fmt(x.kg)}x${x.reps}${x.done ? " done" : ""}`).join(", ")}`).join("; ")}.` : "No exercises logged today.") +
    (Object.keys(topWeights).length ? ` Best weights so far: ${Object.entries(topWeights).slice(0, 8).map(([n, kg]) => `${n} ${fmt(kg)} kg`).join(", ")}.` : "");
  // подходы и повторы берём из плана тренера, а вес (тренер ставит 0) из прошлой тренировки с этим упражнением
  const applyCoach = (items: CoachItem[]) => setDay([...day, ...items.map((it) => {
    const prev = history(it.name).lastSets;
    const kg = it.kg || prev[prev.length - 1]?.kg || 0;
    return blank(it.name, Array.from({ length: it.sets ?? 3 }, () => ({ kg, reps: it.reps ?? 10 })));
  })]);
  const dateLabel = date === todayISO() ? l.today : new Intl.DateTimeFormat(localeOf(lang), { weekday: "short", day: "numeric", month: "short" }).format(fromISO(date));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      {/* переключатель закреплён сверху: в длинном чате до него не нужно долго листать */}
      <div className="sticky -top-6 z-20 -mx-4 -mb-2 -mt-6 bg-[var(--bg)] px-4 pb-2 pt-6 sm:-top-8 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" style={{ boxShadow: "var(--shadow-sm)" }}>
          {(["coach", "day"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`h-9 rounded-lg text-[13px] font-semibold transition-all ${view === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>{SEG[lang][v]}</button>
          ))}
        </div>
      </div>

      {view === "coach" ? (
        <>
          <div className="text-[13px] text-[var(--ink-soft)]">
            {dateLabel}: <b className="text-[var(--ink)]">{day.length}</b> {l.exercises.toLowerCase()} · <b className="text-[var(--ink)]">{doneSets.length}</b> {l.setsDone.toLowerCase()} · <b className="text-[var(--ink)]">{Math.round(volume)}</b> {l.kg}
          </div>
          <CoachChat mode="workout" lang={lang} context={coachContext} onApply={applyCoach} />
        </>
      ) : (
      <>
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(shiftISO(date, -1))} className={btnCls} aria-label="‹"><ArrowLeftIcon className="h-4 w-4" /></button>
        <span className="text-[15px] font-bold">{dateLabel}</span>
        <button onClick={() => setDate(shiftISO(date, 1))} className={btnCls} aria-label="›"><ArrowRightIcon className="h-4 w-4" /></button>
      </div>

      {day.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--ink-soft)]">
          <span><b className="text-[var(--ink)]">{day.length}</b> {l.exercises.toLowerCase()} · <b className="text-[var(--ink)]">{doneSets.length}</b> {l.setsDone.toLowerCase()} · <b className="text-[var(--ink)]">{Math.round(volume)}</b> {l.kg}</span>
          <span className="flex items-center gap-1">
            <span className="mr-1 text-[12px]">{l.rest}</span>
            {[60, 90, 120].map((s) => (
              <button key={s} onClick={() => { setRestLen(s); setRest(s); }} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${restLen === s ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "border border-[var(--line)] hover:border-[var(--accent)]"}`}>{s}</button>
            ))}
          </span>
          {rest > 0 && (
            <span className="flex items-center gap-2 rounded-full bg-[var(--panel)] px-3 py-1 font-semibold" role="timer">
              <span className="tabular-nums text-[var(--ink)]">{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</span>
              <button onClick={() => setRest(0)} aria-label={l.stop} className="text-[var(--ink-faint)] hover:text-[var(--ink)]">×</button>
            </span>
          )}
        </div>
      )}

      {day.map((e) => {
        const h = history(e.name);
        return (
          <section key={e.id} className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-bold">{e.name}</div>
                {(h.lastSets.length > 0 || h.best > 0) && (
                  <div className="text-[11.5px] text-[var(--ink-faint)]">
                    {h.lastSets.length > 0 && <>{l.last}: {h.lastSets.map((s) => `${fmt(s.kg)}×${s.reps}`).join(", ")}</>}
                    {h.best > 0 && <>{h.lastSets.length > 0 ? " · " : ""}{l.record}: {fmt(h.best)} {l.kg}</>}
                  </div>
                )}
              </div>
              <button onClick={() => setDay(day.filter((x) => x.id !== e.id))} aria-label="×" className="px-1 text-[var(--ink-faint)] hover:text-red-400">×</button>
            </div>
            <ul className="flex flex-col gap-2">
              {e.sets.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="w-5 text-center text-[12px] text-[var(--ink-faint)]" title={l.set}>{i + 1}</span>
                  <input className={`${inputCls} text-right`} inputMode="decimal" value={s.kg || ""} placeholder={l.kg} aria-label={l.kg} onChange={(ev) => setField(e.id, s.id, { kg: toNum(ev.target.value) })} />
                  <span className="text-[12px] text-[var(--ink-faint)]">×</span>
                  <input className={`${inputCls} text-right`} inputMode="numeric" value={s.reps || ""} placeholder={l.reps} aria-label={l.reps} onChange={(ev) => setField(e.id, s.id, { reps: Math.round(toNum(ev.target.value)) })} />
                  <button
                    onClick={() => setField(e.id, s.id, { done: !s.done })}
                    aria-pressed={s.done}
                    className={`h-9 w-9 shrink-0 rounded-lg border text-[14px] font-bold transition-all active:scale-95 ${s.done ? "border-transparent bg-[var(--accent)] text-[var(--accent-ink)]" : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-faint)]"}`}
                  >✓</button>
                  {s.done && h.best > 0 && s.kg > h.best && <span className="text-[11px] font-bold text-[var(--accent-deep)]">{l.newRecord}</span>}
                  <button onClick={() => delSet(e.id, s.id)} aria-label="×" className="px-1 text-[var(--ink-faint)] hover:text-red-400">×</button>
                </li>
              ))}
            </ul>
            <button onClick={() => addSet(e.id)} className="self-start text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent-deep)]">{l.addSet}</button>
          </section>
        );
      })}

      {day.length === 0 && <p className="text-[13px] text-[var(--ink-faint)]">{l.empty}</p>}

      <section className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input className={`${inputCls} !h-11`} list="dn-exercises" value={name} placeholder={l.exPh} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addEx(); }} />
          <datalist id="dn-exercises">{knownNames.map((n) => <option key={n} value={n} />)}</datalist>
          <button onClick={addEx} disabled={!name.trim()} className={primaryCls}>{l.addEx}</button>
        </div>
        {tpls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tpls.map((t) => (
              <button key={t.id} onClick={() => applyTpl(t)} title={t.ex.map((e) => e.name).join(", ")} className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[12.5px] font-semibold hover:border-[var(--accent)] active:scale-95">+ {t.name}</button>
            ))}
          </div>
        )}
      </section>

      <details className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <summary className="cursor-pointer select-none text-[13px] font-semibold text-[var(--ink-soft)]">{l.more}</summary>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold">{l.tplTitle}</span>
            {day.length > 0 && (
              <div className="flex gap-2">
                <input className={inputCls} value={tplName} placeholder={l.tplName} maxLength={40} onChange={(e) => setTplName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTpl(); }} />
                <button onClick={saveTpl} disabled={!tplName.trim()} className={btnCls}>{l.tplSave}</button>
              </div>
            )}
            {tpls.length === 0 ? (
              <p className="text-[12px] text-[var(--ink-faint)]">{l.tplEmpty}</p>
            ) : (
              <ul className="flex flex-col">
                {tpls.map((t) => (
                  <li key={t.id} className="flex items-center justify-between border-b border-[var(--line)] py-2 text-[13px]">
                    <span className="truncate">{t.name}</span>
                    <button onClick={() => setTpls(tpls.filter((x) => x.id !== t.id))} aria-label="×" className="px-1 text-[var(--ink-faint)] hover:text-red-400">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {msg && <p className="text-[12.5px] font-semibold text-[var(--ink-soft)]" role="status">{msg}</p>}
        </div>
      </details>
      </>
      )}
    </div>
  );
}
