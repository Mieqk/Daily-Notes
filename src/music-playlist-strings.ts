import type { Lang } from "./i18n";

/** Строки плейлиста и треков на стене. */
const ru = {
  title: "Плейлист", empty: "Плейлист пуст. Добавьте первый трек!", emptyOther: "Плейлист пока пуст",
  add: "Добавить трек", play: "Слушать", hide: "Скрыть плеер", open: "Открыть в сервисе",
  toWall: "На стену", onWall: "Добавлено на стену", setNow: "Сейчас играет", nowSet: "Показано в профиле",
  del: "Удалить", delSure: "Точно?", full: "В плейлисте уже 50 треков", err: "Не удалось. Выполнена ли миграция?",
  playerNote: "Играет то, что отдаёт сам сервис: у Spotify без входа обычно отрывок, полный трек в Яндекс Музыке и YouTube доступен по их правилам.",
  wallTrack: "Трек",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Playlist", empty: "The playlist is empty. Add your first track!", emptyOther: "The playlist is empty",
  add: "Add track", play: "Listen", hide: "Hide player", open: "Open in the service",
  toWall: "To wall", onWall: "Added to the wall", setNow: "Now playing", nowSet: "Shown on profile",
  del: "Delete", delSure: "Sure?", full: "The playlist already has 50 tracks", err: "Failed. Has the migration been run?",
  playerNote: "The player plays what the service allows: Spotify without a login usually gives a preview, YouTube and Yandex Music follow their own rules.",
  wallTrack: "Track",
};

const be: Strings = {
  title: "Плэйліст", empty: "Плэйліст пусты. Дадайце першы трэк!", emptyOther: "Плэйліст пакуль пусты",
  add: "Дадаць трэк", play: "Слухаць", hide: "Схаваць плэер", open: "Адкрыць у сэрвісе",
  toWall: "На сцяну", onWall: "Дададзена на сцяну", setNow: "Зараз іграе", nowSet: "Паказана ў профілі",
  del: "Выдаліць", delSure: "Дакладна?", full: "У плэйлісце ўжо 50 трэкаў", err: "Не ўдалося. Ці выкананая міграцыя?",
  playerNote: "Іграе тое, што аддае сам сэрвіс: у Spotify без уваходу звычайна ўрывак, YouTube і Яндекс Музыка маюць свае правілы.",
  wallTrack: "Трэк",
};

const uk: Strings = {
  title: "Плейлист", empty: "Плейлист порожній. Додайте перший трек!", emptyOther: "Плейлист поки порожній",
  add: "Додати трек", play: "Слухати", hide: "Сховати плеєр", open: "Відкрити в сервісі",
  toWall: "На стіну", onWall: "Додано на стіну", setNow: "Зараз грає", nowSet: "Показано в профілі",
  del: "Видалити", delSure: "Точно?", full: "У плейлисті вже 50 треків", err: "Не вдалося. Чи виконано міграцію?",
  playerNote: "Грає те, що віддає сам сервіс: у Spotify без входу зазвичай уривок, YouTube і Яндекс Музика мають свої правила.",
  wallTrack: "Трек",
};

const de: Strings = {
  title: "Playlist", empty: "Die Playlist ist leer. Füge deinen ersten Titel hinzu!", emptyOther: "Die Playlist ist noch leer",
  add: "Titel hinzufügen", play: "Anhören", hide: "Player ausblenden", open: "Im Dienst öffnen",
  toWall: "An die Pinnwand", onWall: "An die Pinnwand gepostet", setNow: "Spielt gerade", nowSet: "Im Profil angezeigt",
  del: "Löschen", delSure: "Sicher?", full: "Die Playlist hat schon 50 Titel", err: "Fehlgeschlagen. Wurde die Migration ausgeführt?",
  playerNote: "Es spielt, was der Dienst erlaubt: Spotify ohne Login liefert meist einen Ausschnitt, YouTube und Yandex Music folgen eigenen Regeln.",
  wallTrack: "Titel",
};

const fr: Strings = {
  title: "Playlist", empty: "La playlist est vide. Ajoutez votre premier titre !", emptyOther: "La playlist est vide",
  add: "Ajouter un titre", play: "Écouter", hide: "Masquer le lecteur", open: "Ouvrir dans le service",
  toWall: "Sur le mur", onWall: "Ajouté au mur", setNow: "En écoute", nowSet: "Affiché sur le profil",
  del: "Supprimer", delSure: "Sûr ?", full: "La playlist compte déjà 50 titres", err: "Échec. La migration a-t-elle été exécutée ?",
  playerNote: "Le lecteur joue ce que le service autorise : Spotify sans connexion donne souvent un extrait, YouTube et Yandex Music suivent leurs règles.",
  wallTrack: "Titre",
};

const es: Strings = {
  title: "Lista", empty: "La lista está vacía. ¡Añade tu primera canción!", emptyOther: "La lista está vacía",
  add: "Añadir canción", play: "Escuchar", hide: "Ocultar reproductor", open: "Abrir en el servicio",
  toWall: "Al muro", onWall: "Añadido al muro", setNow: "Sonando ahora", nowSet: "Mostrado en el perfil",
  del: "Eliminar", delSure: "¿Seguro?", full: "La lista ya tiene 50 canciones", err: "Error. ¿Se ejecutó la migración?",
  playerNote: "Suena lo que permite el servicio: Spotify sin sesión suele dar un fragmento, YouTube y Yandex Music siguen sus reglas.",
  wallTrack: "Canción",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type PlaylistKey = keyof Strings;
export const makePlaylist = (lang: Lang) => (k: PlaylistKey): string => (ALL[lang] ?? en)[k];
