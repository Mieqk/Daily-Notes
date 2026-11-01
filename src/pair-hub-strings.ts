import type { Lang } from "./i18n";

/** Строки шапки и разделов вкладки «Парное». */
const ru = {
  you: "Вы", with: "Вы и {name}", today: "Сегодня", sleep: "Сон", plans: "Планы", memories: "Память",
  empty: "Добавьте друга во вкладке «Друзья», и здесь появится ваше пространство вдвоём.",
  pick: "Выбрать пару", offline: "не в сети",
};
type Strings = typeof ru;
const en: Strings = {
  you: "You", with: "You and {name}", today: "Today", sleep: "Sleep", plans: "Plans", memories: "Memories",
  empty: "Add a friend in the Friends tab and your shared space will appear here.",
  pick: "Choose a partner", offline: "offline",
};
const be: Strings = {
  you: "Вы", with: "Вы і {name}", today: "Сёння", sleep: "Сон", plans: "Планы", memories: "Памяць",
  empty: "Дадайце сябра ў раздзеле «Сябры», і тут з’явіцца ваша прастора ўдвух.",
  pick: "Абраць пару", offline: "не ў сетцы",
};
const uk: Strings = {
  you: "Ви", with: "Ви і {name}", today: "Сьогодні", sleep: "Сон", plans: "Плани", memories: "Пам’ять",
  empty: "Додайте друга у вкладці «Друзі», і тут з’явиться ваш простір удвох.",
  pick: "Обрати пару", offline: "не в мережі",
};
const de: Strings = {
  you: "Du", with: "Du und {name}", today: "Heute", sleep: "Schlaf", plans: "Pläne", memories: "Erinnerungen",
  empty: "Füge im Tab „Freunde“ jemanden hinzu, dann erscheint hier euer gemeinsamer Raum.",
  pick: "Person wählen", offline: "offline",
};
const fr: Strings = {
  you: "Vous", with: "Vous et {name}", today: "Aujourd’hui", sleep: "Sommeil", plans: "Projets", memories: "Souvenirs",
  empty: "Ajoutez un ami dans l’onglet Amis et votre espace à deux apparaîtra ici.",
  pick: "Choisir une personne", offline: "hors ligne",
};
const es: Strings = {
  you: "Tú", with: "Tú y {name}", today: "Hoy", sleep: "Sueño", plans: "Planes", memories: "Recuerdos",
  empty: "Añade un amigo en la pestaña Amigos y aquí aparecerá vuestro espacio.",
  pick: "Elegir pareja", offline: "sin conexión",
};
const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type HubKey = keyof Strings;
export const makeHub = (lang: Lang) => (k: HubKey): string => (ALL[lang] ?? en)[k];
