import type { Lang } from "./i18n";

/** Строки плейлиста и треков на стене. */
const ru = {
  title: "Плейлист", empty: "Плейлист пуст. Добавьте первый трек!", emptyOther: "Плейлист пока пуст",
  add: "Добавить трек", play: "Слушать", hide: "Скрыть плеер", open: "Открыть в сервисе",
  toWall: "На стену", onWall: "Добавлено на стену", setNow: "Сейчас играет", nowSet: "Показано в профиле",
  del: "Удалить", delSure: "Точно?", full: "В плейлисте уже 50 треков", err: "Не удалось. Выполнена ли миграция?",
  playerNote: "Играет то, что отдаёт сам сервис: у Spotify без входа обычно отрывок, полный трек в Яндекс Музыке и YouTube доступен по их правилам.",
  upload: "Загрузить свой файл", uploading: "Загружаем…", uploaded: "Файл добавлен", uploadNote: "Файл слышите вы и ваши друзья. До 12 МБ, до 10 файлов.", notAudio: "Это не аудиофайл", tooBig: "Файл больше 12 МБ", filesFull: "Можно держать не больше 10 своих файлов", uploadErr: "Не удалось загрузить. Выполнена ли миграция?",
  wallTrack: "Трек",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Playlist", empty: "The playlist is empty. Add your first track!", emptyOther: "The playlist is empty",
  add: "Add track", play: "Listen", hide: "Hide player", open: "Open in the service",
  toWall: "To wall", onWall: "Added to the wall", setNow: "Now playing", nowSet: "Shown on profile",
  del: "Delete", delSure: "Sure?", full: "The playlist already has 50 tracks", err: "Failed. Has the migration been run?",
  playerNote: "The player plays what the service allows: Spotify without a login usually gives a preview, YouTube and Yandex Music follow their own rules.",
  upload: "Upload your own file", uploading: "Uploading…", uploaded: "File added", uploadNote: "You and your friends can listen to it. Up to 12 MB, up to 10 files.", notAudio: "This is not an audio file", tooBig: "The file is over 12 MB", filesFull: "You can keep up to 10 files of your own", uploadErr: "Couldn't upload. Has the migration been run?",
  wallTrack: "Track",
};

const be: Strings = {
  title: "Плэйліст", empty: "Плэйліст пусты. Дадайце першы трэк!", emptyOther: "Плэйліст пакуль пусты",
  add: "Дадаць трэк", play: "Слухаць", hide: "Схаваць плэер", open: "Адкрыць у сэрвісе",
  toWall: "На сцяну", onWall: "Дададзена на сцяну", setNow: "Зараз іграе", nowSet: "Паказана ў профілі",
  del: "Выдаліць", delSure: "Дакладна?", full: "У плэйлісце ўжо 50 трэкаў", err: "Не ўдалося. Ці выкананая міграцыя?",
  playerNote: "Іграе тое, што аддае сам сэрвіс: у Spotify без уваходу звычайна ўрывак, YouTube і Яндекс Музыка маюць свае правілы.",
  upload: "Загрузіць свой файл", uploading: "Загружаем…", uploaded: "Файл дададзены", uploadNote: "Файл чуеце вы і вашы сябры. Да 12 МБ, да 10 файлаў.", notAudio: "Гэта не аўдыяфайл", tooBig: "Файл большы за 12 МБ", filesFull: "Можна трымаць не больш за 10 сваіх файлаў", uploadErr: "Не ўдалося загрузіць. Ці выкананая міграцыя?",
  wallTrack: "Трэк",
};

const uk: Strings = {
  title: "Плейлист", empty: "Плейлист порожній. Додайте перший трек!", emptyOther: "Плейлист поки порожній",
  add: "Додати трек", play: "Слухати", hide: "Сховати плеєр", open: "Відкрити в сервісі",
  toWall: "На стіну", onWall: "Додано на стіну", setNow: "Зараз грає", nowSet: "Показано в профілі",
  del: "Видалити", delSure: "Точно?", full: "У плейлисті вже 50 треків", err: "Не вдалося. Чи виконано міграцію?",
  playerNote: "Грає те, що віддає сам сервіс: у Spotify без входу зазвичай уривок, YouTube і Яндекс Музика мають свої правила.",
  upload: "Завантажити свій файл", uploading: "Завантажуємо…", uploaded: "Файл додано", uploadNote: "Файл чуєте ви та ваші друзі. До 12 МБ, до 10 файлів.", notAudio: "Це не аудіофайл", tooBig: "Файл більший за 12 МБ", filesFull: "Можна тримати не більше 10 своїх файлів", uploadErr: "Не вдалося завантажити. Чи виконано міграцію?",
  wallTrack: "Трек",
};

