import type { Lang } from "./i18n";

/** Строки синхронизации с Google Календарём. */
const ru = {
  gcTitle: "Google Календарь", gcSub: "Задачи на ближайшие дни появляются в календаре как события на весь день",
  gcConnect: "Подключить", gcDisconnect: "Отключить", gcSyncNow: "Синхронизировать", gcSyncing: "Синхронизация…",
  gcConnected: "Подключено: {email}", gcConnectedNoMail: "Подключено", gcLast: "Последняя синхронизация: {time}", gcNever: "ещё не было",
  gcNeedLogin: "Войдите в аккаунт, чтобы подключить календарь",
  gcNote: "Синхронизация односторонняя: приложение отправляет задачи с датами от недели назад до четырёх месяцев вперёд. Выполненные получают отметку ✓, удалённые пропадают из календаря. При отключении уже созданные события остаются.",
  gcToastOk: "Календарь подключён", gcToastDenied: "Доступ к календарю не выдан", gcToastErr: "Не удалось подключить календарь",
  gcToastSynced: "Календарь обновлён", gcToastSyncErr: "Не удалось обновить календарь", gcToastOff: "Календарь отключён", gcUnavailable: "Не удалось связаться с сервером. Календарь пока недоступен.",
};
type Strings = typeof ru;

const en: Strings = {
  gcTitle: "Google Calendar", gcSub: "Tasks for the coming days show up in your calendar as all-day events",
  gcConnect: "Connect", gcDisconnect: "Disconnect", gcSyncNow: "Sync now", gcSyncing: "Syncing…",
  gcConnected: "Connected: {email}", gcConnectedNoMail: "Connected", gcLast: "Last sync: {time}", gcNever: "not yet",
  gcNeedLogin: "Sign in to connect your calendar",
  gcNote: "Sync is one-way: the app sends tasks dated from a week ago to four months ahead. Completed ones get a ✓, deleted ones disappear from the calendar. Events already created stay if you disconnect.",
  gcToastOk: "Calendar connected", gcToastDenied: "Calendar access was not granted", gcToastErr: "Could not connect the calendar",
  gcToastSynced: "Calendar updated", gcToastSyncErr: "Could not update the calendar", gcToastOff: "Calendar disconnected", gcUnavailable: "Could not reach the server. The calendar is unavailable for now.",
};

const be: Strings = {
  gcTitle: "Google Каляндар", gcSub: "Задачы на бліжэйшыя дні з’яўляюцца ў календары як падзеі на ўвесь дзень",
  gcConnect: "Падключыць", gcDisconnect: "Адключыць", gcSyncNow: "Сінхранізаваць", gcSyncing: "Сінхранізацыя…",
  gcConnected: "Падключана: {email}", gcConnectedNoMail: "Падключана", gcLast: "Апошняя сінхранізацыя: {time}", gcNever: "яшчэ не было",
  gcNeedLogin: "Увайдзіце ў акаўнт, каб падключыць каляндар",
  gcNote: "Сінхранізацыя аднабаковая: праграма адпраўляе задачы з датамі ад тыдня таму да чатырох месяцаў наперад. Выкананыя атрымліваюць адзнаку ✓, выдаленыя знікаюць з календара. Пры адключэнні створаныя падзеі застаюцца.",
  gcToastOk: "Каляндар падключаны", gcToastDenied: "Доступ да календара не дадзены", gcToastErr: "Не атрымалася падключыць каляндар",
  gcToastSynced: "Каляндар абноўлены", gcToastSyncErr: "Не атрымалася абнавіць каляндар", gcToastOff: "Каляндар адключаны", gcUnavailable: "Не атрымалася звязацца з серверам. Каляндар пакуль недаступны.",
};

const uk: Strings = {
  gcTitle: "Google Календар", gcSub: "Завдання на найближчі дні з’являються в календарі як події на весь день",
  gcConnect: "Підключити", gcDisconnect: "Відключити", gcSyncNow: "Синхронізувати", gcSyncing: "Синхронізація…",
  gcConnected: "Підключено: {email}", gcConnectedNoMail: "Підключено", gcLast: "Остання синхронізація: {time}", gcNever: "ще не було",
  gcNeedLogin: "Увійдіть в обліковий запис, щоб підключити календар",
  gcNote: "Синхронізація одностороння: застосунок надсилає завдання з датами від тижня тому до чотирьох місяців уперед. Виконані отримують позначку ✓, видалені зникають з календаря. Після відключення створені події залишаються.",
  gcToastOk: "Календар підключено", gcToastDenied: "Доступ до календаря не надано", gcToastErr: "Не вдалося підключити календар",
  gcToastSynced: "Календар оновлено", gcToastSyncErr: "Не вдалося оновити календар", gcToastOff: "Календар відключено", gcUnavailable: "Не вдалося зв’язатися із сервером. Календар поки недоступний.",
};

