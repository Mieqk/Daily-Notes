import type { Lang } from "./i18n";

/** Строки быстрых напоминаний. */
const ru = {
  title: "Быстрое напоминание", ph: "Что напомнить? Например: завтра в 9 купить хлеб",
  hint: "Время можно написать прямо в тексте: «через 20 минут», «в 18:30», «завтра утром». Или нажмите кнопку.",
  add: "Напомнить", m15: "Через 15 мин", h1: "Через час", evening: "Вечером", tomorrow: "Завтра утром", custom: "Своё время", customPast: "Это время уже прошло",
  willAt: "Напомню {when}", defaultNote: "время не указано, поставлю через час",
  today: "сегодня", tmrw: "завтра", atTime: "в {time}",
  saved: "Напомню {when}", empty: "Сначала напишите, что напомнить", limit: "Можно до {n} напоминаний",
  delete: "Удалить", done: "Сработало", fired: "Напоминание",
  note: "Напоминания хранятся на этом устройстве. Если вы вошли в аккаунт и разрешили уведомления, текст и время отправляются на сервер, и напоминание приходит пушем, даже когда приложение закрыто (с точностью до пяти минут). Без входа оно сработает, пока приложение открыто или свёрнуто, а закрытое покажет его при следующем открытии.",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Quick reminder", ph: "What to remind? For example: tomorrow at 9 buy bread",
  hint: "You can write the time right in the text: “in 20 minutes”, “at 6:30pm”, “tomorrow morning”. Or tap a button.",
  add: "Remind me", m15: "In 15 min", h1: "In 1 hour", evening: "This evening", tomorrow: "Tomorrow morning", custom: "Custom time", customPast: "That time has already passed",
  willAt: "I'll remind you {when}", defaultNote: "no time given, I'll use 1 hour from now",
  today: "today", tmrw: "tomorrow", atTime: "at {time}",
  saved: "I'll remind you {when}", empty: "First write what to remind", limit: "Up to {n} reminders",
  delete: "Delete", done: "Done", fired: "Reminder",
  note: "Reminders are stored on this device. If you are signed in and have allowed notifications, the text and time are sent to the server and the reminder arrives as a push even when the app is closed (accurate to about five minutes). Without signing in it fires while the app is open or minimised, and a closed app shows it the next time you open it.",
};

const be: Strings = {
  title: "Хуткі напамін", ph: "Што нагадаць? Напрыклад: заўтра ў 9 купіць хлеб",
  hint: "Час можна напісаць проста ў тэксце: «праз 20 хвілін», «у 18:30», «заўтра раніцай». Або націсніце кнопку.",
  add: "Нагадаць", m15: "Праз 15 хв", h1: "Праз гадзіну", evening: "Увечары", tomorrow: "Заўтра раніцай", custom: "Свой час", customPast: "Гэты час ужо прайшоў",
  willAt: "Нагадаю {when}", defaultNote: "час не пазначаны, пастаўлю праз гадзіну",
  today: "сёння", tmrw: "заўтра", atTime: "у {time}",
  saved: "Нагадаю {when}", empty: "Спачатку напішыце, што нагадаць", limit: "Можна да {n} напамінкаў",
  delete: "Выдаліць", done: "Спрацавала", fired: "Напамін",
  note: "Напаміны захоўваюцца на гэтай прыладзе. Калі вы ўвайшлі ў акаунт і дазволілі апавяшчэнні, тэкст і час адпраўляюцца на сервер, і напамінак прыходзіць пушам, нават калі праграма закрытая (з дакладнасцю да пяці хвілін). Без уваходу ён спрацуе, пакуль праграма адкрытая або згорнутая, а закрытая пакажа яго пры наступным адкрыцці.",
};

const uk: Strings = {
  title: "Швидке нагадування", ph: "Що нагадати? Наприклад: завтра о 9 купити хліб",
  hint: "Час можна написати прямо в тексті: «через 20 хвилин», «о 18:30», «завтра зранку». Або натисніть кнопку.",
  add: "Нагадати", m15: "Через 15 хв", h1: "Через годину", evening: "Увечері", tomorrow: "Завтра зранку", custom: "Свій час", customPast: "Цей час уже минув",
  willAt: "Нагадаю {when}", defaultNote: "час не вказано, поставлю через годину",
  today: "сьогодні", tmrw: "завтра", atTime: "о {time}",
  saved: "Нагадаю {when}", empty: "Спочатку напишіть, що нагадати", limit: "Можна до {n} нагадувань",
  delete: "Видалити", done: "Спрацювало", fired: "Нагадування",
  note: "Нагадування зберігаються на цьому пристрої. Якщо ви увійшли в акаунт і дозволили сповіщення, текст і час надсилаються на сервер, і нагадування приходить пушем, навіть коли застосунок закритий (з точністю до п’яти хвилин). Без входу воно спрацює, поки застосунок відкритий або згорнутий, а закритий покаже його під час наступного відкриття.",
};

