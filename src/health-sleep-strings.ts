import type { Lang } from "./i18n";

/** Сон из Health Connect (Android): настройка и сообщения. */
const ru = {
  title: "Сон из Health Connect", sub: "часы и браслет заполняют сон сами",
  about: "Приложение будет читать из Health Connect только сон: время засыпания, пробуждения и число пробуждений ночью. Пустые дни заполнятся сами, уже записанные не меняются. Данные остаются в вашей записи сна, больше никуда не уходят.",
  unavailable: "Нужен Android 14 или новее: там Health Connect уже встроен в телефон.",
  denied: "Доступ не выдан. Нажмите «Открыть настройки» и разрешите «Сон».",
  settings: "Открыть настройки", imported: "Подтянут сон из Health Connect",
};
type Strings = typeof ru;

const en: Strings = {
  title: "Sleep from Health Connect", sub: "your watch or band fills in sleep for you",
  about: "The app will read only sleep from Health Connect: bedtime, wake-up time and the number of wake-ups. Empty days are filled in automatically; entries you already have stay untouched. The data only goes into your sleep entry and nowhere else.",
  unavailable: "Requires Android 14 or newer, where Health Connect is built into the phone.",
  denied: "Access not granted. Tap “Open settings” and allow “Sleep”.",
  settings: "Open settings", imported: "Sleep imported from Health Connect",
};

const be: Strings = {
  title: "Сон з Health Connect", sub: "гадзіннік і браслет запаўняюць сон самі",
  about: "Праграма будзе чытаць з Health Connect толькі сон: час засынання, абуджэння і колькасць абуджэнняў уначы. Пустыя дні запоўняцца самі, ужо запісаныя не мяняюцца. Даныя застаюцца ў вашым запісе сну і нікуды болей не ідуць.",
  unavailable: "Патрэбен Android 14 або навей: там Health Connect ужо ўбудаваны ў тэлефон.",
  denied: "Доступ не выдадзены. Націсніце «Адкрыць налады» і дазвольце «Сон».",
  settings: "Адкрыць налады", imported: "Сон падцягнуты з Health Connect",
};

const uk: Strings = {
  title: "Сон із Health Connect", sub: "годинник і браслет заповнюють сон самі",
  about: "Застосунок читатиме з Health Connect лише сон: час засинання, пробудження та кількість пробуджень уночі. Порожні дні заповняться самі, уже записані не змінюються. Дані залишаються у вашому записі сну й нікуди більше не йдуть.",
  unavailable: "Потрібен Android 14 або новіший: там Health Connect уже вбудований у телефон.",
  denied: "Доступ не надано. Натисніть «Відкрити налаштування» і дозвольте «Сон».",
  settings: "Відкрити налаштування", imported: "Сон підтягнуто з Health Connect",
};

const de: Strings = {
  title: "Schlaf aus Health Connect", sub: "Uhr oder Armband tragen den Schlaf selbst ein",
  about: "Die App liest aus Health Connect nur den Schlaf: Einschlafzeit, Aufwachzeit und die Zahl der nächtlichen Wachphasen. Leere Tage werden automatisch gefüllt, vorhandene Einträge bleiben unverändert. Die Daten landen nur in deinem Schlafeintrag und sonst nirgends.",
  unavailable: "Benötigt Android 14 oder neuer, wo Health Connect fest im Handy integriert ist.",
  denied: "Zugriff nicht erteilt. Tippe auf „Einstellungen öffnen“ und erlaube „Schlaf“.",
  settings: "Einstellungen öffnen", imported: "Schlaf aus Health Connect übernommen",
};

const fr: Strings = {
  title: "Sommeil depuis Health Connect", sub: "votre montre ou bracelet remplit le sommeil",
  about: "L'appli lira dans Health Connect uniquement le sommeil : heure du coucher, du réveil et nombre de réveils nocturnes. Les jours vides sont remplis automatiquement, les entrées existantes ne changent pas. Les données restent dans votre fiche de sommeil et ne vont nulle part ailleurs.",
  unavailable: "Nécessite Android 14 ou plus récent, où Health Connect est intégré au téléphone.",
  denied: "Accès non accordé. Touchez « Ouvrir les réglages » et autorisez « Sommeil ».",
  settings: "Ouvrir les réglages", imported: "Sommeil importé depuis Health Connect",
};

const es: Strings = {
  title: "Sueño desde Health Connect", sub: "tu reloj o pulsera rellena el sueño solo",
  about: "La app leerá de Health Connect solo el sueño: hora de dormir, de despertar y número de despertares nocturnos. Los días vacíos se rellenan solos y los registros existentes no cambian. Los datos solo van a tu registro de sueño, a ningún otro sitio.",
  unavailable: "Requiere Android 14 o superior, donde Health Connect ya viene integrado en el teléfono.",
  denied: "Acceso no concedido. Toca «Abrir ajustes» y permite «Sueño».",
  settings: "Abrir ajustes", imported: "Sueño importado de Health Connect",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type HealthSleepKey = keyof Strings;
export const makeHealthSleep = (lang: Lang) => (k: HealthSleepKey): string => (ALL[lang] ?? en)[k];
