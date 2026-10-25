import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import type { Task } from "../store";
import { fromISO, shiftISO, toISO, todayISO } from "../store";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, TrashIcon } from "../icons";
import { generateUUID } from "../lib/uuid";
import { plural } from "../plural";

interface Props {
  tasks: Record<string, Task[]>;
  setTasks: Dispatch<SetStateAction<Record<string, Task[]>>>;
  onOpen: (iso: string) => void;
  lang: Lang;
  showToast: (msg: string) => void;
}

const S = {
  ru: { hint: "Нажмите на первый и последний день, чтобы выбрать сразу несколько", today: "Сегодня", none: "Выберите день или несколько дней в календаре", tasks: "Задачи, каждая с новой строки", each: "В каждый выбранный день", spread: "Разложить по дням: строка 1 в первый день, строка 2 во второй…", add: "Добавить в план", added: "План добавлен", open: "Открыть день", empty: "На этот день пока ничего нет", reset: "Снять выбор", picking: "Теперь нажмите на последний день" },
  en: { hint: "Tap the first and the last day to select several at once", today: "Today", none: "Pick a day or several days in the calendar", tasks: "Tasks, one per line", each: "On every selected day", spread: "Spread over days: line 1 on the first day, line 2 on the second…", add: "Add to plan", added: "Plan added", open: "Open day", empty: "Nothing planned for this day yet", reset: "Clear selection", picking: "Now tap the last day" },
  be: { hint: "Націсніце на першы і апошні дзень, каб выбраць адразу некалькі", today: "Сёння", none: "Выберыце дзень або некалькі дзён у каляндары", tasks: "Задачы, кожная з новага радка", each: "У кожны выбраны дзень", spread: "Раскласці па днях: радок 1 у першы дзень, радок 2 у другі…", add: "Дадаць у план", added: "План дададзены", open: "Адкрыць дзень", empty: "На гэты дзень пакуль нічога няма", reset: "Зняць выбар", picking: "Цяпер націсніце на апошні дзень" },
  uk: { hint: "Натисніть на перший і останній день, щоб вибрати одразу кілька", today: "Сьогодні", none: "Виберіть день або кілька днів у календарі", tasks: "Задачі, кожна з нового рядка", each: "У кожен вибраний день", spread: "Розкласти по днях: рядок 1 у перший день, рядок 2 у другий…", add: "Додати в план", added: "План додано", open: "Відкрити день", empty: "На цей день поки нічого немає", reset: "Зняти вибір", picking: "Тепер натисніть на останній день" },
  de: { hint: "Tippe auf den ersten und den letzten Tag, um mehrere auszuwählen", today: "Heute", none: "Wähle einen oder mehrere Tage im Kalender", tasks: "Aufgaben, eine pro Zeile", each: "An jedem gewählten Tag", spread: "Auf Tage verteilen: Zeile 1 am ersten Tag, Zeile 2 am zweiten…", add: "Zum Plan hinzufügen", added: "Plan hinzugefügt", open: "Tag öffnen", empty: "Für diesen Tag ist noch nichts geplant", reset: "Auswahl aufheben", picking: "Jetzt den letzten Tag antippen" },
  fr: { hint: "Touchez le premier et le dernier jour pour en choisir plusieurs", today: "Aujourd'hui", none: "Choisissez un ou plusieurs jours dans le calendrier", tasks: "Tâches, une par ligne", each: "Chaque jour choisi", spread: "Répartir : ligne 1 le premier jour, ligne 2 le deuxième…", add: "Ajouter au plan", added: "Plan ajouté", open: "Ouvrir le jour", empty: "Rien de prévu ce jour-là", reset: "Annuler la sélection", picking: "Touchez maintenant le dernier jour" },
  es: { hint: "Toca el primer y el último día para elegir varios a la vez", today: "Hoy", none: "Elige un día o varios en el calendario", tasks: "Tareas, una por línea", each: "En cada día elegido", spread: "Repartir: línea 1 el primer día, línea 2 el segundo…", add: "Añadir al plan", added: "Plan añadido", open: "Abrir día", empty: "Nada planeado para este día", reset: "Quitar selección", picking: "Ahora toca el último día" },
};

