import { CheckIcon, DiceIcon, PlusIcon } from "../icons";
import { useState } from "react";
import type { Lang } from "../i18n";
import { todayISO } from "../store";
import { FACTS, factIndexForDate, factText, type FactCategory } from "../facts";

const L: Record<string, { title: string; sub: string; btn: string; loading: string; ai: string; book: string; save: string; saved: string; aiBtn: string; cats: Record<FactCategory, string> }> = {
  ru: { title: "Факт дня", sub: "", btn: "Ещё факт", loading: "Нейросеть думает…", ai: "сгенерировано ИИ", book: "из коллекции", save: "В заметку", saved: "Добавлено", aiBtn: "Факт от ИИ", cats: { nature: "Природа", space: "Космос", body: "Тело", history: "История" } },
  en: { title: "Fact of the day", sub: "", btn: "Another fact", loading: "AI is thinking…", ai: "AI-generated", book: "from collection", save: "Save to note", saved: "Added", aiBtn: "AI fact", cats: { nature: "Nature", space: "Space", body: "Body", history: "History" } },
  be: { title: "Факт дня", sub: "", btn: "Яшчэ факт", loading: "Нейрасетка думае…", ai: "згенеравана ШІ", book: "з калекцыі", save: "У нататку", saved: "Дададзена", aiBtn: "Факт ад ШІ", cats: { nature: "Прырода", space: "Космас", body: "Цела", history: "Гісторыя" } },
  uk: { title: "Факт дня", sub: "", btn: "Ще факт", loading: "Нейромережа думає…", ai: "згенеровано ШІ", book: "із колекції", save: "У нотатку", saved: "Додано", aiBtn: "Факт від ШІ", cats: { nature: "Природа", space: "Космос", body: "Тіло", history: "Історія" } },
  de: { title: "Fakt des Tages", sub: "", btn: "Noch ein Fakt", loading: "KI denkt nach…", ai: "KI-generiert", book: "aus der Sammlung", save: "In Notiz speichern", saved: "Hinzugefügt", aiBtn: "KI-Fakt", cats: { nature: "Natur", space: "Weltraum", body: "Körper", history: "Geschichte" } },
  fr: { title: "Fait du jour", sub: "", btn: "Un autre fait", loading: "L'IA réfléchit…", ai: "généré par IA", book: "de la collection", save: "Ajouter à une note", saved: "Ajouté", aiBtn: "Fait par IA", cats: { nature: "Nature", space: "Espace", body: "Corps", history: "Histoire" } },
  es: { title: "Dato del día", sub: "", btn: "Otro dato", loading: "La IA está pensando…", ai: "generado por IA", book: "de la colección", save: "Guardar en nota", saved: "Añadido", aiBtn: "Dato con IA", cats: { nature: "Naturaleza", space: "Espacio", body: "Cuerpo", history: "Historia" } },
};

type Labels = (typeof L)["ru"];

export default function FactOfDay({ lang, onSave }: { lang: Lang; onSave?: (text: string) => void }) {
  const labels: Labels = L[lang] ?? L.en;
  const today = todayISO();
  const [idx, setIdx] = useState(() => factIndexForDate(today));
  const [aiFact, setAiFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const fact = FACTS[idx % FACTS.length];
  const text = aiFact ?? factText(fact, idx % FACTS.length, lang);

  const next = () => {
    setAiFact(null);
    setJustSaved(false);
    setIdx((i) => (i + 1) % FACTS.length);
  };

  const askAi = async () => {
    setLoading(true);
    setJustSaved(false);
    try {
      // если ИИ не ответил за 25 с, показываем факт из встроенного списка
      // (AbortController, а не AbortSignal.timeout: его нет в старых WebView на Android)
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 25_000);
      const r = await fetch(`/api/fact?lang=${lang}&r=${Date.now()}&avoid=${encodeURIComponent(text.slice(0, 150))}`, { signal: ctl.signal }).finally(() => clearTimeout(timer));
      const d = await r.json();
      if (!d?.fact) throw new Error("bad");
      setAiFact(d.fact);
    } catch {
      next();
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!onSave || justSaved) return;
    onSave(text);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  const btnCls = "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14.5px] font-bold">{labels.title}</span>
        <span className="rounded-full bg-[var(--hover)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-faint)]">
          {aiFact ? labels.ai : labels.cats[fact.cat]}
        </span>
        <button onClick={next} aria-label={labels.btn} className={`ml-auto ${btnCls}`}>
          <DiceIcon className="h-4 w-4" /> <span className="hidden sm:inline">{labels.btn}</span>
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label={labels.loading}>
          <div className="h-3.5 w-full animate-pulse rounded bg-[var(--hover)]" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-[var(--hover)]" />
        </div>
      ) : (
        <p className="text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{text}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {onSave && (
          <button onClick={save} disabled={loading} className={btnCls}>
            {justSaved ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />} {justSaved ? labels.saved : labels.save}
          </button>
        )}
        <button onClick={askAi} disabled={loading} className={btnCls}>{labels.aiBtn}</button>
      </div>
    </div>
  );
}
