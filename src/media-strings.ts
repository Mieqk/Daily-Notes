import type { Lang } from "./i18n";

/** Строки вложений (фото, видео, голос) в парных разделах и чате. */
const ru = {
  attach: "Прикрепить фото, видео или аудио", record: "Записать голос", stop: "Остановить запись", recording: "Идёт запись…",
  remove: "Убрать вложение", tooBigVideo: "Видео слишком большое: до {mb} МБ", tooBigAudio: "Аудио слишком большое: до {mb} МБ",
  tooBigPhoto: "Фото слишком большое", badType: "Можно прикрепить только фото, видео или аудио (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "Нет доступа к микрофону. Разрешите его в настройках браузера", noRec: "Этот браузер не умеет записывать голос",
  uploadFail: "Не удалось загрузить файл. Проверьте соединение и попробуйте ещё раз", proof: "Подтверждение", voice: "🎤 Голосовое сообщение",
};
type Strings = typeof ru;

const en: Strings = {
  attach: "Attach a photo, video or audio", record: "Record a voice note", stop: "Stop recording", recording: "Recording…",
  remove: "Remove attachment", tooBigVideo: "Video is too large: up to {mb} MB", tooBigAudio: "Audio is too large: up to {mb} MB",
  tooBigPhoto: "Photo is too large", badType: "You can only attach photos, videos or audio (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "No microphone access. Allow it in your browser settings", noRec: "This browser can't record voice",
  uploadFail: "Couldn't upload the file. Check your connection and try again", proof: "Proof", voice: "🎤 Voice message",
};

const be: Strings = {
  attach: "Далучыць фота, відэа або аўдыё", record: "Запісаць голас", stop: "Спыніць запіс", recording: "Ідзе запіс…",
  remove: "Прыбраць далучэнне", tooBigVideo: "Відэа занадта вялікае: да {mb} МБ", tooBigAudio: "Аўдыё занадта вялікае: да {mb} МБ",
  tooBigPhoto: "Фота занадта вялікае", badType: "Можна далучыць толькі фота, відэа або аўдыё (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "Няма доступу да мікрафона. Дазвольце яго ў наладах браўзера", noRec: "Гэты браўзер не ўмее запісваць голас",
  uploadFail: "Не ўдалося загрузіць файл. Праверце злучэнне і паспрабуйце яшчэ раз", proof: "Пацвярджэнне", voice: "🎤 Галасавое паведамленне",
};

const uk: Strings = {
  attach: "Прикріпити фото, відео або аудіо", record: "Записати голос", stop: "Зупинити запис", recording: "Триває запис…",
  remove: "Прибрати вкладення", tooBigVideo: "Відео завелике: до {mb} МБ", tooBigAudio: "Аудіо завелике: до {mb} МБ",
  tooBigPhoto: "Фото завелике", badType: "Можна прикріпити лише фото, відео або аудіо (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "Немає доступу до мікрофона. Дозвольте його в налаштуваннях браузера", noRec: "Цей браузер не вміє записувати голос",
  uploadFail: "Не вдалося завантажити файл. Перевірте з’єднання та спробуйте ще раз", proof: "Підтвердження", voice: "🎤 Голосове повідомлення",
};

const de: Strings = {
  attach: "Foto, Video oder Audio anhängen", record: "Sprachnachricht aufnehmen", stop: "Aufnahme beenden", recording: "Aufnahme läuft…",
  remove: "Anhang entfernen", tooBigVideo: "Video zu groß: bis {mb} MB", tooBigAudio: "Audio zu groß: bis {mb} MB",
  tooBigPhoto: "Foto zu groß", badType: "Es können nur Fotos, Videos oder Audio angehängt werden (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "Kein Zugriff auf das Mikrofon. Erlaube ihn in den Browser-Einstellungen", noRec: "Dieser Browser kann keine Sprache aufnehmen",
  uploadFail: "Datei konnte nicht hochgeladen werden. Prüfe die Verbindung und versuche es erneut", proof: "Nachweis", voice: "🎤 Sprachnachricht",
};

const fr: Strings = {
  attach: "Joindre une photo, une vidéo ou un audio", record: "Enregistrer un message vocal", stop: "Arrêter l'enregistrement", recording: "Enregistrement…",
  remove: "Retirer la pièce jointe", tooBigVideo: "Vidéo trop volumineuse : jusqu'à {mb} Mo", tooBigAudio: "Audio trop volumineux : jusqu'à {mb} Mo",
  tooBigPhoto: "Photo trop volumineuse", badType: "Seuls les photos, vidéos ou audios peuvent être joints (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "Pas d'accès au micro. Autorisez-le dans les réglages du navigateur", noRec: "Ce navigateur ne peut pas enregistrer la voix",
  uploadFail: "Impossible d'envoyer le fichier. Vérifiez la connexion et réessayez", proof: "Preuve", voice: "🎤 Message vocal",
};

const es: Strings = {
  attach: "Adjuntar foto, vídeo o audio", record: "Grabar nota de voz", stop: "Detener grabación", recording: "Grabando…",
  remove: "Quitar adjunto", tooBigVideo: "Vídeo demasiado grande: hasta {mb} MB", tooBigAudio: "Audio demasiado grande: hasta {mb} MB",
  tooBigPhoto: "Foto demasiado grande", badType: "Solo se pueden adjuntar fotos, vídeos o audio (mp4, webm, mov, mp3, m4a, ogg, wav)",
  mic: "Sin acceso al micrófono. Permítelo en los ajustes del navegador", noRec: "Este navegador no puede grabar voz",
  uploadFail: "No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo", proof: "Prueba", voice: "🎤 Mensaje de voz",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type MediaKey = keyof Strings;
export const makeMedia = (lang: Lang) => (k: MediaKey): string => (ALL[lang] ?? en)[k];
