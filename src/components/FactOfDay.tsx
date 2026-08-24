import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { todayISO } from "../store";

const L: Record<string, { title: string; btn: string; loading: string; ai: string; book: string }> = {
  ru: { title: "Факт дня", btn: "Ещё факт", loading: "Нейросеть думает…", ai: "сгенерировано ИИ", book: "из коллекции" },
  en: { title: "Fact of the day", btn: "Another fact", loading: "AI is thinking…", ai: "AI-generated", book: "from collection" },
  be: { title: "Факт дня", btn: "Яшчэ факт", loading: "Нейрасетка думае…", ai: "згенеравана ШІ", book: "з калекцыі" },
  uk: { title: "Факт дня", btn: "Ще факт", loading: "Нейромережа думає…", ai: "згенеровано ШІ", book: "з колекції" },
  de: { title: "Fakt des Tages", btn: "Noch ein Fakt", loading: "KI denkt nach…", ai: "KI-generiert", book: "aus der Sammlung" },
  fr: { title: "Fait du jour", btn: "Un autre fait", loading: "L'IA réfléchit…", ai: "généré par IA", book: "de la collection" },
  es: { title: "Dato del día", btn: "Otro dato", loading: "La IA está pensando…", ai: "generado por IA", book: "de la colección" },
};

// Фолбэк, если нейросеть недоступна
const FALLBACK: { ru: string; en: string }[] = [
  { ru: "Мёд не портится тысячи лет: археологи находили съедобный мёд в гробницах возрастом более 3000 лет.", en: "Honey never spoils: archaeologists have found 3,000-year-old honey that was still edible." },
  { ru: "У осьминогов три сердца и голубая кровь.", en: "Octopuses have three hearts and blue blood." },
  { ru: "Один день на Венере длится дольше, чем один год на Венере.", en: "A day on Venus lasts longer than a year on Venus." },
  { ru: "Банан — это ягода, а клубника — нет.", en: "Bananas are berries, but strawberries are not." },
  { ru: "Акулы появились раньше деревьев: они существуют более 400 миллионов лет.", en: "Sharks are older than trees: over 400 million years." },
  { ru: "Кошки не чувствуют сладкий вкус.", en: "Cats cannot taste sweetness." },
  { ru: "Луна отдаляется от Земли примерно на 3,8 см в год.", en: "The Moon drifts about 3.8 cm away from Earth every year." },
  { ru: "Запах дождя называется петрикор.", en: "The smell of rain is called petrichor." },
  { ru: "Морские выдры держатся за лапки во сне, чтобы их не унесло друг от друга.", en: "Sea otters hold paws while sleeping so they do not drift apart." },
  { ru: "Улитки могут проспать до трёх лет.", en: "Snails can sleep for up to three years." },
];

function daySeed(iso: string): number {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return h;
}

export default function FactOfDay({ lang }: { lang: Lang }) {
  const labels = L[lang] ?? L.en;
  const today = todayISO();
  const [aiFact, setAiFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackIdx, setFallbackIdx] = useState(() => daySeed(today) % FALLBACK.length);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cacheKey = `dn.fact.${today}.${lang}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setAiFact(cached);
      setLoading(false);
      return;
    }
    fetch(`/api/fact?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((d) => {
        if (cancelled) return;
        if (d?.fact) {
          setAiFact(d.fact);
          try { localStorage.setItem(cacheKey, d.fact); } catch { /* ignore */ }
        } else setAiFact(null);
      })
      .catch(() => { if (!cancelled) setAiFact(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [today, lang]);

  const fromAi = aiFact !== null;
  const text = fromAi ? aiFact : (lang === "ru" ? FALLBACK[fallbackIdx].ru : FALLBACK[fallbackIdx].en);

  const shuffle = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/fact?lang=${lang}&r=${Date.now()}`);
      const d = await r.json();
      if (!d?.fact) throw new Error("bad");
      setAiFact(d.fact);
    } catch {
      setAiFact(null);
      setFallbackIdx((i) => (i + 1 + Math.floor(Math.random() * (FALLBACK.length - 1))) % FALLBACK.length);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          <span className="text-[16px]">💡</span>
          {labels.title}
          <span className="normal-case tracking-normal text-[10px] opacity-70">{fromAi ? `🤖 ${labels.ai}` : `📚 ${labels.book}`}</span>
        </span>
        <button
          onClick={shuffle}
          className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95"
        >
          🎲 {labels.btn}
        </button>
      </div>
      {loading ? (
        <p className="animate-pulse text-[14px] text-[var(--ink-faint)]">{labels.loading}</p>
      ) : (
        <p className="text-[14px] leading-relaxed text-[var(--ink)]">{text}</p>
      )}
    </div>
  );
}
