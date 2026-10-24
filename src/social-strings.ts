import type { Lang } from "./i18n";

/** Строки общих воспоминаний, парных привычек, челленджей и уведомлений. Остальные языки показывают английский. */
const ru = {
  memTitle: "Общие воспоминания", memEmpty: "Пока нет общих воспоминаний. Запишите момент, который хочется сохранить с другом.",
  memAdd: "Добавить воспоминание", memWith: "С кем", memText: "Что запомнилось?", memTag: "Тег (по желанию)", memAll: "Все",
  memSave: "Сохранить", memYouWith: "Вы и {name}", memDelete: "Удалить", memNoFriends: "Добавьте друга, чтобы делиться воспоминаниями",
  buddyTitle: "Парные привычки", buddyEmpty: "Выберите привычку и друга: серия растёт, только когда отметились оба.",
  buddyAdd: "Новая парная привычка", buddyPh: "Например: 10 минут прогулки", buddyStart: "Начать", buddyWith: "С {name}",
  buddyDone: "Отметиться сегодня", buddyChecked: "Вы отметились", buddyWaiting: "Ждём {name}", buddyBoth: "Оба отметились сегодня",
  buddyStreak: "Серия вместе: {n}", buddyLeave: "Закончить", buddyConfirm: "Точно закончить?",
  chTitle: "Челленджи", chEmpty: "Создайте цель на несколько дней и позовите друзей.", chAdd: "Новый челлендж",
  chPh: "Название (например, Без сахара)", chDays: "Дней", chInvite: "Кого позвать", chStart: "Создать",
  chToday: "Отметиться сегодня", chCheckedToday: "Отмечено на сегодня", chProgress: "Общий прогресс: {n}%",
  chDay: "День {n} из {total}", chFinished: "Челлендж завершён", chMembers: "Участники", chLeave: "Выйти", chDelete: "Удалить",
  chConfirm: "Точно?", chNeedFriend: "Выберите хотя бы одного друга",
  loading: "Загрузка…", error: "Не получилось, попробуйте ещё раз",
  ntTitle: "Уведомления", ntSub: "Напоминание о записи и вести от друзей",
  ntEnable: "Включить уведомления", ntOn: "Уведомления включены", ntDenied: "Уведомления запрещены в настройках браузера",
  ntUnsupported: "Этот браузер не поддерживает уведомления", ntTest: "Проверить",
  ntReminder: "Пора заглянуть в дневник", ntReminderBody: "Как прошёл день? Запишите пару строк.",
  ntThanks: "Вам сказали спасибо", ntSos: "Друг просит поддержки", ntFriends: "Сообщения от друзей",
  ntNote: "Войдите в аккаунт, чтобы получать уведомления и при закрытом приложении; без входа они работают, пока вкладка или PWA открыты.",
  ntNotePush: "Уведомления приходят и при закрытом приложении. Отключить их можно в настройках браузера или устройства.",
};
type Strings = typeof ru;

const en: Strings = {
  memTitle: "Shared memories", memEmpty: "No shared memories yet. Write down a moment you want to keep with a friend.",
  memAdd: "Add a memory", memWith: "With", memText: "What do you remember?", memTag: "Tag (optional)", memAll: "All",
  memSave: "Save", memYouWith: "You and {name}", memDelete: "Delete", memNoFriends: "Add a friend to share memories",
  buddyTitle: "Buddy habits", buddyEmpty: "Pick a habit and a friend: the streak only grows when both check in.",
  buddyAdd: "New buddy habit", buddyPh: "E.g. a 10-minute walk", buddyStart: "Start", buddyWith: "With {name}",
  buddyDone: "Check in today", buddyChecked: "You checked in", buddyWaiting: "Waiting for {name}", buddyBoth: "Both checked in today",
  buddyStreak: "Streak together: {n}", buddyLeave: "End", buddyConfirm: "Really end it?",
  chTitle: "Challenges", chEmpty: "Create a goal for a few days and invite friends.", chAdd: "New challenge",
  chPh: "Name (e.g. No sugar)", chDays: "Days", chInvite: "Invite", chStart: "Create",
  chToday: "Check in today", chCheckedToday: "Checked in for today", chProgress: "Group progress: {n}%",
  chDay: "Day {n} of {total}", chFinished: "Challenge finished", chMembers: "Members", chLeave: "Leave", chDelete: "Delete",
  chConfirm: "Sure?", chNeedFriend: "Pick at least one friend",
  loading: "Loading…", error: "Something went wrong, please try again",
  ntTitle: "Notifications", ntSub: "Entry reminder and news from friends",
  ntEnable: "Enable notifications", ntOn: "Notifications are on", ntDenied: "Notifications are blocked in browser settings",
  ntUnsupported: "This browser does not support notifications", ntTest: "Test",
  ntReminder: "Time to open your diary", ntReminderBody: "How was your day? Write a few lines.",
  ntThanks: "Someone thanked you", ntSos: "A friend asks for support", ntFriends: "Messages from friends",
  ntNote: "Sign in to get notifications while the app is closed; without an account they work only while the tab or PWA is open.",
  ntNotePush: "Notifications also arrive while the app is closed. You can turn them off in your browser or device settings.",
};

const ALL: Partial<Record<Lang, Strings>> = { ru, en };

export type SocialKey = keyof Strings;
export const makeSocial = (lang: Lang) => (k: SocialKey): string => (ALL[lang] ?? en)[k];
