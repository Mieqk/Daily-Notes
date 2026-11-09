import type { Lang } from "./i18n";

/** Строки поиска трека и мини-плеера. */
const ru = {
  search: "Найти трек или исполнителя", searching: "Ищем…", none: "Ничего не нашлось. Попробуйте иначе или введите вручную",
  fail: "Поиск сейчас недоступен. Можно ввести трек вручную", manual: "Ввести вручную", manualHide: "Скрыть ручной ввод",
  add: "Добавить", added: "Добавлено", preview: "Превью 30 секунд", full: "Слушать полностью", play: "Играть", pause: "Пауза",
  searchNote: "Поиск и обложки даёт Apple Music. Играет 30-секундное превью.", clear: "Убрать",
};
type Strings = typeof ru;

const en: Strings = {
  search: "Find a track or artist", searching: "Searching…", none: "Nothing found. Try different words or type it in manually",
  fail: "Search is unavailable right now. You can type the track in manually", manual: "Type manually", manualHide: "Hide manual entry",
  add: "Add", added: "Added", preview: "30-second preview", full: "Listen in full", play: "Play", pause: "Pause",
  searchNote: "Search and covers come from Apple Music. A 30-second preview plays.", clear: "Remove",
};

const be: Strings = {
  search: "Знайсці трэк або выканаўцу", searching: "Шукаем…", none: "Нічога не знайшлося. Паспрабуйце інакш або ўвядзіце ўручную",
  fail: "Пошук зараз недаступны. Можна ўвесці трэк уручную", manual: "Увесці ўручную", manualHide: "Схаваць ручны ўвод",
  add: "Дадаць", added: "Дададзена", preview: "Прэв'ю 30 секунд", full: "Слухаць цалкам", play: "Іграць", pause: "Паўза",
  searchNote: "Пошук і вокладкі дае Apple Music. Іграе 30-секунднае прэв'ю.", clear: "Прыбраць",
};

const uk: Strings = {
  search: "Знайти трек або виконавця", searching: "Шукаємо…", none: "Нічого не знайшлося. Спробуйте інакше або введіть вручну",
  fail: "Пошук зараз недоступний. Можна ввести трек вручну", manual: "Ввести вручну", manualHide: "Сховати ручне введення",
  add: "Додати", added: "Додано", preview: "Прев'ю 30 секунд", full: "Слухати повністю", play: "Грати", pause: "Пауза",
  searchNote: "Пошук і обкладинки дає Apple Music. Грає 30-секундне прев'ю.", clear: "Прибрати",
};

const de: Strings = {
  search: "Titel oder Künstler suchen", searching: "Suche…", none: "Nichts gefunden. Versuche andere Worte oder gib es manuell ein",
  fail: "Die Suche ist gerade nicht verfügbar. Du kannst den Titel manuell eingeben", manual: "Manuell eingeben", manualHide: "Manuelle Eingabe ausblenden",
  add: "Hinzufügen", added: "Hinzugefügt", preview: "30-Sekunden-Vorschau", full: "Ganz anhören", play: "Abspielen", pause: "Pause",
  searchNote: "Suche und Cover kommen von Apple Music. Es spielt eine 30-Sekunden-Vorschau.", clear: "Entfernen",
};

const fr: Strings = {
  search: "Chercher un titre ou un artiste", searching: "Recherche…", none: "Rien trouvé. Essayez d'autres mots ou saisissez à la main",
  fail: "La recherche est indisponible pour le moment. Vous pouvez saisir le titre à la main", manual: "Saisir à la main", manualHide: "Masquer la saisie manuelle",
  add: "Ajouter", added: "Ajouté", preview: "Aperçu de 30 secondes", full: "Écouter en entier", play: "Lire", pause: "Pause",
  searchNote: "La recherche et les pochettes viennent d'Apple Music. Un aperçu de 30 secondes est lu.", clear: "Retirer",
};

const es: Strings = {
  search: "Buscar canción o artista", searching: "Buscando…", none: "No se encontró nada. Prueba con otras palabras o escríbela a mano",
  fail: "La búsqueda no está disponible ahora. Puedes escribir la canción a mano", manual: "Escribir a mano", manualHide: "Ocultar entrada manual",
  add: "Añadir", added: "Añadido", preview: "Vista previa de 30 segundos", full: "Escuchar completa", play: "Reproducir", pause: "Pausa",
  searchNote: "La búsqueda y las portadas vienen de Apple Music. Suena una vista previa de 30 segundos.", clear: "Quitar",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type SearchKey = keyof Strings;
export const makeSearch = (lang: Lang) => (k: SearchKey): string => (ALL[lang] ?? en)[k];
