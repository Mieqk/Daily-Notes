import type { Lang } from "./i18n";

/** Строки поиска трека и мини-плеера. */
const ru = {
  search: "Найти трек или исполнителя", searching: "Ищем…", none: "Ничего не нашлось. Попробуйте иначе или введите вручную",
  fail: "Поиск сейчас недоступен. Можно ввести трек вручную", manual: "Ввести вручную", manualHide: "Скрыть ручной ввод",
  add: "Добавить", added: "Добавлено", preview: "Превью 30 секунд", full: "Слушать полностью", play: "Играть", pause: "Пауза",
  searchNote: "Поиск и обложки даёт Apple Music. Играет 30-секундное превью.", clear: "Убрать",
  prev: "Предыдущий", next: "Следующий", repeat: "Повтор", queue: "Очередь", pickOne: "Выберите трек, чтобы включить плеер", noPreview: "Для этого трека нет превью: он откроется в плеере сервиса",
  fullHere: "Слушать целиком", fullHint: "Откроется плеер сервиса: он играет весь трек", backPreview: "Назад к превью",
  volume: "Громкость", mute: "Без звука", closePlayer: "Закрыть плеер", collapse: "Свернуть", openPlayer: "Открыть плеер",
};
type Strings = typeof ru;

const en: Strings = {
  search: "Find a track or artist", searching: "Searching…", none: "Nothing found. Try different words or type it in manually",
  fail: "Search is unavailable right now. You can type the track in manually", manual: "Type manually", manualHide: "Hide manual entry",
  add: "Add", added: "Added", preview: "30-second preview", full: "Listen in full", play: "Play", pause: "Pause",
  searchNote: "Search and covers come from Apple Music. A 30-second preview plays.", clear: "Remove",
  prev: "Previous", next: "Next", repeat: "Repeat", queue: "Queue", pickOne: "Pick a track to start the player", noPreview: "This track has no preview: it opens in the service player",
  fullHere: "Listen in full", fullHint: "The service player opens and plays the whole track", backPreview: "Back to preview",
  volume: "Volume", mute: "Mute", closePlayer: "Close player", collapse: "Collapse", openPlayer: "Open player",
};

const be: Strings = {
  search: "Знайсці трэк або выканаўцу", searching: "Шукаем…", none: "Нічога не знайшлося. Паспрабуйце інакш або ўвядзіце ўручную",
  fail: "Пошук зараз недаступны. Можна ўвесці трэк уручную", manual: "Увесці ўручную", manualHide: "Схаваць ручны ўвод",
  add: "Дадаць", added: "Дададзена", preview: "Прэв'ю 30 секунд", full: "Слухаць цалкам", play: "Іграць", pause: "Паўза",
  searchNote: "Пошук і вокладкі дае Apple Music. Іграе 30-секунднае прэв'ю.", clear: "Прыбраць",
  prev: "Папярэдні", next: "Наступны", repeat: "Паўтор", queue: "Чарга", pickOne: "Абярыце трэк, каб уключыць плэер", noPreview: "Для гэтага трэка няма прэв'ю: ён адкрыецца ў плэеры сэрвісу",
  fullHere: "Слухаць цалкам", fullHint: "Адкрыецца плэер сэрвісу: ён іграе ўвесь трэк", backPreview: "Назад да прэв'ю",
  volume: "Гучнасць", mute: "Без гуку", closePlayer: "Закрыць плэер", collapse: "Згарнуць", openPlayer: "Адкрыць плэер",
};

const uk: Strings = {
  search: "Знайти трек або виконавця", searching: "Шукаємо…", none: "Нічого не знайшлося. Спробуйте інакше або введіть вручну",
  fail: "Пошук зараз недоступний. Можна ввести трек вручну", manual: "Ввести вручну", manualHide: "Сховати ручне введення",
  add: "Додати", added: "Додано", preview: "Прев'ю 30 секунд", full: "Слухати повністю", play: "Грати", pause: "Пауза",
  searchNote: "Пошук і обкладинки дає Apple Music. Грає 30-секундне прев'ю.", clear: "Прибрати",
  prev: "Попередній", next: "Наступний", repeat: "Повтор", queue: "Черга", pickOne: "Оберіть трек, щоб увімкнути плеєр", noPreview: "Для цього треку немає прев'ю: він відкриється в плеєрі сервісу",
  fullHere: "Слухати повністю", fullHint: "Відкриється плеєр сервісу: він грає весь трек", backPreview: "Назад до прев'ю",
  volume: "Гучність", mute: "Без звуку", closePlayer: "Закрити плеєр", collapse: "Згорнути", openPlayer: "Відкрити плеєр",
};

