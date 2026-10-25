import type { Lang } from "./i18n";

/** Строки звонков. */
const ru = {
  voice: "Позвонить", video: "Видеозвонок", offlineHint: "Друга сейчас нет в сети",
  calling: "Вызываем {name}…", incoming: "{name} звонит", incomingVideo: "{name} звонит по видео", connecting: "Соединяем…",
  accept: "Ответить", decline: "Отклонить", hangup: "Завершить", mute: "Выключить микрофон", unmute: "Включить микрофон",
  camOff: "Выключить камеру", camOn: "Включить камеру",
  ended: "Звонок завершён", missed: "{name} не отвечает", declined: "{name} отклонил(а) звонок", busy: "{name} сейчас занят(а)",
  failed: "Не удалось соединиться. Попробуйте ещё раз", noMedia: "Нет доступа к микрофону или камере. Разрешите его в настройках браузера",
  unsupported: "Этот браузер не поддерживает звонки", missedCall: "Пропущенный звонок",
};
type Strings = typeof ru;

const en: Strings = {
  voice: "Call", video: "Video call", offlineHint: "Your friend is offline",
  calling: "Calling {name}…", incoming: "{name} is calling", incomingVideo: "{name} is calling on video", connecting: "Connecting…",
  accept: "Answer", decline: "Decline", hangup: "Hang up", mute: "Mute microphone", unmute: "Unmute microphone",
  camOff: "Turn camera off", camOn: "Turn camera on",
  ended: "Call ended", missed: "{name} isn't answering", declined: "{name} declined the call", busy: "{name} is busy right now",
  failed: "Couldn't connect. Please try again", noMedia: "No access to the microphone or camera. Allow it in your browser settings",
  unsupported: "This browser doesn't support calls", missedCall: "Missed call",
};

const be: Strings = {
  voice: "Патэлефанаваць", video: "Відэазванок", offlineHint: "Сябра зараз няма ў сетцы",
  calling: "Выклікаем {name}…", incoming: "{name} тэлефануе", incomingVideo: "{name} тэлефануе па відэа", connecting: "Злучаем…",
  accept: "Адказаць", decline: "Адхіліць", hangup: "Завяршыць", mute: "Выключыць мікрафон", unmute: "Уключыць мікрафон",
  camOff: "Выключыць камеру", camOn: "Уключыць камеру",
  ended: "Званок завершаны", missed: "{name} не адказвае", declined: "{name} адхіліў(ла) званок", busy: "{name} зараз заняты(а)",
  failed: "Не ўдалося злучыцца. Паспрабуйце яшчэ раз", noMedia: "Няма доступу да мікрафона або камеры. Дазвольце яго ў наладах браўзера",
  unsupported: "Гэты браўзер не падтрымлівае званкі", missedCall: "Прапушчаны званок",
};

const uk: Strings = {
  voice: "Зателефонувати", video: "Відеодзвінок", offlineHint: "Друга зараз немає в мережі",
  calling: "Викликаємо {name}…", incoming: "{name} телефонує", incomingVideo: "{name} телефонує по відео", connecting: "З’єднуємо…",
  accept: "Відповісти", decline: "Відхилити", hangup: "Завершити", mute: "Вимкнути мікрофон", unmute: "Увімкнути мікрофон",
  camOff: "Вимкнути камеру", camOn: "Увімкнути камеру",
  ended: "Дзвінок завершено", missed: "{name} не відповідає", declined: "{name} відхилив(ла) дзвінок", busy: "{name} зараз зайнятий(а)",
  failed: "Не вдалося з’єднатися. Спробуйте ще раз", noMedia: "Немає доступу до мікрофона або камери. Дозвольте його в налаштуваннях браузера",
  unsupported: "Цей браузер не підтримує дзвінки", missedCall: "Пропущений дзвінок",
};

const de: Strings = {
  voice: "Anrufen", video: "Videoanruf", offlineHint: "Dein Freund ist gerade offline",
  calling: "{name} wird angerufen…", incoming: "{name} ruft an", incomingVideo: "{name} ruft per Video an", connecting: "Verbinde…",
  accept: "Annehmen", decline: "Ablehnen", hangup: "Auflegen", mute: "Mikrofon aus", unmute: "Mikrofon an",
  camOff: "Kamera aus", camOn: "Kamera an",
  ended: "Anruf beendet", missed: "{name} antwortet nicht", declined: "{name} hat den Anruf abgelehnt", busy: "{name} ist gerade beschäftigt",
  failed: "Verbindung fehlgeschlagen. Versuche es erneut", noMedia: "Kein Zugriff auf Mikrofon oder Kamera. Erlaube ihn in den Browser-Einstellungen",
  unsupported: "Dieser Browser unterstützt keine Anrufe", missedCall: "Verpasster Anruf",
};

const fr: Strings = {
  voice: "Appeler", video: "Appel vidéo", offlineHint: "Votre ami est hors ligne",
  calling: "Appel de {name}…", incoming: "{name} vous appelle", incomingVideo: "{name} vous appelle en vidéo", connecting: "Connexion…",
  accept: "Répondre", decline: "Refuser", hangup: "Raccrocher", mute: "Couper le micro", unmute: "Réactiver le micro",
  camOff: "Couper la caméra", camOn: "Activer la caméra",
  ended: "Appel terminé", missed: "{name} ne répond pas", declined: "{name} a refusé l'appel", busy: "{name} est occupé(e) en ce moment",
  failed: "Connexion impossible. Réessayez", noMedia: "Pas d'accès au micro ou à la caméra. Autorisez-le dans les réglages du navigateur",
  unsupported: "Ce navigateur ne prend pas en charge les appels", missedCall: "Appel manqué",
};

const es: Strings = {
  voice: "Llamar", video: "Videollamada", offlineHint: "Tu amigo no está en línea",
  calling: "Llamando a {name}…", incoming: "{name} te llama", incomingVideo: "{name} te llama por vídeo", connecting: "Conectando…",
  accept: "Responder", decline: "Rechazar", hangup: "Colgar", mute: "Silenciar micrófono", unmute: "Activar micrófono",
  camOff: "Apagar cámara", camOn: "Encender cámara",
  ended: "Llamada terminada", missed: "{name} no responde", declined: "{name} rechazó la llamada", busy: "{name} está ocupado/a ahora",
  failed: "No se pudo conectar. Inténtalo de nuevo", noMedia: "Sin acceso al micrófono o la cámara. Permítelo en los ajustes del navegador",
  unsupported: "Este navegador no admite llamadas", missedCall: "Llamada perdida",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type CallKey = keyof Strings;
export const makeCall = (lang: Lang) => (k: CallKey): string => (ALL[lang] ?? en)[k];
