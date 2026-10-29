import type { Lang } from "./i18n";

/** Строки вкладки «Пара»: сон близкого человека рядом с вашим. */
const ru = {
  emptyTitle: "Здесь будет сон вашей пары", emptyBody: "Начните Sleep Party с любимым человеком или другом: вы увидите, когда он ложится и встаёт, а он увидит ваши ночи. Делиться можно только теми ночами, которыми хочется.",
  needFriend: "Сначала добавьте друга во вкладке «Друзья»",
  stAsleep: "Вероятно, спит", stAwake: "Не спит, в сети", stUp: "Уже не спит, подъём в {t}", stUnknown: "Вне привычных часов сна",
  stHint: "Это оценка по привычным часам сна из общих ночей, а не точные данные.",
  night: "Последняя общая ночь", you: "Вы", h: "ч", nothing: "нет данных",
  verdictEqual: "Спали поровну", verdictYou: "Вы спали дольше на {h} ч", verdictThem: "{name} спит дольше на {h} ч", synced: "Легли почти вместе",
  waiting: "Ждём ночь от {name}", waitingYou: "Поделитесь своей ночью ниже, и сравнение появится",
  week: "Неделя вдвоём", avgSleep: "Среднее за ночь", usualBed: "Обычно ложится", together: "Легли вместе", ofNights: "{n} из {m}", streak: "Серия", days: "дн.",
  chart: "Часы сна за 7 дней", axis: "Ночь на шкале времени", manage: "Поделиться ночью и управлять парой",
  q: "Оценка",
};
type Strings = typeof ru;

const en: Strings = {
  emptyTitle: "Your pair's sleep will show up here", emptyBody: "Start a Sleep Party with your person or a friend: you see when they go to bed and get up, and they see your nights. You only share the nights you choose.",
  needFriend: "Add a friend in the Friends tab first",
  stAsleep: "Probably asleep", stAwake: "Awake, online", stUp: "Already up, woke at {t}", stUnknown: "Outside their usual sleep hours",
  stHint: "This is an estimate from their usual sleep hours in shared nights, not exact data.",
  night: "Latest shared night", you: "You", h: "h", nothing: "no data",
  verdictEqual: "Slept the same", verdictYou: "You slept {h} h longer", verdictThem: "{name} slept {h} h longer", synced: "Went to bed almost together",
  waiting: "Waiting for a night from {name}", waitingYou: "Share your night below and the comparison appears",
  week: "The week together", avgSleep: "Average per night", usualBed: "Usually in bed at", together: "Bed together", ofNights: "{n} of {m}", streak: "Streak", days: "d",
  chart: "Hours of sleep, 7 days", axis: "The night on a timeline", manage: "Share a night and manage the pair",
  q: "Rating",
};

const be: Strings = {
  emptyTitle: "Тут будзе сон вашай пары", emptyBody: "Пачніце Sleep Party з каханым чалавекам або сябрам: вы ўбачыце, калі ён кладзецца і ўстае, а ён убачыць вашы ночы. Дзяліцца можна толькі начамі, якімі хочацца.",
  needFriend: "Спачатку дадайце сябра ў раздзеле «Сябры»",
  stAsleep: "Верагодна, спіць", stAwake: "Не спіць, у сетцы", stUp: "Ужо не спіць, пад’ём у {t}", stUnknown: "Па-за звычайнымі гадзінамі сну",
  stHint: "Гэта ацэнка па звычайных гадзінах сну з агульных начэй, а не дакладныя дадзеныя.",
  night: "Апошняя агульная ноч", you: "Вы", h: "г", nothing: "няма даных",
  verdictEqual: "Спалі роўна", verdictYou: "Вы спалі даўжэй на {h} г", verdictThem: "{name} спіць даўжэй на {h} г", synced: "Леглі амаль разам",
  waiting: "Чакаем ноч ад {name}", waitingYou: "Падзяліцеся сваёй ноччу ніжэй, і з’явіцца параўнанне",
  week: "Тыдзень удвух", avgSleep: "У сярэднім за ноч", usualBed: "Звычайна кладзецца", together: "Леглі разам", ofNights: "{n} з {m}", streak: "Серыя", days: "дн.",
  chart: "Гадзіны сну за 7 дзён", axis: "Ноч на шкале часу", manage: "Падзяліцца ноччу і кіраваць парай",
  q: "Ацэнка",
};

const uk: Strings = {
  emptyTitle: "Тут буде сон вашої пари", emptyBody: "Почніть Sleep Party з коханою людиною або другом: ви побачите, коли він лягає й встає, а він побачить ваші ночі. Ділитися можна лише тими ночами, якими хочеться.",
  needFriend: "Спершу додайте друга у вкладці «Друзі»",
  stAsleep: "Імовірно, спить", stAwake: "Не спить, у мережі", stUp: "Вже не спить, підйом о {t}", stUnknown: "Поза звичними годинами сну",
  stHint: "Це оцінка за звичними годинами сну зі спільних ночей, а не точні дані.",
  night: "Остання спільна ніч", you: "Ви", h: "г", nothing: "немає даних",
  verdictEqual: "Спали порівну", verdictYou: "Ви спали довше на {h} г", verdictThem: "{name} спить довше на {h} г", synced: "Лягли майже разом",
  waiting: "Чекаємо ніч від {name}", waitingYou: "Поділіться своєю ніччю нижче, і з’явиться порівняння",
  week: "Тиждень удвох", avgSleep: "У середньому за ніч", usualBed: "Зазвичай лягає", together: "Лягли разом", ofNights: "{n} з {m}", streak: "Серія", days: "дн.",
  chart: "Години сну за 7 днів", axis: "Ніч на шкалі часу", manage: "Поділитися ніччю та керувати парою",
  q: "Оцінка",
};

