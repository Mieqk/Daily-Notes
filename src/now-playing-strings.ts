import type { Lang } from "./i18n";

/** Строки плашки «сейчас играет» в профиле. */
const ru = {
  title: "Музыка", hint: "Выберите трек, и друзья увидят его в вашем профиле, как в Telegram.",
  trackPh: "Название трека", artistPh: "Исполнитель", urlPh: "Ссылка (Spotify, Яндекс Музыка…), по желанию",
  set: "Показать в профиле", clear: "Убрать", saved: "Музыка обновлена", failed: "Не удалось сохранить. Выполнена ли миграция?",
  badUrl: "Ссылка не подошла: нужна https-ссылка на музыкальный сервис. Трек сохранён без неё.",
  live: "Сейчас играет", recent: "Недавно слушал(а)", privMusic: "Музыка", open: "Открыть трек",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Music", hint: "Pick a track and friends will see it on your profile, like in Telegram.",
  trackPh: "Track title", artistPh: "Artist", urlPh: "Link (Spotify, Yandex Music…), optional",
  set: "Show on profile", clear: "Remove", saved: "Music updated", failed: "Couldn't save. Has the migration been run?",
  badUrl: "The link didn't fit: it must be an https link to a music service. The track was saved without it.",
  live: "Now playing", recent: "Recently listened", privMusic: "Music", open: "Open track",
};

const be: Strings = {
  title: "Музыка", hint: "Абярыце трэк, і сябры ўбачаць яго ў вашым профілі, як у Telegram.",
  trackPh: "Назва трэка", artistPh: "Выканаўца", urlPh: "Спасылка (Spotify, Яндекс Музыка…), па жаданні",
  set: "Паказаць у профілі", clear: "Прыбраць", saved: "Музыка абноўлена", failed: "Не ўдалося захаваць. Ці выкананая міграцыя?",
  badUrl: "Спасылка не падышла: патрэбна https-спасылка на музычны сэрвіс. Трэк захаваны без яе.",
  live: "Зараз іграе", recent: "Нядаўна слухаў(ла)", privMusic: "Музыка", open: "Адкрыць трэк",
};

const uk: Strings = {
  title: "Музика", hint: "Оберіть трек, і друзі побачать його у вашому профілі, як у Telegram.",
  trackPh: "Назва треку", artistPh: "Виконавець", urlPh: "Посилання (Spotify, Яндекс Музика…), за бажанням",
  set: "Показати в профілі", clear: "Прибрати", saved: "Музику оновлено", failed: "Не вдалося зберегти. Чи виконано міграцію?",
  badUrl: "Посилання не підійшло: потрібне https-посилання на музичний сервіс. Трек збережено без нього.",
  live: "Зараз грає", recent: "Нещодавно слухав(ла)", privMusic: "Музика", open: "Відкрити трек",
};

const de: Strings = {
  title: "Musik", hint: "Wähle einen Titel, und Freunde sehen ihn in deinem Profil, wie bei Telegram.",
  trackPh: "Titel", artistPh: "Künstler", urlPh: "Link (Spotify, Yandex Music …), optional",
  set: "Im Profil zeigen", clear: "Entfernen", saved: "Musik aktualisiert", failed: "Speichern fehlgeschlagen. Wurde die Migration ausgeführt?",
  badUrl: "Der Link passt nicht: nötig ist ein https-Link zu einem Musikdienst. Der Titel wurde ohne ihn gespeichert.",
  live: "Spielt gerade", recent: "Zuletzt gehört", privMusic: "Musik", open: "Titel öffnen",
};

const fr: Strings = {
  title: "Musique", hint: "Choisis un titre et tes amis le verront sur ton profil, comme dans Telegram.",
  trackPh: "Titre", artistPh: "Artiste", urlPh: "Lien (Spotify, Yandex Music…), facultatif",
  set: "Afficher sur le profil", clear: "Retirer", saved: "Musique mise à jour", failed: "Échec de l'enregistrement. La migration a-t-elle été exécutée ?",
  badUrl: "Le lien ne convient pas : il faut un lien https vers un service de musique. Le titre a été enregistré sans lui.",
  live: "En écoute", recent: "Écouté récemment", privMusic: "Musique", open: "Ouvrir le titre",
};

const es: Strings = {
  title: "Música", hint: "Elige una canción y tus amigos la verán en tu perfil, como en Telegram.",
  trackPh: "Título", artistPh: "Artista", urlPh: "Enlace (Spotify, Yandex Music…), opcional",
  set: "Mostrar en el perfil", clear: "Quitar", saved: "Música actualizada", failed: "No se pudo guardar. ¿Se ejecutó la migración?",
  badUrl: "El enlace no sirve: debe ser un enlace https a un servicio de música. La canción se guardó sin él.",
  live: "Sonando ahora", recent: "Escuchado hace poco", privMusic: "Música", open: "Abrir canción",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type NowPlayingKey = keyof Strings;
export const makeNowPlaying = (lang: Lang) => (k: NowPlayingKey): string => (ALL[lang] ?? en)[k];
