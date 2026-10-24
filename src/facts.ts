export type FactCategory = "nature" | "space" | "body" | "history";

export interface Fact {
  cat: FactCategory;
  ru: string;
  en: string;
}

export const FACTS: Fact[] = [
  { cat: "nature", ru: "Мёд не портится тысячи лет: археологи находили съедобный мёд в гробницах возрастом более 3000 лет.", en: "Honey never spoils: archaeologists have found 3,000-year-old honey that was still edible." },
  { cat: "nature", ru: "У осьминогов три сердца и голубая кровь.", en: "Octopuses have three hearts and blue blood." },
  { cat: "nature", ru: "Банан — это ягода, а клубника — нет.", en: "Bananas are berries, but strawberries are not." },
  { cat: "nature", ru: "Акулы появились раньше деревьев: они существуют более 400 миллионов лет.", en: "Sharks are older than trees: they have existed for over 400 million years." },
  { cat: "nature", ru: "Кошки не чувствуют сладкий вкус.", en: "Cats cannot taste sweetness." },
  { cat: "nature", ru: "Запах дождя называется петрикор.", en: "The smell of rain is called petrichor." },
  { cat: "nature", ru: "Морские выдры держатся за лапки во сне, чтобы их не унесло друг от друга.", en: "Sea otters hold paws while sleeping so they do not drift apart." },
  { cat: "nature", ru: "Улитки могут проспать до трёх лет.", en: "Snails can sleep for up to three years." },
  { cat: "nature", ru: "Вомбаты оставляют кубические какашки — единственные в мире.", en: "Wombats produce cube-shaped droppings, the only animal known to do so." },
  { cat: "nature", ru: "Деревья в лесу обмениваются питательными веществами через сеть грибных нитей в почве.", en: "Trees in a forest share nutrients through underground networks of fungal threads." },
  { cat: "nature", ru: "Колибри — единственные птицы, которые умеют летать задом наперёд.", en: "Hummingbirds are the only birds that can fly backwards." },
  { cat: "nature", ru: "Бамбук может вырастать почти на метр за сутки.", en: "Some bamboo species can grow almost a metre in a single day." },
  { cat: "nature", ru: "Сердце голубого кита размером с небольшой автомобиль.", en: "A blue whale's heart is about the size of a small car." },
  { cat: "space", ru: "Один день на Венере длится дольше, чем один год на Венере.", en: "A day on Venus lasts longer than a year on Venus." },
  { cat: "space", ru: "Луна отдаляется от Земли примерно на 3,8 см в год.", en: "The Moon drifts about 3.8 cm away from Earth every year." },
  { cat: "space", ru: "На Нептуне дуют самые быстрые ветры в Солнечной системе — до 2000 км/ч.", en: "Neptune has the fastest winds in the Solar System, up to 2,000 km/h." },
  { cat: "space", ru: "Свет от Солнца добирается до Земли около 8 минут и 20 секунд.", en: "Sunlight takes about 8 minutes and 20 seconds to reach Earth." },
  { cat: "space", ru: "В космосе нет звука: звуковым волнам нужна среда для распространения.", en: "There is no sound in space: sound waves need a medium to travel through." },
  { cat: "space", ru: "Следы астронавтов на Луне сохранятся миллионы лет — там нет ветра и воды.", en: "Astronaut footprints on the Moon may last millions of years: there is no wind or water." },
  { cat: "space", ru: "Юпитер настолько велик, что в нём поместились бы все остальные планеты Солнечной системы.", en: "Jupiter is so large that all the other planets of the Solar System could fit inside it." },
  { cat: "space", ru: "Сатурн настолько лёгкий по плотности, что мог бы плавать в воде.", en: "Saturn is less dense than water and would float in a big enough bathtub." },
  { cat: "space", ru: "На Марсе закаты голубые.", en: "Sunsets on Mars are blue." },
  { cat: "body", ru: "Человеческий мозг потребляет около 20% всей энергии тела, хотя весит всего около 2%.", en: "The human brain uses about 20% of the body's energy while being only about 2% of its weight." },
  { cat: "body", ru: "Кости человека в несколько раз прочнее стали того же веса.", en: "Bone is stronger than steel of the same weight." },
  { cat: "body", ru: "Желудок обновляет слизистую оболочку каждые несколько дней, чтобы не переваривать сам себя.", en: "The stomach renews its lining every few days so it does not digest itself." },
  { cat: "body", ru: "За жизнь человек в среднем проводит во сне около трети времени.", en: "On average, a person spends about a third of their life asleep." },
  { cat: "body", ru: "Отпечаток языка уникален так же, как и отпечаток пальца.", en: "Your tongue print is as unique as your fingerprint." },
  { cat: "body", ru: "Сердце бьётся примерно 100 000 раз в сутки.", en: "The heart beats around 100,000 times a day." },
  { cat: "body", ru: "Улыбка заставляет мозг выделять вещества, улучшающие настроение, даже если она ненастоящая.", en: "Smiling can trigger mood-lifting chemicals in the brain, even if the smile is forced." },
  { cat: "body", ru: "Глаз различает около миллиона оттенков цвета.", en: "The human eye can distinguish roughly a million shades of colour." },
  { cat: "history", ru: "Клеопатра жила ближе по времени к высадке на Луне, чем к строительству Великой пирамиды.", en: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid." },
  { cat: "history", ru: "Оксфордский университет старше империи ацтеков.", en: "Oxford University is older than the Aztec Empire." },
  { cat: "history", ru: "Первые шахматы появились в Индии более 1500 лет назад.", en: "Chess originated in India more than 1,500 years ago." },
  { cat: "history", ru: "Эйфелеву башню строили чуть более двух лет, и задумывалась она как временное сооружение.", en: "The Eiffel Tower took just over two years to build and was meant to be temporary." },
  { cat: "history", ru: "Древние римляне использовали мочу для стирки одежды.", en: "Ancient Romans used urine to wash clothes." },
  { cat: "history", ru: "Первая в мире веб-страница была опубликована в 1991 году.", en: "The first web page in the world went online in 1991." },
  { cat: "history", ru: "Библиотека Александрии была одним из первых в мире научных центров.", en: "The Library of Alexandria was one of the world's first major research centres." },
  { cat: "history", ru: "Карандаши с ластиком на конце запатентованы в 1858 году.", en: "The pencil with an attached eraser was patented in 1858." },
];

export const FACT_CATEGORIES: FactCategory[] = ["nature", "space", "body", "history"];

export function daySeed(iso: string): number {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return h;
}

/** Индекс факта дня: детерминированно по дате, без повторов подряд в соседние дни. */
export function factIndexForDate(iso: string): number {
  const d = Date.parse(iso + "T00:00:00Z");
  if (Number.isNaN(d)) return daySeed(iso) % FACTS.length;
  const day = Math.floor(d / 86400000);
  // фиксированный сдвиг-перестановка, чтобы порядок не шёл строго по списку
  return (day * 7 + 3) % FACTS.length;
}