const de: Strings = {
  emptyTitle: "Hier erscheint der Schlaf deines Paars", emptyBody: "Starte eine Sleep Party mit deinem Menschen oder einer Freundin bzw. einem Freund: Du siehst, wann er oder sie ins Bett geht und aufsteht, und umgekehrt. Geteilt werden nur Nächte, die du auswählst.",
  needFriend: "Füge zuerst im Tab „Freunde“ jemanden hinzu",
  stAsleep: "Schläft wahrscheinlich", stAwake: "Wach, online", stUp: "Schon wach, aufgestanden um {t}", stUnknown: "Außerhalb der üblichen Schlafzeit",
  stHint: "Das ist eine Schätzung nach den üblichen Schlafzeiten aus geteilten Nächten, keine genauen Daten.",
  night: "Letzte gemeinsame Nacht", you: "Du", h: "Std.", nothing: "keine Daten",
  verdictEqual: "Gleich lang geschlafen", verdictYou: "Du hast {h} Std. länger geschlafen", verdictThem: "{name} hat {h} Std. länger geschlafen", synced: "Fast gleichzeitig ins Bett",
  waiting: "Warten auf eine Nacht von {name}", waitingYou: "Teile unten deine Nacht, dann erscheint der Vergleich",
  week: "Die Woche zu zweit", avgSleep: "Durchschnitt pro Nacht", usualBed: "Geht meist ins Bett um", together: "Zusammen im Bett", ofNights: "{n} von {m}", streak: "Serie", days: "T.",
  chart: "Schlafstunden, 7 Tage", axis: "Die Nacht auf der Zeitachse", manage: "Nacht teilen und Paar verwalten",
  q: "Bewertung",
};

const fr: Strings = {
  emptyTitle: "Le sommeil de votre duo apparaîtra ici", emptyBody: "Lancez une Sleep Party avec votre moitié ou un ami : vous voyez quand iel se couche et se lève, et iel voit vos nuits. Vous ne partagez que les nuits que vous choisissez.",
  needFriend: "Ajoutez d’abord un ami dans l’onglet Amis",
  stAsleep: "Dort probablement", stAwake: "Éveillé·e, en ligne", stUp: "Déjà debout, réveil à {t}", stUnknown: "Hors de ses heures de sommeil habituelles",
  stHint: "C’est une estimation d’après les heures de sommeil habituelles des nuits partagées, pas une donnée exacte.",
  night: "Dernière nuit commune", you: "Vous", h: "h", nothing: "pas de données",
  verdictEqual: "Même durée de sommeil", verdictYou: "Vous avez dormi {h} h de plus", verdictThem: "{name} a dormi {h} h de plus", synced: "Couchés presque ensemble",
  waiting: "En attente d’une nuit de {name}", waitingYou: "Partagez votre nuit ci-dessous pour voir la comparaison",
  week: "La semaine à deux", avgSleep: "Moyenne par nuit", usualBed: "Se couche d’habitude à", together: "Couchés ensemble", ofNights: "{n} sur {m}", streak: "Série", days: "j",
  chart: "Heures de sommeil sur 7 jours", axis: "La nuit sur la frise horaire", manage: "Partager une nuit et gérer le duo",
  q: "Note",
};

const es: Strings = {
  emptyTitle: "Aquí aparecerá el sueño de tu pareja", emptyBody: "Empieza una Sleep Party con tu persona o un amigo: verás cuándo se acuesta y se levanta, y verá tus noches. Solo compartes las noches que elijas.",
  needFriend: "Primero añade un amigo en la pestaña Amigos",
  stAsleep: "Probablemente duerme", stAwake: "Despierto/a, en línea", stUp: "Ya despierto/a, se levantó a las {t}", stUnknown: "Fuera de su horario habitual de sueño",
  stHint: "Es una estimación según sus horas de sueño habituales en noches compartidas, no datos exactos.",
  night: "Última noche compartida", you: "Tú", h: "h", nothing: "sin datos",
  verdictEqual: "Durmieron igual", verdictYou: "Dormiste {h} h más", verdictThem: "{name} durmió {h} h más", synced: "Se acostaron casi juntos",
  waiting: "Esperando una noche de {name}", waitingYou: "Comparte tu noche abajo y aparecerá la comparación",
  week: "La semana juntos", avgSleep: "Media por noche", usualBed: "Suele acostarse a las", together: "Acostados juntos", ofNights: "{n} de {m}", streak: "Racha", days: "d",
  chart: "Horas de sueño, 7 días", axis: "La noche en la línea de tiempo", manage: "Compartir una noche y gestionar la pareja",
  q: "Valoración",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type PairKey = keyof Strings;
export const makePair = (lang: Lang) => (k: PairKey): string => (ALL[lang] ?? en)[k];
