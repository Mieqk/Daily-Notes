import type { Lang } from "./i18n";

/** Строки чата с друзьями. */
const ru = {
  open: "Написать", title: "Чат с {name}", placeholder: "Сообщение", send: "Отправить", attach: "Прикрепить фото или видео",
  empty: "Здесь пока тихо. Напишите первым или отправьте фото.", older: "Показать раньше", del: "Удалить", delSure: "Точно удалить?",
  tooBig: "Файл слишком большой: видео можно до {mb} МБ", badType: "Можно отправить только фото или видео",
  failed: "Не получилось отправить. Проверьте соединение и попробуйте ещё раз", loadErr: "Не удалось загрузить переписку",
  today: "Сегодня", yesterday: "Вчера", removeFile: "Убрать вложение", close: "Закрыть", seen: "Прочитано", sent: "Отправлено",
  newMsg: "Новое сообщение", photo: "📷 Фото", video: "🎥 Видео", mediaErr: "Файл не открылся", sending: "Отправка…",
};
type Strings = typeof ru;

const en: Strings = {
  open: "Message", title: "Chat with {name}", placeholder: "Message", send: "Send", attach: "Attach a photo or video",
  empty: "It's quiet here. Write first or send a photo.", older: "Show earlier", del: "Delete", delSure: "Really delete?",
  tooBig: "File is too large: videos up to {mb} MB", badType: "You can only send photos or videos",
  failed: "Couldn't send. Check your connection and try again", loadErr: "Couldn't load the conversation",
  today: "Today", yesterday: "Yesterday", removeFile: "Remove attachment", close: "Close", seen: "Seen", sent: "Sent",
  newMsg: "New message", photo: "📷 Photo", video: "🎥 Video", mediaErr: "Couldn't open the file", sending: "Sending…",
};

const be: Strings = {
  open: "Напісаць", title: "Чат з {name}", placeholder: "Паведамленне", send: "Адправіць", attach: "Далучыць фота або відэа",
  empty: "Тут пакуль ціха. Напішыце першым або адпраўце фота.", older: "Паказаць раней", del: "Выдаліць", delSure: "Дакладна выдаліць?",
  tooBig: "Файл занадта вялікі: відэа можна да {mb} МБ", badType: "Можна адправіць толькі фота або відэа",
  failed: "Не атрымалася адправіць. Праверце злучэнне і паспрабуйце яшчэ раз", loadErr: "Не ўдалося загрузіць перапіску",
  today: "Сёння", yesterday: "Учора", removeFile: "Прыбраць далучэнне", close: "Закрыць", seen: "Прачытана", sent: "Адпраўлена",
  newMsg: "Новае паведамленне", photo: "📷 Фота", video: "🎥 Відэа", mediaErr: "Файл не адкрыўся", sending: "Адпраўка…",
};

const uk: Strings = {
  open: "Написати", title: "Чат з {name}", placeholder: "Повідомлення", send: "Надіслати", attach: "Прикріпити фото або відео",
  empty: "Тут поки тихо. Напишіть першим або надішліть фото.", older: "Показати раніше", del: "Видалити", delSure: "Точно видалити?",
  tooBig: "Файл завеликий: відео можна до {mb} МБ", badType: "Можна надіслати лише фото або відео",
  failed: "Не вдалося надіслати. Перевірте з’єднання та спробуйте ще раз", loadErr: "Не вдалося завантажити листування",
  today: "Сьогодні", yesterday: "Вчора", removeFile: "Прибрати вкладення", close: "Закрити", seen: "Прочитано", sent: "Надіслано",
  newMsg: "Нове повідомлення", photo: "📷 Фото", video: "🎥 Відео", mediaErr: "Файл не відкрився", sending: "Надсилання…",
};

const de: Strings = {
  open: "Schreiben", title: "Chat mit {name}", placeholder: "Nachricht", send: "Senden", attach: "Foto oder Video anhängen",
  empty: "Hier ist es noch still. Schreib zuerst oder schick ein Foto.", older: "Frühere anzeigen", del: "Löschen", delSure: "Wirklich löschen?",
  tooBig: "Datei zu groß: Videos bis {mb} MB", badType: "Es können nur Fotos oder Videos gesendet werden",
  failed: "Senden fehlgeschlagen. Prüfe die Verbindung und versuche es erneut", loadErr: "Der Chat konnte nicht geladen werden",
  today: "Heute", yesterday: "Gestern", removeFile: "Anhang entfernen", close: "Schließen", seen: "Gelesen", sent: "Gesendet",
  newMsg: "Neue Nachricht", photo: "📷 Foto", video: "🎥 Video", mediaErr: "Datei konnte nicht geöffnet werden", sending: "Wird gesendet…",
};

const fr: Strings = {
  open: "Écrire", title: "Discussion avec {name}", placeholder: "Message", send: "Envoyer", attach: "Joindre une photo ou une vidéo",
  empty: "C'est calme ici. Écrivez en premier ou envoyez une photo.", older: "Afficher les précédents", del: "Supprimer", delSure: "Vraiment supprimer ?",
  tooBig: "Fichier trop volumineux : vidéos jusqu'à {mb} Mo", badType: "Seules les photos et les vidéos peuvent être envoyées",
  failed: "Envoi impossible. Vérifiez la connexion et réessayez", loadErr: "Impossible de charger la discussion",
  today: "Aujourd'hui", yesterday: "Hier", removeFile: "Retirer la pièce jointe", close: "Fermer", seen: "Lu", sent: "Envoyé",
  newMsg: "Nouveau message", photo: "📷 Photo", video: "🎥 Vidéo", mediaErr: "Impossible d'ouvrir le fichier", sending: "Envoi…",
};

const es: Strings = {
  open: "Escribir", title: "Chat con {name}", placeholder: "Mensaje", send: "Enviar", attach: "Adjuntar foto o vídeo",
  empty: "Aquí todo está tranquilo. Escribe primero o envía una foto.", older: "Mostrar anteriores", del: "Eliminar", delSure: "¿Eliminar de verdad?",
  tooBig: "Archivo demasiado grande: vídeos de hasta {mb} MB", badType: "Solo se pueden enviar fotos o vídeos",
  failed: "No se pudo enviar. Revisa la conexión e inténtalo de nuevo", loadErr: "No se pudo cargar la conversación",
  today: "Hoy", yesterday: "Ayer", removeFile: "Quitar adjunto", close: "Cerrar", seen: "Leído", sent: "Enviado",
  newMsg: "Mensaje nuevo", photo: "📷 Foto", video: "🎥 Vídeo", mediaErr: "No se pudo abrir el archivo", sending: "Enviando…",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type ChatKey = keyof Strings;
export const makeChat = (lang: Lang) => (k: ChatKey): string => (ALL[lang] ?? en)[k];