const de: Strings = {
  title: "Playlist", empty: "Die Playlist ist leer. Füge deinen ersten Titel hinzu!", emptyOther: "Die Playlist ist noch leer",
  add: "Titel hinzufügen", play: "Anhören", hide: "Player ausblenden", open: "Im Dienst öffnen",
  toWall: "An die Pinnwand", onWall: "An die Pinnwand gepostet", setNow: "Spielt gerade", nowSet: "Im Profil angezeigt",
  del: "Löschen", delSure: "Sicher?", full: "Die Playlist hat schon 50 Titel", err: "Fehlgeschlagen. Wurde die Migration ausgeführt?",
  playerNote: "Es spielt, was der Dienst erlaubt: Spotify ohne Login liefert meist einen Ausschnitt, YouTube und Yandex Music folgen eigenen Regeln.",
  upload: "Eigene Datei hochladen", uploading: "Lade hoch…", uploaded: "Datei hinzugefügt", uploadNote: "Du und deine Freunde könnt sie hören. Bis 12 MB, bis zu 10 Dateien.", notAudio: "Das ist keine Audiodatei", tooBig: "Die Datei ist größer als 12 MB", filesFull: "Du kannst bis zu 10 eigene Dateien behalten", uploadErr: "Hochladen fehlgeschlagen. Wurde die Migration ausgeführt?",
  wallTrack: "Titel",
};

const fr: Strings = {
  title: "Playlist", empty: "La playlist est vide. Ajoutez votre premier titre !", emptyOther: "La playlist est vide",
  add: "Ajouter un titre", play: "Écouter", hide: "Masquer le lecteur", open: "Ouvrir dans le service",
  toWall: "Sur le mur", onWall: "Ajouté au mur", setNow: "En écoute", nowSet: "Affiché sur le profil",
  del: "Supprimer", delSure: "Sûr ?", full: "La playlist compte déjà 50 titres", err: "Échec. La migration a-t-elle été exécutée ?",
  playerNote: "Le lecteur joue ce que le service autorise : Spotify sans connexion donne souvent un extrait, YouTube et Yandex Music suivent leurs règles.",
  upload: "Importer votre fichier", uploading: "Import…", uploaded: "Fichier ajouté", uploadNote: "Vous et vos amis pouvez l'écouter. Jusqu'à 12 Mo, jusqu'à 10 fichiers.", notAudio: "Ce n'est pas un fichier audio", tooBig: "Le fichier dépasse 12 Mo", filesFull: "Vous pouvez garder jusqu'à 10 fichiers", uploadErr: "Échec de l'import. La migration a-t-elle été exécutée ?",
  wallTrack: "Titre",
};

const es: Strings = {
  title: "Lista", empty: "La lista está vacía. ¡Añade tu primera canción!", emptyOther: "La lista está vacía",
  add: "Añadir canción", play: "Escuchar", hide: "Ocultar reproductor", open: "Abrir en el servicio",
  toWall: "Al muro", onWall: "Añadido al muro", setNow: "Sonando ahora", nowSet: "Mostrado en el perfil",
  del: "Eliminar", delSure: "¿Seguro?", full: "La lista ya tiene 50 canciones", err: "Error. ¿Se ejecutó la migración?",
  playerNote: "Suena lo que permite el servicio: Spotify sin sesión suele dar un fragmento, YouTube y Yandex Music siguen sus reglas.",
  upload: "Subir tu archivo", uploading: "Subiendo…", uploaded: "Archivo añadido", uploadNote: "Tú y tus amigos podéis escucharlo. Hasta 12 MB, hasta 10 archivos.", notAudio: "No es un archivo de audio", tooBig: "El archivo supera 12 MB", filesFull: "Puedes tener hasta 10 archivos propios", uploadErr: "No se pudo subir. ¿Se ejecutó la migración?",
  wallTrack: "Canción",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type PlaylistKey = keyof Strings;
export const makePlaylist = (lang: Lang) => (k: PlaylistKey): string => (ALL[lang] ?? en)[k];
