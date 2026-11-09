import type { Lang } from "./i18n";

/** Строки общего плейлиста в «Парном». Без слов про тип связи. */
const ru = {
  title: "Общий плейлист", hint: "Добавляйте песни друг для друга: {name} увидит их здесь и сможет послушать.",
  add: "Добавить песню", empty: "Пока пусто. Добавьте первую песню!", byYou: "Добавили вы", byThem: "Добавил(а) {name}",
  del: "Убрать", delSure: "Точно?", full: "В плейлисте уже 100 песен", err: "Не получилось, попробуйте ещё раз",
  setup: "Заработает после обновления базы (миграция 20261124_pair_playlist.sql)", added: "Песня добавлена",
};
type Strings = typeof ru;
const en: Strings = {
  title: "Shared playlist", hint: "Add songs for each other: {name} will see them here and can listen.",
  add: "Add a song", empty: "Nothing here yet. Add the first song!", byYou: "Added by you", byThem: "Added by {name}",
  del: "Remove", delSure: "Sure?", full: "The playlist already has 100 songs", err: "Couldn't do it, please try again",
  setup: "Will work after the database update (migration 20261124_pair_playlist.sql)", added: "Song added",
};
const be: Strings = {
  title: "Агульны плэйліст", hint: "Дадавайце песні адно для аднаго: {name} убачыць іх тут і зможа паслухаць.",
  add: "Дадаць песню", empty: "Пакуль пуста. Дадайце першую песню!", byYou: "Дадалі вы", byThem: "Дадаў(ла) {name}",
  del: "Прыбраць", delSure: "Дакладна?", full: "У плэйлісце ўжо 100 песень", err: "Не атрымалася, паспрабуйце яшчэ раз",
  setup: "Запрацуе пасля абнаўлення базы (міграцыя 20261124_pair_playlist.sql)", added: "Песню дададзена",
};
const uk: Strings = {
  title: "Спільний плейлист", hint: "Додавайте пісні одне для одного: {name} побачить їх тут і зможе послухати.",
  add: "Додати пісню", empty: "Поки порожньо. Додайте першу пісню!", byYou: "Додали ви", byThem: "Додав(ла) {name}",
  del: "Прибрати", delSure: "Точно?", full: "У плейлисті вже 100 пісень", err: "Не вийшло, спробуйте ще раз",
  setup: "Запрацює після оновлення бази (міграція 20261124_pair_playlist.sql)", added: "Пісню додано",
};
const de: Strings = {
  title: "Gemeinsame Playlist", hint: "Fügt Songs füreinander hinzu: {name} sieht sie hier und kann sie anhören.",
  add: "Song hinzufügen", empty: "Noch leer. Füge den ersten Song hinzu!", byYou: "Von dir hinzugefügt", byThem: "Hinzugefügt von {name}",
  del: "Entfernen", delSure: "Sicher?", full: "Die Playlist hat schon 100 Songs", err: "Das hat nicht geklappt, versuche es erneut",
  setup: "Funktioniert nach dem Datenbank-Update (Migration 20261124_pair_playlist.sql)", added: "Song hinzugefügt",
};
const fr: Strings = {
  title: "Playlist commune", hint: "Ajoutez des titres l'un pour l'autre : {name} les verra ici et pourra les écouter.",
  add: "Ajouter un titre", empty: "Rien pour l'instant. Ajoutez le premier titre !", byYou: "Ajouté par vous", byThem: "Ajouté par {name}",
  del: "Retirer", delSure: "Sûr ?", full: "La playlist contient déjà 100 titres", err: "Échec, réessayez",
  setup: "Fonctionnera après la mise à jour de la base (migration 20261124_pair_playlist.sql)", added: "Titre ajouté",
};
const es: Strings = {
  title: "Lista compartida", hint: "Añadid canciones el uno para el otro: {name} las verá aquí y podrá escucharlas.",
  add: "Añadir canción", empty: "Aún no hay nada. ¡Añade la primera canción!", byYou: "Añadida por ti", byThem: "Añadida por {name}",
  del: "Quitar", delSure: "¿Seguro?", full: "La lista ya tiene 100 canciones", err: "No se pudo, inténtalo de nuevo",
  setup: "Funcionará tras actualizar la base (migración 20261124_pair_playlist.sql)", added: "Canción añadida",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type PairPlaylistKey = keyof Strings;
export const makePairPlaylist = (lang: Lang) => (k: PairPlaylistKey): string => (ALL[lang] ?? en)[k];
