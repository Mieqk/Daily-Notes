import type { Lang } from "./i18n";

/** Автоопределение сна: настройка и утренняя подсказка. */
const ru = {
  title: "Подсказывать время сна", sub: "по паузе в приложении ночью",
  about: "Приложение запоминает на этом устройстве время, когда вы им последний раз пользовались. Если ночью была пауза от 3 часов, утром оно предложит записать её как сон. Время нигде не отправляется, кроме вашей обычной записи сна, когда вы её подтвердите.",
  limit: "Это не датчик сна. Что телефон делал в фоне и в других приложениях, веб-приложение не видит: если вы листали ленту до трёх ночи, засыпание покажется раньше. Поэтому время всегда можно поправить перед сохранением.",
  prompt: "Похоже, вы спали", from: "Уснули", to: "Проснулись", save: "Записать сон", skip: "Это не сон",
  saved: "Сон записан",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Suggest sleep times", sub: "from a night-time pause in the app",
  about: "The app remembers on this device when you last used it. If there was a pause of 3+ hours overnight, it will offer to log it as sleep in the morning. Nothing is sent anywhere except your normal sleep entry once you confirm it.",
  limit: "This is not a sleep sensor. A web app can't see what your phone did in the background or in other apps: if you scrolled a feed until 3 am, bedtime will look earlier. That's why you can always adjust the times before saving.",
  prompt: "It looks like you slept", from: "Fell asleep", to: "Woke up", save: "Log sleep", skip: "Not sleep",
  saved: "Sleep logged",
};

const be: Strings = {
  title: "Падказваць час сну", sub: "па паўзе ў праграме ўначы",
  about: "Праграма запамінае на гэтай прыладзе час, калі вы апошні раз ёю карысталіся. Калі ўначы была паўза ад 3 гадзін, раніцай яна прапануе запісаць яе як сон. Час нікуды не адпраўляецца, акрамя звычайнага запісу сну, калі вы яго пацвердзіце.",
  limit: "Гэта не датчык сну. Што тэлефон рабіў у фоне і ў іншых праграмах, вэб-праграма не бачыць: калі вы лісталі стужку да трэцяй ночы, засынанне здасца раней. Таму час заўсёды можна паправіць перад захаваннем.",
  prompt: "Падобна, вы спалі", from: "Заснулі", to: "Прачнуліся", save: "Запісаць сон", skip: "Гэта не сон",
  saved: "Сон запісаны",
};

const uk: Strings = {
  title: "Підказувати час сну", sub: "за паузою в застосунку вночі",
  about: "Застосунок запам'ятовує на цьому пристрої час, коли ви ним востаннє користувались. Якщо вночі була пауза від 3 годин, вранці він запропонує записати її як сон. Час нікуди не надсилається, окрім вашого звичайного запису сну, коли ви його підтвердите.",
  limit: "Це не датчик сну. Що телефон робив у фоні та в інших застосунках, вебзастосунок не бачить: якщо ви гортали стрічку до третьої ночі, засинання здасться раніше. Тому час завжди можна поправити перед збереженням.",
  prompt: "Схоже, ви спали", from: "Заснули", to: "Прокинулись", save: "Записати сон", skip: "Це не сон",
  saved: "Сон записано",
};

const de: Strings = {
  title: "Schlafzeiten vorschlagen", sub: "anhand einer nächtlichen Pause in der App",
  about: "Die App merkt sich auf diesem Gerät, wann du sie zuletzt benutzt hast. Gab es nachts eine Pause von mindestens 3 Stunden, schlägt sie morgens vor, sie als Schlaf einzutragen. Nichts wird gesendet außer deinem normalen Schlafeintrag, sobald du ihn bestätigst.",
  limit: "Das ist kein Schlafsensor. Eine Web-App sieht nicht, was dein Handy im Hintergrund oder in anderen Apps getan hat: Wenn du bis 3 Uhr gescrollt hast, wirkt die Einschlafzeit zu früh. Deshalb kannst du die Zeiten vor dem Speichern immer anpassen.",
  prompt: "Es sieht aus, als hättest du geschlafen", from: "Eingeschlafen", to: "Aufgewacht", save: "Schlaf eintragen", skip: "Kein Schlaf",
  saved: "Schlaf eingetragen",
};

const fr: Strings = {
  title: "Suggérer les heures de sommeil", sub: "d'après une pause nocturne dans l'appli",
  about: "L'appli retient sur cet appareil la dernière fois que vous l'avez utilisée. S'il y a eu une pause d'au moins 3 heures la nuit, elle propose le matin de l'enregistrer comme sommeil. Rien n'est envoyé, sauf votre fiche de sommeil habituelle une fois confirmée.",
  limit: "Ce n'est pas un capteur de sommeil. Une appli web ne voit pas ce que le téléphone a fait en arrière-plan ou dans d'autres applis : si vous avez fait défiler un fil jusqu'à 3 h, le coucher paraîtra trop tôt. Vous pouvez donc toujours corriger les heures avant d'enregistrer.",
  prompt: "On dirait que vous avez dormi", from: "Endormi à", to: "Réveillé à", save: "Enregistrer le sommeil", skip: "Pas du sommeil",
  saved: "Sommeil enregistré",
};

const es: Strings = {
  title: "Sugerir horas de sueño", sub: "según una pausa nocturna en la app",
  about: "La app recuerda en este dispositivo la última vez que la usaste. Si hubo una pausa de 3 horas o más por la noche, por la mañana te propone guardarla como sueño. No se envía nada salvo tu registro de sueño normal cuando lo confirmes.",
  limit: "No es un sensor de sueño. Una app web no ve lo que hizo el teléfono en segundo plano ni en otras apps: si estuviste desplazando un feed hasta las 3, la hora de dormir parecerá más temprana. Por eso siempre puedes ajustar las horas antes de guardar.",
  prompt: "Parece que dormiste", from: "Te dormiste", to: "Despertaste", save: "Guardar sueño", skip: "No fue sueño",
  saved: "Sueño guardado",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type SleepAutoKey = keyof Strings;
export const makeSleepAuto = (lang: Lang) => (k: SleepAutoKey): string => (ALL[lang] ?? en)[k];
