import type { Lang } from "./i18n";

/** Строки карточки «Расстояние» пары. */
const ru = {
  title: "Расстояние", hint: "Видно только вам двоим и только если включили оба. Партнёр не видит ваших координат, только километры, округлённые до 5.",
  off: "Сейчас вы не делитесь расстоянием", on: "Вы делитесь расстоянием", enable: "Делиться расстоянием", disable: "Выключить", refresh: "Обновить",
  between: "Между вами примерно {km}", together: "Вы рядом", waiting: "Ждём, когда {name} тоже включит", askingPlace: "Определяем место…",
  denied: "Нет доступа к геолокации. Разрешите её для сайта в настройках браузера.", unsupported: "Это устройство не умеет определять место",
  err: "Не получилось, попробуйте ещё раз", privacy: "В базе хранится место с точностью около 11 км, видите его только вы. Выключение удаляет его.",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Distance", hint: "Only the two of you see it, and only if you both turn it on. Your partner never sees your coordinates, just kilometres rounded to 5.",
  off: "You are not sharing distance", on: "You are sharing distance", enable: "Share distance", disable: "Turn off", refresh: "Refresh",
  between: "About {km} between you", together: "You are close by", waiting: "Waiting for {name} to turn it on too", askingPlace: "Finding your location…",
  denied: "No access to location. Allow it for this site in your browser settings.", unsupported: "This device cannot find its location",
  err: "Something went wrong, try again", privacy: "Your place is stored to about 11 km, and only you can see it. Turning off deletes it.",
};

const be: Strings = {
  title: "Адлегласць", hint: "Бачыце толькі вы ўдваіх і толькі калі ўключылі абодва. Партнёр не бачыць вашых каардынатаў, толькі кіламетры, акруглёныя да 5.",
  off: "Цяпер вы не дзеліцеся адлегласцю", on: "Вы дзеліцеся адлегласцю", enable: "Дзяліцца адлегласцю", disable: "Выключыць", refresh: "Абнавіць",
  between: "Паміж вамі прыкладна {km}", together: "Вы побач", waiting: "Чакаем, калі {name} таксама ўключыць", askingPlace: "Вызначаем месца…",
  denied: "Няма доступу да геалакацыі. Дазвольце яе для сайта ў наладах браўзера.", unsupported: "Гэта прылада не ўмее вызначаць месца",
  err: "Не атрымалася, паспрабуйце яшчэ раз", privacy: "У базе захоўваецца месца з дакладнасцю каля 11 км, бачыце яго толькі вы. Выключэнне выдаляе яго.",
};

const uk: Strings = {
  title: "Відстань", hint: "Бачите лише ви вдвох і тільки якщо ввімкнули обоє. Партнер не бачить ваших координат, лише кілометри, округлені до 5.",
  off: "Зараз ви не ділитеся відстанню", on: "Ви ділитеся відстанню", enable: "Ділитися відстанню", disable: "Вимкнути", refresh: "Оновити",
  between: "Між вами приблизно {km}", together: "Ви поруч", waiting: "Чекаємо, коли {name} теж увімкне", askingPlace: "Визначаємо місце…",
  denied: "Немає доступу до геолокації. Дозвольте її для сайту в налаштуваннях браузера.", unsupported: "Цей пристрій не вміє визначати місце",
  err: "Не вдалося, спробуйте ще раз", privacy: "У базі зберігається місце з точністю близько 11 км, бачите його лише ви. Вимкнення видаляє його.",
};

const de: Strings = {
  title: "Entfernung", hint: "Nur ihr beide seht sie, und nur wenn ihr beide sie einschaltet. Dein Partner sieht nie deine Koordinaten, nur Kilometer auf 5 gerundet.",
  off: "Du teilst die Entfernung nicht", on: "Du teilst die Entfernung", enable: "Entfernung teilen", disable: "Ausschalten", refresh: "Aktualisieren",
  between: "Zwischen euch liegen etwa {km}", together: "Ihr seid nah beieinander", waiting: "Warten, bis auch {name} einschaltet", askingPlace: "Standort wird bestimmt …",
  denied: "Kein Zugriff auf den Standort. Erlaube ihn für diese Seite in den Browsereinstellungen.", unsupported: "Dieses Gerät kann seinen Standort nicht bestimmen",
  err: "Das hat nicht geklappt, versuche es noch einmal", privacy: "Dein Ort wird auf etwa 11 km genau gespeichert, und nur du siehst ihn. Ausschalten löscht ihn.",
};

const fr: Strings = {
  title: "Distance", hint: "Visible seulement par vous deux, et seulement si vous l’activez tous les deux. Votre partenaire ne voit jamais vos coordonnées, seulement des kilomètres arrondis à 5.",
  off: "Vous ne partagez pas la distance", on: "Vous partagez la distance", enable: "Partager la distance", disable: "Désactiver", refresh: "Actualiser",
  between: "Environ {km} vous séparent", together: "Vous êtes tout près", waiting: "On attend que {name} l’active aussi", askingPlace: "Localisation en cours…",
  denied: "Pas d’accès à la position. Autorisez-la pour ce site dans les réglages du navigateur.", unsupported: "Cet appareil ne peut pas se localiser",
  err: "Échec, réessayez", privacy: "Votre position est stockée à environ 11 km près et vous seul·e la voyez. Désactiver la supprime.",
};

const es: Strings = {
  title: "Distancia", hint: "Solo lo veis vosotros dos, y solo si lo activáis los dos. Tu pareja nunca ve tus coordenadas, solo kilómetros redondeados a 5.",
  off: "No compartes la distancia", on: "Compartes la distancia", enable: "Compartir distancia", disable: "Desactivar", refresh: "Actualizar",
  between: "Entre vosotros hay unos {km}", together: "Estáis cerca", waiting: "Esperando a que {name} también lo active", askingPlace: "Buscando tu ubicación…",
  denied: "Sin acceso a la ubicación. Permítela para este sitio en los ajustes del navegador.", unsupported: "Este dispositivo no puede obtener su ubicación",
  err: "No se pudo, inténtalo de nuevo", privacy: "Tu lugar se guarda con una precisión de unos 11 km y solo lo ves tú. Al desactivar se borra.",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type DistanceKey = keyof Strings;
export const makeDistance = (lang: Lang) => (k: DistanceKey): string => (ALL[lang] ?? en)[k];
