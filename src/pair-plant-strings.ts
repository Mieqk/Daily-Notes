import type { Lang } from "./i18n";

/** Строки общего растения пары. */
const ru = {
  title: "Общее растение", hint: "Поливайте раз в день: оно растёт, когда ухаживаете вы оба",
  water: "Полить", watered: "Вы полили сегодня", wait: "Ждём, когда полит {name}", theyWatered: "{name} уже полил(а) сегодня",
  both: "Сегодня полили оба 💧", wilting: "Растению нужна вода: его давно не поливали", points: "Очков ухода: {n}", toNext: "До следующей стадии: {n}", grown: "Растение выросло",
  stage0: "Росток", stage1: "Молодое растение", stage2: "Растение в горшке", stage3: "Дерево", stage4: "Цветёт",
  err: "Не получилось, попробуйте ещё раз",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Shared plant", hint: "Water it once a day: it grows when you both take care",
  water: "Water", watered: "You watered it today", wait: "Waiting for {name} to water it", theyWatered: "{name} watered it today",
  both: "You both watered it today 💧", wilting: "The plant needs water: it has not been watered for a while", points: "Care points: {n}", toNext: "To the next stage: {n}", grown: "Fully grown",
  stage0: "Sprout", stage1: "Young plant", stage2: "Potted plant", stage3: "Tree", stage4: "In bloom",
  err: "Something went wrong, try again",
};

const be: Strings = {
  title: "Агульная расліна", hint: "Паліце раз на дзень: яна расце, калі даглядаеце вы абодва",
  water: "Паліць", watered: "Вы палілі сёння", wait: "Чакаем, калі паліць {name}", theyWatered: "{name} ужо паліў(ла) сёння",
  both: "Сёння палілі абодва 💧", wilting: "Расліне патрэбна вада: яе даўно не палівалі", points: "Ачкоў догляду: {n}", toNext: "Да наступнай стадыі: {n}", grown: "Расліна вырасла",
  stage0: "Парастак", stage1: "Маладая расліна", stage2: "Расліна ў гаршку", stage3: "Дрэва", stage4: "Цвіце",
  err: "Не атрымалася, паспрабуйце яшчэ раз",
};

const uk: Strings = {
  title: "Спільна рослина", hint: "Поливайте раз на день: вона росте, коли доглядаєте ви обоє",
  water: "Полити", watered: "Ви полили сьогодні", wait: "Чекаємо, коли полиє {name}", theyWatered: "{name} уже полив(ла) сьогодні",
  both: "Сьогодні полили обоє 💧", wilting: "Рослині потрібна вода: її давно не поливали", points: "Балів догляду: {n}", toNext: "До наступної стадії: {n}", grown: "Рослина виросла",
  stage0: "Паросток", stage1: "Молода рослина", stage2: "Рослина в горщику", stage3: "Дерево", stage4: "Цвіте",
  err: "Не вдалося, спробуйте ще раз",
};

const de: Strings = {
  title: "Gemeinsame Pflanze", hint: "Gieß sie einmal am Tag: Sie wächst, wenn ihr euch beide kümmert",
  water: "Gießen", watered: "Du hast heute gegossen", wait: "Warten, bis {name} gießt", theyWatered: "{name} hat heute gegossen",
  both: "Heute habt ihr beide gegossen 💧", wilting: "Die Pflanze braucht Wasser: Sie wurde länger nicht gegossen", points: "Pflegepunkte: {n}", toNext: "Bis zur nächsten Stufe: {n}", grown: "Ausgewachsen",
  stage0: "Spross", stage1: "Junge Pflanze", stage2: "Topfpflanze", stage3: "Baum", stage4: "In Blüte",
  err: "Das hat nicht geklappt, versuche es noch einmal",
};

const fr: Strings = {
  title: "Plante à deux", hint: "Arrosez-la une fois par jour : elle pousse quand vous en prenez soin tous les deux",
  water: "Arroser", watered: "Vous l’avez arrosée aujourd’hui", wait: "On attend que {name} l’arrose", theyWatered: "{name} l’a arrosée aujourd’hui",
  both: "Vous l’avez arrosée tous les deux 💧", wilting: "La plante a soif : elle n’a pas été arrosée depuis un moment", points: "Points de soin : {n}", toNext: "Avant le stade suivant : {n}", grown: "Pleinement développée",
  stage0: "Pousse", stage1: "Jeune plante", stage2: "Plante en pot", stage3: "Arbre", stage4: "En fleurs",
  err: "Échec, réessayez",
};

const es: Strings = {
  title: "Planta compartida", hint: "Riégala una vez al día: crece cuando la cuidáis los dos",
  water: "Regar", watered: "Hoy la regaste", wait: "Esperando a que {name} la riegue", theyWatered: "{name} la regó hoy",
  both: "Hoy la regasteis los dos 💧", wilting: "La planta necesita agua: hace tiempo que no se riega", points: "Puntos de cuidado: {n}", toNext: "Para la siguiente etapa: {n}", grown: "Totalmente crecida",
  stage0: "Brote", stage1: "Planta joven", stage2: "Planta en maceta", stage3: "Árbol", stage4: "En flor",
  err: "No se pudo, inténtalo de nuevo",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type PlantKey = keyof Strings;
export const makePlant = (lang: Lang) => (k: PlantKey): string => (ALL[lang] ?? en)[k];
