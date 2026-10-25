import type { Lang } from "./i18n";

/** Строки статуса «в сети». */
const ru = {
  title: "Мой статус в сети", hint: "Друзья видят, когда вы в сети. В режиме «Невидимка» они всегда видят «не в сети».",
  auto: "В сети", away: "Не активен", dnd: "Не беспокоить", hidden: "Невидимка",
  dndNote: "В режиме «Не беспокоить» уведомления от друзей молчат.",
  online: "В сети", offline: "Не в сети", seen: "Был(а) в сети {t}", failed: "Не удалось сохранить статус. Выполнена ли миграция?",
};
type Strings = typeof ru;

const en: Strings = {
  title: "My online status", hint: "Friends can see when you're online. In Invisible mode they always see \"offline\".",
  auto: "Online", away: "Away", dnd: "Do not disturb", hidden: "Invisible",
  dndNote: "In Do not disturb mode, notifications from friends are muted.",
  online: "Online", offline: "Offline", seen: "Last seen {t}", failed: "Couldn't save the status. Has the migration been run?",
};

const be: Strings = {
  title: "Мой статус у сетцы", hint: "Сябры бачаць, калі вы ў сетцы. У рэжыме «Нябачны» яны заўсёды бачаць «не ў сетцы».",
  auto: "У сетцы", away: "Не актыўны", dnd: "Не турбаваць", hidden: "Нябачны",
  dndNote: "У рэжыме «Не турбаваць» апавяшчэнні ад сяброў маўчаць.",
  online: "У сетцы", offline: "Не ў сетцы", seen: "Быў(ла) у сетцы {t}", failed: "Не ўдалося захаваць статус. Ці выкананая міграцыя?",
};

const uk: Strings = {
  title: "Мій статус у мережі", hint: "Друзі бачать, коли ви в мережі. У режимі «Невидимка» вони завжди бачать «не в мережі».",
  auto: "У мережі", away: "Не активний", dnd: "Не турбувати", hidden: "Невидимка",
  dndNote: "У режимі «Не турбувати» сповіщення від друзів мовчать.",
  online: "У мережі", offline: "Не в мережі", seen: "Був(ла) у мережі {t}", failed: "Не вдалося зберегти статус. Чи виконано міграцію?",
};

const de: Strings = {
  title: "Mein Online-Status", hint: "Freunde sehen, wann du online bist. Im Modus „Unsichtbar“ sehen sie immer „offline“.",
  auto: "Online", away: "Abwesend", dnd: "Nicht stören", hidden: "Unsichtbar",
  dndNote: "Im Modus „Nicht stören“ sind Benachrichtigungen von Freunden stumm.",
  online: "Online", offline: "Offline", seen: "Zuletzt online {t}", failed: "Status konnte nicht gespeichert werden. Wurde die Migration ausgeführt?",
};

const fr: Strings = {
  title: "Mon statut en ligne", hint: "Vos amis voient quand vous êtes en ligne. En mode Invisible, ils voient toujours « hors ligne ».",
  auto: "En ligne", away: "Absent", dnd: "Ne pas déranger", hidden: "Invisible",
  dndNote: "En mode Ne pas déranger, les notifications des amis sont muettes.",
  online: "En ligne", offline: "Hors ligne", seen: "Vu {t}", failed: "Impossible d'enregistrer le statut. La migration a-t-elle été exécutée ?",
};

const es: Strings = {
  title: "Mi estado en línea", hint: "Tus amigos ven cuándo estás en línea. En modo Invisible siempre ven «desconectado».",
  auto: "En línea", away: "Ausente", dnd: "No molestar", hidden: "Invisible",
  dndNote: "En modo No molestar, las notificaciones de los amigos se silencian.",
  online: "En línea", offline: "Desconectado", seen: "Visto {t}", failed: "No se pudo guardar el estado. ¿Se ejecutó la migración?",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type PresenceKey = keyof Strings;
export const makePresence = (lang: Lang) => (k: PresenceKey): string => (ALL[lang] ?? en)[k];