const MAX_RANGE = 62;

/** Календарь-планировщик: выбрать диапазон дней и расписать на них задачи. */
export default function PlannerView({ tasks, setTasks, onOpen, lang, showToast }: Props) {
  const s = S[lang] ?? S.en;
  const locale = localeOf(lang);
  const today = todayISO();
  const [cursor, setCursor] = useState(() => { const d = fromISO(today); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [range, setRange] = useState<[string, string] | null>([today, today]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [spread, setSpread] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, month, i + 1)))];
  while (cells.length % 7 !== 0) cells.push(null);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i))), [locale]);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", weekday: "short" }).format(fromISO(iso));

  const days = useMemo(() => {
    if (!range) return [];
    const out: string[] = [];
    for (let d = range[0]; d <= range[1] && out.length < MAX_RANGE; d = shiftISO(d, 1)) out.push(d);
    return out;
  }, [range]);

  const pick = (iso: string) => {
    if (anchor) {
      const [a, b] = anchor <= iso ? [anchor, iso] : [iso, anchor];
      setRange([a, b]);
      setAnchor(null);
    } else {
      setRange([iso, iso]);
      setAnchor(iso);
    }
  };

  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 60);
  const add = () => {
    if (!lines.length || !days.length) return;
    setTasks((m) => {
      const next = { ...m };
      days.forEach((d, i) => {
        const items = spread ? (lines[i] ? [lines[i]] : []) : lines;
        if (!items.length) return;
        const cur = next[d] ?? [];
        const fresh = items.filter((t) => !cur.some((c) => c.text === t)).map((t) => ({ id: generateUUID(), text: t, done: false }));
        if (fresh.length) next[d] = [...cur, ...fresh];
      });
      return next;
    });
    setText("");
    showToast(s.added);
  };

  const toggle = (d: string, id: string) => setTasks((m) => ({ ...m, [d]: (m[d] ?? []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  const remove = (d: string, id: string) => setTasks((m) => ({ ...m, [d]: (m[d] ?? []).filter((x) => x.id !== id) }));

  const navBtn = "grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all hover:border-[var(--ink-faint)] hover:text-[var(--ink)] active:scale-90";
  const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5";
  const inRange = (iso: string) => Boolean(range && iso >= range[0] && iso <= range[1]);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className={`animate-rise ${card}`} style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className={navBtn} aria-label="previous month"><ArrowLeftIcon className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className={navBtn} aria-label="next month"><ArrowRightIcon className="h-4 w-4" /></button>
          <h3 className="font-display text-lg font-bold first-letter:uppercase">{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor)}</h3>
          <button
            onClick={() => { const d = fromISO(today); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setRange([today, today]); setAnchor(null); }}
            className="h-9 rounded-full border border-[var(--accent)] px-4 text-[12.5px] font-semibold text-[var(--accent-deep)] transition-all hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] active:scale-95"
          >
            {s.today}
          </button>
        </div>
        <p className={`mb-4 text-[12.5px] ${anchor ? "font-semibold text-[var(--accent-deep)]" : "text-[var(--ink-faint)]"}`}>{anchor ? s.picking : s.hint}</p>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekdays.map((w) => <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{w}</div>)}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e${i}`} />;
            const list = tasks[iso] ?? [];
            const sel = inRange(iso);
            const isToday = iso === today;
            const past = iso < today;
            return (
              <button
                key={iso}
                onClick={() => pick(iso)}
                aria-pressed={sel}
                className={`flex min-h-[52px] flex-col items-stretch rounded-lg border p-1 text-left transition-all active:scale-[0.97] sm:min-h-[96px] sm:p-1.5 ${sel ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--ink-faint)]"} ${past && !sel ? "opacity-60" : ""}`}
              >
                <span className={`mb-0.5 self-start rounded-md px-1 text-[12px] font-bold tabular-nums ${isToday ? "bg-[var(--accent)] text-[var(--accent-ink)]" : ""}`}>{Number(iso.slice(8))}</span>
                {/* на телефоне только точки, на широком экране тексты задач */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {list.slice(0, 4).map((x) => <span key={x.id} className={`h-1.5 w-1.5 rounded-full ${x.done ? "bg-[var(--ink-faint)]" : "bg-[var(--accent)]"}`} />)}
                </span>
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {list.slice(0, 3).map((x) => (
                    <span key={x.id} className={`truncate rounded px-1 text-[10.5px] leading-[1.35] ${x.done ? "text-[var(--ink-faint)] line-through" : "bg-[var(--hover)] text-[var(--ink-soft)]"}`}>{x.text}</span>
                  ))}
                  {list.length > 3 && <span className="px-1 text-[10px] font-semibold text-[var(--ink-faint)]">+{list.length - 3}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`animate-rise ${card} xl:sticky xl:top-0`} style={{ boxShadow: "var(--shadow-sm)" }}>
        {!range ? (
          <p className="text-[13px] text-[var(--ink-faint)]">{s.none}</p>
        ) : (
          <>
            <div className="mb-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[15px] font-bold first-letter:uppercase">{days.length > 1 ? `${fmt(days[0])} — ${fmt(days[days.length - 1])}` : fmt(days[0])}</h3>
                <p className="text-[12px] text-[var(--ink-faint)]">{days.length} {plural(lang, days.length, "day")}</p>
              </div>
              {days.length === 1 && (
                <button onClick={() => onOpen(days[0])} className="h-8 shrink-0 rounded-lg bg-[var(--accent)] px-3 text-[12px] font-bold text-[var(--accent-ink)] active:scale-95">{s.open}</button>
              )}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={s.tasks}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
            />
            {days.length > 1 && (
              <div className="mt-2 space-y-1.5 text-[12.5px]">
                {[false, true].map((v) => (
                  <label key={String(v)} className="flex cursor-pointer items-start gap-2">
                    <input type="radio" checked={spread === v} onChange={() => setSpread(v)} className="mt-0.5 accent-[var(--accent)]" />
                    <span>{v ? s.spread : s.each}</span>
                  </label>
                ))}
              </div>
            )}
            <button onClick={add} disabled={!lines.length} className="mt-3 h-10 w-full rounded-lg bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)] transition-opacity active:scale-[0.98] disabled:opacity-50">{s.add}</button>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {days.map((d) => {
                const list = tasks[d] ?? [];
                if (days.length > 1 && !list.length) return null;
                return (
                  <div key={d}>
                    {days.length > 1 && (
                      <button onClick={() => onOpen(d)} className="mb-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)] hover:text-[var(--accent-deep)]">{fmt(d)}</button>
                    )}
                    {!list.length && <p className="text-[12.5px] text-[var(--ink-faint)]">{s.empty}</p>}
                    <ul className="flex flex-col">
                      {list.map((x) => (
                        <li key={x.id} className="group flex items-center gap-2 py-1">
                          <button onClick={() => toggle(d, x.id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${x.done ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]" : "border-[var(--line)] hover:border-[var(--accent)]"}`} aria-label="toggle task">
                            {x.done && <CheckIcon className="h-3 w-3" />}
                          </button>
                          <span className={`min-w-0 flex-1 text-[13px] ${x.done ? "text-[var(--ink-faint)] line-through" : ""}`}>{x.text}</span>
                          <button onClick={() => remove(d, x.id)} className="grid h-6 w-6 place-items-center rounded-md text-[var(--ink-faint)] opacity-60 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] sm:opacity-0 sm:group-hover:opacity-100" aria-label="delete task"><TrashIcon className="h-3.5 w-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            {days.length > 1 && (
              <button onClick={() => { setRange(null); setAnchor(null); }} className="mt-3 text-[12px] font-semibold text-[var(--ink-faint)] underline hover:text-[var(--ink)]">{s.reset}</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
