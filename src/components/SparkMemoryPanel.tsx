import { useState } from "react";
import type { Lang } from "../i18n";
import { MAX_FACTS, MAX_FACT_LEN, addFact, removeFact, type SparkMemory } from "../lib/sparkMemory";

interface S { title: string; hint: string; enable: string; on: string; empty: string; ph: string; add: string; del: string; forget: string; confirm: string; full: string; count: string }
const T: Record<Lang, S> = {
  ru: { title: "Память Искры", hint: "Искра запоминает только то, что вы сами добавите: цели и факты о вас. Они хранятся на этом устройстве и отправляются в Google Gemini вместе с вашими вопросами, пока память включена. Записи дневника не отправляются.", enable: "Включить память", on: "Память включена", empty: "Пока ничего. Добавьте цель, например «хочу выучить английский к лету».", ph: "Цель или факт о вас", add: "Добавить", del: "Удалить", forget: "Забыть всё", confirm: "Нажмите ещё раз, чтобы стереть всё", full: "Память заполнена", count: "из" },
  en: { title: "Spark's memory", hint: "Spark remembers only what you add yourself: goals and facts about you. They are stored on this device and sent to Google Gemini with your questions while memory is on. Diary entries are never sent.", enable: "Turn on memory", on: "Memory is on", empty: "Nothing yet. Add a goal, e.g. “I want to learn English by summer”.", ph: "A goal or a fact about you", add: "Add", del: "Delete", forget: "Forget everything", confirm: "Tap again to erase everything", full: "Memory is full", count: "of" },
  be: { title: "Памяць Іскры", hint: "Іскра запамінае толькі тое, што вы самі дадасце: мэты і факты пра вас. Яны захоўваюцца на гэтай прыladзе і адпраўляюцца ў Google Gemini разам з вашымі пытаннямі, пакуль памяць уключана. Запісы дзённіка не адпраўляюцца.", enable: "Уключыць памяць", on: "Памяць уключана", empty: "Пакуль нічога. Дадайце мэту, напрыклад «хачу вывучыць англійскую да лета».", ph: "Мэта ці факт пра вас", add: "Дадаць", del: "Выдаліць", forget: "Забыць усё", confirm: "Націсніце яшчэ раз, каб сцерці ўсё", full: "Памяць запоўнена", count: "з" },
  uk: { title: "Пам'ять Іскри", hint: "Іскра запам'ятовує лише те, що ви самі додасте: цілі та факти про вас. Вони зберігаються на цьому пристрої й надсилаються до Google Gemini разом із вашими питаннями, поки пам'ять увімкнена. Записи щоденника не надсилаються.", enable: "Увімкнути пам'ять", on: "Пам'ять увімкнена", empty: "Поки нічого. Додайте ціль, наприклад «хочу вивчити англійську до літа».", ph: "Ціль або факт про вас", add: "Додати", del: "Видалити", forget: "Забути все", confirm: "Натисніть ще раз, щоб стерти все", full: "Пам'ять заповнена", count: "з" },
  de: { title: "Funkes Gedächtnis", hint: "Funke merkt sich nur, was du selbst hinzufügst: Ziele und Fakten über dich. Sie liegen auf diesem Gerät und werden bei eingeschaltetem Gedächtnis mit deinen Fragen an Google Gemini gesendet. Tagebucheinträge werden nie gesendet.", enable: "Gedächtnis einschalten", on: "Gedächtnis ist an", empty: "Noch nichts. Füge ein Ziel hinzu, z. B. „Bis zum Sommer Englisch lernen“.", ph: "Ein Ziel oder Fakt über dich", add: "Hinzufügen", del: "Löschen", forget: "Alles vergessen", confirm: "Nochmal tippen, um alles zu löschen", full: "Gedächtnis voll", count: "von" },
  fr: { title: "Mémoire d’Étincelle", hint: "Étincelle ne retient que ce que vous ajoutez vous-même : objectifs et faits vous concernant. Ils restent sur cet appareil et sont envoyés à Google Gemini avec vos questions tant que la mémoire est activée. Les entrées du journal ne sont jamais envoyées.", enable: "Activer la mémoire", on: "Mémoire activée", empty: "Rien pour l’instant. Ajoutez un objectif, p. ex. « apprendre l’anglais d’ici l’été ».", ph: "Un objectif ou un fait sur vous", add: "Ajouter", del: "Supprimer", forget: "Tout oublier", confirm: "Touchez encore pour tout effacer", full: "Mémoire pleine", count: "sur" },
  es: { title: "Memoria de Chispa", hint: "Chispa solo recuerda lo que tú añadas: objetivos y datos sobre ti. Se guardan en este dispositivo y se envían a Google Gemini con tus preguntas mientras la memoria esté activada. Las entradas del diario nunca se envían.", enable: "Activar la memoria", on: "Memoria activada", empty: "Aún nada. Añade un objetivo, p. ej. «aprender inglés para el verano».", ph: "Un objetivo o un dato sobre ti", add: "Añadir", del: "Eliminar", forget: "Olvidar todo", confirm: "Toca otra vez para borrarlo todo", full: "Memoria llena", count: "de" },
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

interface Props { lang: Lang; memory: SparkMemory; onChange: (m: SparkMemory) => void; open: boolean; onToggle: () => void }

/** Память Искры: включается явно, показывает все факты, каждый можно удалить, «Забыть всё» стирает сразу всё. */
export default function SparkMemoryPanel({ lang, memory, onChange, open, onToggle }: Props) {
  const l = T[lang] ?? T.en;
  const [text, setText] = useState("");
  const [sure, setSure] = useState(false);
  const full = memory.facts.length >= MAX_FACTS;
  const submit = () => {
    const next = addFact(memory, text, uid());
    if (next !== memory) setText("");
    onChange(next);
  };
  const btn = "flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-[12.5px] font-bold active:scale-95 disabled:opacity-50";
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow-sm)" }}>
      <button onClick={onToggle} aria-expanded={open} className="flex h-11 w-full items-center justify-between gap-2 px-3.5 text-[13px] font-bold">
        <span>🧠 {l.title}{memory.on && memory.facts.length > 0 ? ` · ${memory.facts.length}` : ""}</span>
        <span className="text-[11.5px] font-semibold text-[var(--ink-faint)]">{memory.on ? l.on : ""}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] p-3.5">
          <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">{l.hint}</p>
          {!memory.on ? (
            <button onClick={() => onChange({ ...memory, on: true })} className={`${btn} h-11 bg-[var(--accent)] text-[var(--accent-ink)]`}>{l.enable}</button>
          ) : (
            <>
              {memory.facts.length === 0 && <p className="text-[12.5px] text-[var(--ink-faint)]">{l.empty}</p>}
              <ul className="flex flex-col gap-1.5">
                {memory.facts.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-[13px]">
                    <span className="min-w-0 break-words">{f.text}</span>
                    <button onClick={() => onChange(removeFact(memory, f.id))} aria-label={l.del} title={l.del} className="shrink-0 px-1 text-[15px] leading-none text-[var(--ink-faint)] hover:text-[var(--ink)]">×</button>
                  </li>
                ))}
              </ul>
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-1.5">
                <input value={text} maxLength={MAX_FACT_LEN} onChange={(e) => setText(e.target.value)} placeholder={full ? l.full : l.ph} disabled={full} className="h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
                <button type="submit" disabled={!text.trim() || full} className={`${btn} h-10 bg-[var(--accent)] text-[var(--accent-ink)]`}>{l.add}</button>
              </form>
              <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--ink-faint)]">
                <span>{memory.facts.length} {l.count} {MAX_FACTS}</span>
                <button
                  onClick={() => { if (!sure) { setSure(true); return; } onChange({ on: false, facts: [] }); setSure(false); }}
                  onBlur={() => setSure(false)}
                  className="hover:text-red-400"
                >{sure ? l.confirm : l.forget}</button>
              </div>
              <button onClick={() => onChange({ ...memory, on: false })} className="self-start text-[12px] font-semibold text-[var(--ink-faint)] hover:text-[var(--ink)]">{lang === "ru" ? "Выключить, факты останутся" : lang === "be" ? "Выключыць, факты застануцца" : lang === "uk" ? "Вимкнути, факти залишаться" : lang === "de" ? "Ausschalten, Fakten bleiben" : lang === "fr" ? "Désactiver, les faits restent" : lang === "es" ? "Desactivar, los datos se quedan" : "Turn off, facts stay"}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