const de: Strings = {
  gcTitle: "Google Kalender", gcSub: "Aufgaben der nächsten Tage erscheinen im Kalender als ganztägige Termine",
  gcConnect: "Verbinden", gcDisconnect: "Trennen", gcSyncNow: "Jetzt synchronisieren", gcSyncing: "Synchronisiere…",
  gcConnected: "Verbunden: {email}", gcConnectedNoMail: "Verbunden", gcLast: "Letzte Synchronisierung: {time}", gcNever: "noch nie",
  gcNeedLogin: "Melde dich an, um den Kalender zu verbinden",
  gcNote: "Die Synchronisierung läuft nur in eine Richtung: Die App sendet Aufgaben von vor einer Woche bis vier Monate voraus. Erledigte bekommen ein ✓, gelöschte verschwinden aus dem Kalender. Beim Trennen bleiben bereits angelegte Termine bestehen.",
  gcToastOk: "Kalender verbunden", gcToastDenied: "Kalenderzugriff wurde nicht erteilt", gcToastErr: "Kalender konnte nicht verbunden werden",
  gcToastSynced: "Kalender aktualisiert", gcToastSyncErr: "Kalender konnte nicht aktualisiert werden", gcToastOff: "Kalender getrennt", gcUnavailable: "Server nicht erreichbar. Der Kalender ist vorerst nicht verfügbar.",
};

const fr: Strings = {
  gcTitle: "Google Agenda", gcSub: "Les tâches des prochains jours apparaissent dans l’agenda comme des événements sur la journée",
  gcConnect: "Connecter", gcDisconnect: "Déconnecter", gcSyncNow: "Synchroniser", gcSyncing: "Synchronisation…",
  gcConnected: "Connecté : {email}", gcConnectedNoMail: "Connecté", gcLast: "Dernière synchronisation : {time}", gcNever: "jamais",
  gcNeedLogin: "Connecte-toi pour relier ton agenda",
  gcNote: "La synchronisation est à sens unique : l’application envoie les tâches datées de la semaine dernière à quatre mois à venir. Les tâches terminées reçoivent un ✓, les supprimées disparaissent de l’agenda. À la déconnexion, les événements déjà créés restent.",
  gcToastOk: "Agenda connecté", gcToastDenied: "L’accès à l’agenda n’a pas été accordé", gcToastErr: "Impossible de connecter l’agenda",
  gcToastSynced: "Agenda mis à jour", gcToastSyncErr: "Impossible de mettre à jour l’agenda", gcToastOff: "Agenda déconnecté", gcUnavailable: "Serveur injoignable. L’agenda est indisponible pour le moment.",
};

const es: Strings = {
  gcTitle: "Google Calendar", gcSub: "Las tareas de los próximos días aparecen en el calendario como eventos de todo el día",
  gcConnect: "Conectar", gcDisconnect: "Desconectar", gcSyncNow: "Sincronizar ahora", gcSyncing: "Sincronizando…",
  gcConnected: "Conectado: {email}", gcConnectedNoMail: "Conectado", gcLast: "Última sincronización: {time}", gcNever: "todavía no",
  gcNeedLogin: "Inicia sesión para conectar el calendario",
  gcNote: "La sincronización es unidireccional: la app envía las tareas con fecha desde hace una semana hasta cuatro meses adelante. Las completadas llevan ✓ y las eliminadas desaparecen del calendario. Al desconectar, los eventos ya creados se quedan.",
  gcToastOk: "Calendario conectado", gcToastDenied: "No se concedió acceso al calendario", gcToastErr: "No se pudo conectar el calendario",
  gcToastSynced: "Calendario actualizado", gcToastSyncErr: "No se pudo actualizar el calendario", gcToastOff: "Calendario desconectado", gcUnavailable: "No se pudo contactar con el servidor. El calendario no está disponible por ahora.",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type GcalKey = keyof Strings;
export const makeGcal = (lang: Lang) => (k: GcalKey): string => (ALL[lang] ?? en)[k];
