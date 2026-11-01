import type { Lang } from "./i18n";

/** Строки карточки «Занят(а) / свободен(на)». Без слов про «пару», подходят для любого типа связи. */
const ru = {
  title: "Занятость", hint: "Отметка на пару секунд, чтобы {name} знал(а), когда можно побыть вместе.",
  busy: "Занят(а)", evening: "Свободен(на) вечером", free: "Свободен(на) весь день",
  none: "{name} пока не отметил(а) этот день", their: "{name}: {status}", mine: "Вы: {status}",
  notePh: "Коротко: почему или когда (по желанию)", noteSave: "Сохранить", clear: "Снять отметку",
  weekTitle: "Ближайшие дни", weekHint: "Нажмите на свой день, чтобы сменить отметку.", you: "Вы",
  both: "Свободны оба: {days}", noBoth: "Пока нет дней, когда свободны оба",
  err: "Не получилось, попробуйте ещё раз", setup: "Заработает после обновления базы (миграция 20261115_pair_availability.sql)",
  sBusy: "занят(а)", sEvening: "свободен(на) вечером", sFree: "свободен(на) весь день",
};
type Strings = typeof ru;
const en: Strings = {
  title: "Busy or free", hint: "A two-second tap so {name} knows when you can spend time together.",
  busy: "Busy", evening: "Free in the evening", free: "Free all day",
  none: "{name} hasn't marked today yet", their: "{name}: {status}", mine: "You: {status}",
  notePh: "A few words: why or when (optional)", noteSave: "Save", clear: "Clear mark",
  weekTitle: "The week ahead", weekHint: "Tap your own day to change the mark.", you: "You",
  both: "Both free: {days}", noBoth: "No days yet when you are both free",
  err: "Couldn't do it, please try again", setup: "Will work after the database update (migration 20261115_pair_availability.sql)",
  sBusy: "busy", sEvening: "free in the evening", sFree: "free all day",
};
const be: Strings = {
  title: "Заняты ці вольны", hint: "Адзнака на пару секунд, каб {name} ведаў(ла), калі можна пабыць разам.",
  busy: "Занят(а)", evening: "Вольны(ая) увечары", free: "Вольны(ая) увесь дзень",
  none: "{name} пакуль не адзначыў(ла) гэты дзень", their: "{name}: {status}", mine: "Вы: {status}",
  notePh: "Коратка: чаму або калі (па жаданні)", noteSave: "Захаваць", clear: "Зняць адзнаку",
  weekTitle: "Тыдзень наперад", weekHint: "Націсніце на свой дзень, каб змяніць адзнаку.", you: "Вы",
  both: "Вольныя абодва: {days}", noBoth: "Пакуль няма дзён, калі вольныя абодва",
  err: "Не атрымалася, паспрабуйце яшчэ раз", setup: "Запрацуе пасля абнаўлення базы (міграцыя 20261115_pair_availability.sql)",
  sBusy: "занят(а)", sEvening: "вольны(ая) увечары", sFree: "вольны(ая) увесь дзень",
};
const uk: Strings = {
  title: "Зайняті чи вільні", hint: "Позначка на пару секунд, щоб {name} знав(ла), коли можна побути разом.",
  busy: "Зайнятий(а)", evening: "Вільний(а) ввечері", free: "Вільний(а) весь день",
  none: "{name} поки не позначив(ла) цей день", their: "{name}: {status}", mine: "Ви: {status}",
  notePh: "Коротко: чому чи коли (за бажанням)", noteSave: "Зберегти", clear: "Зняти позначку",
  weekTitle: "Тиждень наперед", weekHint: "Натисніть на свій день, щоб змінити позначку.", you: "Ви",
  both: "Вільні обоє: {days}", noBoth: "Поки немає днів, коли вільні обоє",
  err: "Не вдалося, спробуйте ще раз", setup: "Запрацює після оновлення бази (міграція 20261115_pair_availability.sql)",
  sBusy: "зайнятий(а)", sEvening: "вільний(а) ввечері", sFree: "вільний(а) весь день",
};
const de: Strings = {
  title: "Beschäftigt oder frei", hint: "Ein Fingertipp, damit {name} weiß, wann ihr Zeit zusammen habt.",
  busy: "Beschäftigt", evening: "Abends frei", free: "Den ganzen Tag frei",
  none: "{name} hat heute noch nichts markiert", their: "{name}: {status}", mine: "Du: {status}",
  notePh: "Kurz: warum oder wann (optional)", noteSave: "Speichern", clear: "Markierung entfernen",
  weekTitle: "Die Woche voraus", weekHint: "Tippe auf deinen Tag, um die Markierung zu ändern.", you: "Du",
  both: "Beide frei: {days}", noBoth: "Noch keine Tage, an denen ihr beide frei seid",
  err: "Das hat nicht geklappt, bitte erneut versuchen", setup: "Funktioniert nach dem Datenbank-Update (Migration 20261115_pair_availability.sql)",
  sBusy: "beschäftigt", sEvening: "abends frei", sFree: "den ganzen Tag frei",
};
const fr: Strings = {
  title: "Occupé ou libre", hint: "Un tap de deux secondes pour que {name} sache quand vous pouvez vous voir.",
  busy: "Occupé(e)", evening: "Libre le soir", free: "Libre toute la journée",
  none: "{name} n’a pas encore indiqué aujourd’hui", their: "{name} : {status}", mine: "Vous : {status}",
  notePh: "En bref : pourquoi ou quand (facultatif)", noteSave: "Enregistrer", clear: "Retirer l’indication",
  weekTitle: "La semaine à venir", weekHint: "Touchez votre jour pour changer l’indication.", you: "Vous",
  both: "Libres tous les deux : {days}", noBoth: "Aucun jour où vous êtes libres tous les deux",
  err: "Échec, réessayez", setup: "Fonctionnera après la mise à jour de la base (migration 20261115_pair_availability.sql)",
  sBusy: "occupé(e)", sEvening: "libre le soir", sFree: "libre toute la journée",
};
const es: Strings = {
  title: "Ocupado o libre", hint: "Un toque de dos segundos para que {name} sepa cuándo podéis estar juntos.",
  busy: "Ocupado/a", evening: "Libre por la tarde", free: "Libre todo el día",
  none: "{name} aún no ha marcado hoy", their: "{name}: {status}", mine: "Tú: {status}",
  notePh: "Breve: por qué o cuándo (opcional)", noteSave: "Guardar", clear: "Quitar marca",
  weekTitle: "La semana que viene", weekHint: "Toca tu día para cambiar la marca.", you: "Tú",
  both: "Libres los dos: {days}", noBoth: "Aún no hay días en que ambos estéis libres",
  err: "No se pudo, inténtalo de nuevo", setup: "Funcionará tras actualizar la base (migración 20261115_pair_availability.sql)",
  sBusy: "ocupado/a", sEvening: "libre por la tarde", sFree: "libre todo el día",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type AvailKey = keyof Strings;
export const makeAvail = (lang: Lang) => (k: AvailKey): string => (ALL[lang] ?? en)[k];