const de: Strings = {
  search: "Titel oder Künstler suchen", searching: "Suche…", none: "Nichts gefunden. Versuche andere Worte oder gib es manuell ein",
  fail: "Die Suche ist gerade nicht verfügbar. Du kannst den Titel manuell eingeben", manual: "Manuell eingeben", manualHide: "Manuelle Eingabe ausblenden",
  add: "Hinzufügen", added: "Hinzugefügt", preview: "30-Sekunden-Vorschau", full: "Ganz anhören", play: "Abspielen", pause: "Pause",
  searchNote: "Suche und Cover kommen von Apple Music. Es spielt eine 30-Sekunden-Vorschau.", clear: "Entfernen",
  prev: "Zurück", next: "Weiter", repeat: "Wiederholen", queue: "Warteschlange", pickOne: "Wähle einen Titel, um den Player zu starten", noPreview: "Für diesen Titel gibt es keine Vorschau: Er öffnet sich im Player des Dienstes",
  fullHere: "Ganz anhören", fullHint: "Der Player des Dienstes öffnet sich und spielt den ganzen Titel", backPreview: "Zurück zur Vorschau",
  volume: "Lautstärke", mute: "Stumm", closePlayer: "Player schließen", collapse: "Einklappen", openPlayer: "Player öffnen",
};

const fr: Strings = {
  search: "Chercher un titre ou un artiste", searching: "Recherche…", none: "Rien trouvé. Essayez d'autres mots ou saisissez à la main",
  fail: "La recherche est indisponible pour le moment. Vous pouvez saisir le titre à la main", manual: "Saisir à la main", manualHide: "Masquer la saisie manuelle",
  add: "Ajouter", added: "Ajouté", preview: "Aperçu de 30 secondes", full: "Écouter en entier", play: "Lire", pause: "Pause",
  searchNote: "La recherche et les pochettes viennent d'Apple Music. Un aperçu de 30 secondes est lu.", clear: "Retirer",
  prev: "Précédent", next: "Suivant", repeat: "Répéter", queue: "File d'attente", pickOne: "Choisissez un titre pour lancer le lecteur", noPreview: "Ce titre n'a pas d'aperçu : il s'ouvre dans le lecteur du service",
  fullHere: "Écouter en entier", fullHint: "Le lecteur du service s'ouvre et joue tout le titre", backPreview: "Retour à l'aperçu",
  volume: "Volume", mute: "Muet", closePlayer: "Fermer le lecteur", collapse: "Réduire", openPlayer: "Ouvrir le lecteur",
};

const es: Strings = {
  search: "Buscar canción o artista", searching: "Buscando…", none: "No se encontró nada. Prueba con otras palabras o escríbela a mano",
  fail: "La búsqueda no está disponible ahora. Puedes escribir la canción a mano", manual: "Escribir a mano", manualHide: "Ocultar entrada manual",
  add: "Añadir", added: "Añadido", preview: "Vista previa de 30 segundos", full: "Escuchar completa", play: "Reproducir", pause: "Pausa",
  searchNote: "La búsqueda y las portadas vienen de Apple Music. Suena una vista previa de 30 segundos.", clear: "Quitar",
  prev: "Anterior", next: "Siguiente", repeat: "Repetir", queue: "Cola", pickOne: "Elige una canción para iniciar el reproductor", noPreview: "Esta canción no tiene vista previa: se abre en el reproductor del servicio",
  fullHere: "Escuchar completa", fullHint: "Se abre el reproductor del servicio y suena toda la canción", backPreview: "Volver a la vista previa",
  volume: "Volumen", mute: "Silenciar", closePlayer: "Cerrar reproductor", collapse: "Contraer", openPlayer: "Abrir reproductor",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type SearchKey = keyof Strings;
export const makeSearch = (lang: Lang) => (k: SearchKey): string => (ALL[lang] ?? en)[k];
