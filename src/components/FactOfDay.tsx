import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { todayISO } from "../store";

const L: Record<string, { title: string; btn: string }> = {
  ru: { title: "Факт дня", btn: "Ещё факт" },
  en: { title: "Fact of the day", btn: "Another fact" },
  be: { title: "Факт дня", btn: "Яшчэ факт" },
  uk: { title: "Факт дня", btn: "Ще факт" },
  de: { title: "Fakt des Tages", btn: "Noch ein Fakt" },
  fr: { title: "Fait du jour", btn: "Un autre fait" },
  es: { title: "Dato del día", btn: "Otro dato" },
};

const FACTS: { ru: string; en: string }[] = [
  { ru: "Мёд не портится тысячи лет: археологи находили съедобный мёд в гробницах возрастом более 3000 лет.", en: "Honey never spoils: archaeologists have found 3,000-year-old honey in Egyptian tombs that was still perfectly edible." },
  { ru: "У осьминогов три сердца и голубая кровь.", en: "Octopuses have three hearts and blue blood." },
  { ru: "Один день на Венере длится дольше, чем один год на Венере.", en: "A single day on Venus lasts longer than a year on Venus." },
  { ru: "Банан — это ягода, а клубника — нет.", en: "Bananas are berries, but strawberries are not." },
  { ru: "Мозг человека вырабатывает около 20 ватт — хватит, чтобы тускло светила лампочка.", en: "Your brain generates about 20 watts of power — enough to dimly light a bulb." },
  { ru: "Акулы появились раньше деревьев: они существуют более 400 миллионов лет.", en: "Sharks are older than trees: they have existed for over 400 million years." },
  { ru: "Эйфелева башня летом выше примерно на 15 см — металл расширяется от тепла.", en: "The Eiffel Tower grows about 15 cm taller in summer because metal expands in heat." },
  { ru: "Кошки не чувствуют сладкий вкус.", en: "Cats cannot taste sweetness." },
  { ru: "Возможных партий в шахматы больше, чем атомов в наблюдаемой Вселенной.", en: "There are more possible chess games than atoms in the observable universe." },
  { ru: "Горячая вода может замерзать быстрее холодной — это называется эффект Мпембы.", en: "Hot water can freeze faster than cold water — it is called the Mpemba effect." },
  { ru: "Ленивцы задерживают дыхание до 40 минут — дольше, чем дельфины.", en: "Sloths can hold their breath for up to 40 minutes — longer than dolphins." },
  { ru: "Луна отдаляется от Земли примерно на 3,8 см в год.", en: "The Moon drifts about 3.8 cm away from Earth every year." },
  { ru: "У человека и банана около 60% общих генов.", en: "Humans share about 60% of their DNA with bananas." },
  { ru: "Молния в пять раз горячее поверхности Солнца.", en: "A lightning bolt is five times hotter than the surface of the Sun." },
  { ru: "На Земле деревьев больше, чем звёзд в Млечном Пути.", en: "Earth has more trees than the Milky Way has stars." },
  { ru: "Чайная ложка вещества нейтронной звезды весила бы около 6 миллиардов тонн.", en: "A teaspoon of neutron star material would weigh about 6 billion tons." },
  { ru: "У коров есть лучшие друзья, и они нервничают, когда их разлучают.", en: "Cows have best friends and get stressed when separated." },
  { ru: "Запах дождя называется петрикор.", en: "The smell of rain has a name: petrichor." },
  { ru: "Шерсть белых медведей на самом деле прозрачная, а кожа — чёрная.", en: "Polar bear fur is actually transparent, and their skin is black." },
  { ru: "Бабочки пробуют еду на вкус ногами.", en: "Butterflies taste their food with their feet." },
  { ru: "Сердце креветки находится у неё в голове.", en: "A shrimp's heart is located in its head." },
  { ru: "Вороны распознают человеческие лица и запоминают тех, кто с ними плохо обошёлся.", en: "Crows recognize human faces and remember people who treated them badly." },
  { ru: "Морские выдры держатся за лапки во сне, чтобы их не унесло друг от друга.", en: "Sea otters hold paws while sleeping so they do not drift apart." },
  { ru: "Кенгуру не умеют ходить backwards — задом наперёд.", en: "Kangaroos cannot walk backwards." },
  { ru: "Улитки могут проспать до трёх лет.", en: "Snails can sleep for up to three years." },
  { ru: "В ядре Земли столько золота, что им можно было бы покрыть всю поверхность планеты слоем в 45 см.", en: "Earth's core holds enough gold to cover the entire surface with a 45 cm layer." },
  { ru: "Каждый раз, когда ты тщательно тасуешь колоду, такой порядок карт, скорее всего, ещё никогда не существовал.", en: "Every well-shuffled deck produces a card order that has most likely never existed before." },
  { ru: "Великую Китайскую стену не видно из космоса невооружённым глазом.", en: "The Great Wall of China is not visible from space with the naked eye." },
  { ru: "Некоторые черепахи умеют дышать через клоаку — да, через ту самую.", en: "Some turtles can breathe through their cloaca — yes, that one." },
  { ru: "Свет от Солнца идёт до Земли около 8 минут 20 секунд.", en: "Sunlight takes about 8 minutes and 20 seconds to reach Earth." },
];

function daySeed(iso: string): number {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return h;
}

export default function FactOfDay({ lang }: { lang: Lang }) {
  const labels = L[lang] ?? L.en;
  const today = todayISO();
  const [override, setOverride] = useState<number | null>(null);

  useEffect(() => { setOverride(null); }, [today]);

  const base = daySeed(today) % FACTS.length;
  const idx = override ?? base;
  const fact = FACTS[idx];
  const text = lang === "ru" ? fact.ru : fact.en;

  const shuffle = () => {
    let next = Math.floor(Math.random() * FACTS.length);
    if (next === idx) next = (next + 1) % FACTS.length;
    setOverride(next);
  };

  return (
    <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          <span className="text-[16px]">💡</span>
          {labels.title}
        </span>
        <button
          onClick={shuffle}
          className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95"
        >
          🎲 {labels.btn}
        </button>
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--ink)]">{text}</p>
    </div>
  );
}
