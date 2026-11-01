import type { Lang } from "./i18n";

/**
 * Нейтральные формулировки «Парного» для друзей, семьи и близких: без слов про «пару» и «годовщины».
 * Подменяют обычные строки, когда выбран любой тип, кроме «Любимый человек».
 */
interface Neutral {
  pair: Record<"emptyTitle" | "emptyBody" | "week" | "manage", string>;
  together: Record<"title" | "eEmpty" | "sWarm", string>;
  distance: Record<"hint", string>;
  hub: Record<"empty" | "pick", string>;
}

const ru: Neutral = {
  pair: { emptyTitle: "Здесь будет ваш общий сон", emptyBody: "Начните Sleep Party с близким человеком: вы увидите, когда он ложится и встаёт, а он увидит ваши ночи. Делиться можно только теми ночами, которыми хочется.", week: "Неделя вместе", manage: "Поделиться ночью и управлять общим сном" },
  together: { title: "Вместе", eEmpty: "Добавьте дату встречи или поездки, и приложение будет считать время.", sWarm: "Вы много значите друг для друга 🤝" },
  distance: { hint: "Видно только вам двоим и только если включили оба. Другой человек не видит ваших координат, только километры, округлённые до 5." },
  hub: { empty: "Добавьте друга во вкладке «Друзья», и здесь появится ваше общее пространство.", pick: "Выбрать человека" },
};
const en: Neutral = {
  pair: { emptyTitle: "Your shared sleep will show up here", emptyBody: "Start a Sleep Party with someone close: you see when they go to bed and get up, and they see your nights. You only share the nights you choose.", week: "The week together", manage: "Share a night and manage shared sleep" },
  together: { title: "Together", eEmpty: "Add a date for a meeting or trip and the app keeps count.", sWarm: "You mean a lot to each other 🤝" },
  distance: { hint: "Only the two of you see it, and only if you both turn it on. The other person never sees your coordinates, just kilometres rounded to 5." },
  hub: { empty: "Add a friend in the Friends tab and your shared space will appear here.", pick: "Choose a person" },
};
const be: Neutral = {
  pair: { emptyTitle: "Тут будзе ваш агульны сон", emptyBody: "Пачніце Sleep Party з блізкім чалавекам: вы ўбачыце, калі ён кладзецца і ўстае, а ён убачыць вашы ночы. Дзяліцца можна толькі начамі, якімі хочацца.", week: "Тыдзень разам", manage: "Падзяліцца ноччу і кіраваць агульным сном" },
  together: { title: "Разам", eEmpty: "Дадайце дату сустрэчы або паездкі, і праграма будзе лічыць час.", sWarm: "Вы шмат значыце адно для аднаго 🤝" },
  distance: { hint: "Бачыце толькі вы ўдваіх і толькі калі ўключылі абодва. Іншы чалавек не бачыць вашых каардынатаў, толькі кіламетры, акруглёныя да 5." },
  hub: { empty: "Дадайце сябра ў раздзеле «Сябры», і тут з’явіцца ваша агульная прастора.", pick: "Абраць чалавека" },
};
const uk: Neutral = {
  pair: { emptyTitle: "Тут буде ваш спільний сон", emptyBody: "Почніть Sleep Party з близькою людиною: ви побачите, коли вона лягає й встає, а вона побачить ваші ночі. Ділитися можна лише тими ночами, якими хочеться.", week: "Тиждень разом", manage: "Поділитися ніччю та керувати спільним сном" },
  together: { title: "Разом", eEmpty: "Додайте дату зустрічі чи поїздки, і застосунок рахуватиме час.", sWarm: "Ви багато значите одне для одного 🤝" },
  distance: { hint: "Бачите лише ви вдвох і тільки якщо ввімкнули обоє. Інша людина не бачить ваших координат, лише кілометри, округлені до 5." },
  hub: { empty: "Додайте друга у вкладці «Друзі», і тут з’явиться ваш спільний простір.", pick: "Обрати людину" },
};
const de: Neutral = {
  pair: { emptyTitle: "Hier erscheint euer gemeinsamer Schlaf", emptyBody: "Starte eine Sleep Party mit jemandem, der dir nahesteht: Du siehst, wann die Person ins Bett geht und aufsteht, und umgekehrt. Geteilt werden nur Nächte, die du auswählst.", week: "Die Woche zusammen", manage: "Nacht teilen und gemeinsamen Schlaf verwalten" },
  together: { title: "Zusammen", eEmpty: "Trage ein Datum für Treffen oder Reise ein, die App zählt mit.", sWarm: "Ihr bedeutet einander viel 🤝" },
  distance: { hint: "Nur ihr beide seht sie, und nur wenn ihr beide sie einschaltet. Die andere Person sieht nie deine Koordinaten, nur Kilometer auf 5 gerundet." },
  hub: { empty: "Füge im Tab „Freunde“ jemanden hinzu, dann erscheint hier euer gemeinsamer Raum.", pick: "Person wählen" },
};
const fr: Neutral = {
  pair: { emptyTitle: "Votre sommeil commun apparaîtra ici", emptyBody: "Lancez une Sleep Party avec un proche : vous voyez quand la personne se couche et se lève, et elle voit vos nuits. Vous ne partagez que les nuits que vous choisissez.", week: "La semaine ensemble", manage: "Partager une nuit et gérer le sommeil commun" },
  together: { title: "Ensemble", eEmpty: "Ajoutez la date d’une rencontre ou d’un voyage, l’appli compte le temps.", sWarm: "Vous comptez beaucoup l’un pour l’autre 🤝" },
  distance: { hint: "Visible seulement par vous deux, et seulement si vous l’activez tous les deux. L’autre personne ne voit jamais vos coordonnées, seulement des kilomètres arrondis à 5." },
  hub: { empty: "Ajoutez un ami dans l’onglet Amis et votre espace commun apparaîtra ici.", pick: "Choisir une personne" },
};
const es: Neutral = {
  pair: { emptyTitle: "Aquí aparecerá vuestro sueño compartido", emptyBody: "Empieza una Sleep Party con alguien cercano: verás cuándo se acuesta y se levanta, y verá tus noches. Solo compartes las noches que elijas.", week: "La semana juntos", manage: "Compartir una noche y gestionar el sueño compartido" },
  together: { title: "Juntos", eEmpty: "Añade la fecha de un encuentro o viaje y la app cuenta el tiempo.", sWarm: "Significáis mucho el uno para el otro 🤝" },
  distance: { hint: "Solo lo veis vosotros dos, y solo si lo activáis los dos. La otra persona nunca ve tus coordenadas, solo kilómetros redondeados a 5." },
  hub: { empty: "Añade un amigo en la pestaña Amigos y aquí aparecerá vuestro espacio.", pick: "Elegir persona" },
};
const ALL: Record<Lang, Neutral> = { ru, en, be, uk, de, fr, es };

/** Нейтральная строка или undefined, если выбран «Любимый человек» либо ключа нет. */
export function neutralText<G extends keyof Neutral>(lang: Lang, group: G, key: string, kind?: string): string | undefined {
  if (!kind || kind === "love") return undefined;
  return (ALL[lang] ?? en)[group][key as keyof Neutral[G]] as string | undefined;
}