const de: Strings = {
  title: "Schnelle Erinnerung", ph: "Woran erinnern? Zum Beispiel: morgen um 9 Brot kaufen",
  hint: "Die Zeit kannst du direkt in den Text schreiben: „in 20 Minuten“, „um 18:30“, „morgen früh“. Oder tippe auf eine Taste.",
  add: "Erinnern", m15: "In 15 Min.", h1: "In 1 Stunde", evening: "Heute Abend", tomorrow: "Morgen früh", custom: "Eigene Zeit", customPast: "Diese Zeit ist schon vorbei",
  willAt: "Ich erinnere dich {when}", defaultNote: "keine Zeit angegeben, ich nehme in 1 Stunde",
  today: "heute", tmrw: "morgen", atTime: "um {time}",
  saved: "Ich erinnere dich {when}", empty: "Schreibe zuerst, woran erinnert werden soll", limit: "Bis zu {n} Erinnerungen",
  delete: "Löschen", done: "Erledigt", fired: "Erinnerung",
  note: "Erinnerungen werden auf diesem Gerät gespeichert. Bist du angemeldet und hast Benachrichtigungen erlaubt, werden Text und Zeit an den Server gesendet, und die Erinnerung kommt als Push, auch wenn die App geschlossen ist (auf etwa fünf Minuten genau). Ohne Anmeldung greift sie, solange die App offen oder minimiert ist, sonst beim nächsten Öffnen.",
};

const fr: Strings = {
  title: "Rappel rapide", ph: "Quoi rappeler ? Par exemple : demain à 9h acheter du pain",
  hint: "Tu peux écrire l’heure directement dans le texte : « dans 20 minutes », « à 18h30 », « demain matin ». Ou touche un bouton.",
  add: "Me rappeler", m15: "Dans 15 min", h1: "Dans 1 heure", evening: "Ce soir", tomorrow: "Demain matin", custom: "Autre heure", customPast: "Cette heure est déjà passée",
  willAt: "Je te rappellerai {when}", defaultNote: "pas d’heure indiquée, je mets dans 1 heure",
  today: "aujourd’hui", tmrw: "demain", atTime: "à {time}",
  saved: "Je te rappellerai {when}", empty: "Écris d’abord quoi rappeler", limit: "Jusqu’à {n} rappels",
  delete: "Supprimer", done: "Fait", fired: "Rappel",
  note: "Les rappels sont stockés sur cet appareil. Si tu es connecté et as autorisé les notifications, le texte et l’heure sont envoyés au serveur et le rappel arrive en push même quand l’appli est fermée (à cinq minutes près). Sans connexion, il se déclenche tant que l’appli est ouverte ou réduite, sinon à la prochaine ouverture.",
};

const es: Strings = {
  title: "Recordatorio rápido", ph: "¿Qué recordar? Por ejemplo: mañana a las 9 comprar pan",
  hint: "Puedes escribir la hora en el propio texto: «en 20 minutos», «a las 18:30», «mañana por la mañana». O toca un botón.",
  add: "Recordar", m15: "En 15 min", h1: "En 1 hora", evening: "Esta noche", tomorrow: "Mañana temprano", custom: "Otra hora", customPast: "Esa hora ya pasó",
  willAt: "Te lo recordaré {when}", defaultNote: "sin hora indicada, lo pongo en 1 hora",
  today: "hoy", tmrw: "mañana", atTime: "a las {time}",
  saved: "Te lo recordaré {when}", empty: "Primero escribe qué recordar", limit: "Hasta {n} recordatorios",
  delete: "Eliminar", done: "Hecho", fired: "Recordatorio",
  note: "Los recordatorios se guardan en este dispositivo. Si has iniciado sesión y permitido las notificaciones, el texto y la hora se envían al servidor y el recordatorio llega como push aunque la app esté cerrada (con precisión de unos cinco minutos). Sin iniciar sesión, salta mientras la app está abierta o minimizada, o la próxima vez que la abras.",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type QuickKey = keyof Strings;
export const makeQuick = (lang: Lang) => {
  const f = (k: QuickKey, vars?: Record<string, string | number>): string => {
    let s = (ALL[lang] ?? en)[k];
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.split(`{${a}}`).join(String(b));
    return s;
  };
  f.all = ALL[lang] ?? en;
  return f;
};

/** «сегодня в 18:30», «завтра в 9:00», «3 ноября в 9:00». */
export function whenLabel(lang: Lang, at: number, now: number): string {
  const q = makeQuick(lang);
  const d = new Date(at);
  const n = new Date(now);
  const day0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(d) - day0(n)) / 86_400_000);
  const time = d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  const clock = q("atTime", { time });
  if (diff === 0) return `${q("today")} ${clock}`;
  if (diff === 1) return `${q("tmrw")} ${clock}`;
  return `${d.toLocaleDateString(lang, { day: "numeric", month: "long" })} ${clock}`;
}
