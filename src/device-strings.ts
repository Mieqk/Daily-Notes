import type { Lang } from "./i18n";

/** Строки биометрии и камеры (вне основных словарей, чтобы не мешать правкам переводов). */
const ru = {
  bioTitle: "Вход по биометрии", bioEnable: "Включить биометрию", bioDisable: "Выключить биометрию", bioOn: "Биометрия включена", bioOff: "Биометрия выключена",
  bioNote: "Отпечаток или Face ID открывают приложение вместо PIN. PIN остаётся запасным способом. Ключ хранится только на этом устройстве.",
  bioNeedPin: "Сначала установите PIN", bioUnsupported: "Это устройство или браузер не поддерживает биометрию",
  bioUnlock: "Войти по биометрии", bioFail: "Не удалось подтвердить личность. Введите PIN", bioRegFail: "Не удалось включить биометрию",
  toastBioOn: "Биометрия включена", toastBioOff: "Биометрия выключена",
  camTake: "Снять", camTitle: "Камера", camShot: "Сделать снимок", camFlip: "Сменить камеру", camClose: "Закрыть камеру",
  camDenied: "Нет доступа к камере. Разрешите её в настройках браузера.", camBusy: "Камера недоступна",
};
type Strings = typeof ru;

const en: Strings = {
  bioTitle: "Biometric unlock", bioEnable: "Enable biometrics", bioDisable: "Disable biometrics", bioOn: "Biometrics on", bioOff: "Biometrics off",
  bioNote: "Fingerprint or Face ID opens the app instead of the PIN. The PIN stays as a fallback. The key never leaves this device.",
  bioNeedPin: "Set a PIN first", bioUnsupported: "This device or browser does not support biometrics",
  bioUnlock: "Unlock with biometrics", bioFail: "Could not verify you. Enter your PIN", bioRegFail: "Could not enable biometrics",
  toastBioOn: "Biometrics enabled", toastBioOff: "Biometrics disabled",
  camTake: "Camera", camTitle: "Camera", camShot: "Take photo", camFlip: "Switch camera", camClose: "Close camera",
  camDenied: "No camera access. Allow it in your browser settings.", camBusy: "Camera unavailable",
};

const be: Strings = {
  bioTitle: "Уваход па біяметрыі", bioEnable: "Уключыць біяметрыю", bioDisable: "Выключыць біяметрыю", bioOn: "Біяметрыя ўключана", bioOff: "Біяметрыя выключана",
  bioNote: "Адбітак пальца або Face ID адкрываюць праграму замест PIN. PIN застаецца запасным спосабам. Ключ захоўваецца толькі на гэтай прыладзе.",
  bioNeedPin: "Спачатку ўсталюйце PIN", bioUnsupported: "Гэта прылада або браўзер не падтрымлівае біяметрыю",
  bioUnlock: "Увайсці па біяметрыі", bioFail: "Не атрымалася пацвердзіць асобу. Увядзіце PIN", bioRegFail: "Не атрымалася ўключыць біяметрыю",
  toastBioOn: "Біяметрыя ўключана", toastBioOff: "Біяметрыя выключана",
  camTake: "Зняць", camTitle: "Камера", camShot: "Зрабіць здымак", camFlip: "Змяніць камеру", camClose: "Закрыць камеру",
  camDenied: "Няма доступу да камеры. Дазвольце яго ў наладах браўзера.", camBusy: "Камера недаступная",
};

const uk: Strings = {
  bioTitle: "Вхід за біометрією", bioEnable: "Увімкнути біометрію", bioDisable: "Вимкнути біометрію", bioOn: "Біометрію увімкнено", bioOff: "Біометрію вимкнено",
  bioNote: "Відбиток пальця або Face ID відкривають застосунок замість PIN. PIN залишається запасним способом. Ключ зберігається лише на цьому пристрої.",
  bioNeedPin: "Спершу встановіть PIN", bioUnsupported: "Цей пристрій або браузер не підтримує біометрію",
  bioUnlock: "Увійти за біометрією", bioFail: "Не вдалося підтвердити особу. Введіть PIN", bioRegFail: "Не вдалося увімкнути біометрію",
  toastBioOn: "Біометрію увімкнено", toastBioOff: "Біометрію вимкнено",
  camTake: "Зняти", camTitle: "Камера", camShot: "Зробити знімок", camFlip: "Змінити камеру", camClose: "Закрити камеру",
  camDenied: "Немає доступу до камери. Дозвольте його в налаштуваннях браузера.", camBusy: "Камера недоступна",
};

const de: Strings = {
  bioTitle: "Biometrische Entsperrung", bioEnable: "Biometrie aktivieren", bioDisable: "Biometrie deaktivieren", bioOn: "Biometrie aktiv", bioOff: "Biometrie aus",
  bioNote: "Fingerabdruck oder Face ID öffnen die App statt der PIN. Die PIN bleibt als Alternative. Der Schlüssel verlässt dieses Gerät nie.",
  bioNeedPin: "Lege zuerst eine PIN fest", bioUnsupported: "Dieses Gerät oder dieser Browser unterstützt keine Biometrie",
  bioUnlock: "Mit Biometrie entsperren", bioFail: "Überprüfung fehlgeschlagen. Gib deine PIN ein", bioRegFail: "Biometrie konnte nicht aktiviert werden",
  toastBioOn: "Biometrie aktiviert", toastBioOff: "Biometrie deaktiviert",
  camTake: "Kamera", camTitle: "Kamera", camShot: "Foto aufnehmen", camFlip: "Kamera wechseln", camClose: "Kamera schließen",
  camDenied: "Kein Kamerazugriff. Erlaube ihn in den Browsereinstellungen.", camBusy: "Kamera nicht verfügbar",
};

const fr: Strings = {
  bioTitle: "Déverrouillage biométrique", bioEnable: "Activer la biométrie", bioDisable: "Désactiver la biométrie", bioOn: "Biométrie activée", bioOff: "Biométrie désactivée",
  bioNote: "L’empreinte ou Face ID ouvrent l’application à la place du PIN. Le PIN reste disponible en secours. La clé ne quitte jamais cet appareil.",
  bioNeedPin: "Définis d’abord un PIN", bioUnsupported: "Cet appareil ou ce navigateur ne prend pas en charge la biométrie",
  bioUnlock: "Déverrouiller par biométrie", bioFail: "Vérification impossible. Saisis ton PIN", bioRegFail: "Impossible d’activer la biométrie",
  toastBioOn: "Biométrie activée", toastBioOff: "Biométrie désactivée",
  camTake: "Appareil photo", camTitle: "Appareil photo", camShot: "Prendre la photo", camFlip: "Changer de caméra", camClose: "Fermer la caméra",
  camDenied: "Pas d’accès à la caméra. Autorise-le dans les réglages du navigateur.", camBusy: "Caméra indisponible",
};

const es: Strings = {
  bioTitle: "Desbloqueo biométrico", bioEnable: "Activar biometría", bioDisable: "Desactivar biometría", bioOn: "Biometría activada", bioOff: "Biometría desactivada",
  bioNote: "La huella o Face ID abren la app en lugar del PIN. El PIN sigue como alternativa. La clave nunca sale de este dispositivo.",
  bioNeedPin: "Primero establece un PIN", bioUnsupported: "Este dispositivo o navegador no admite biometría",
  bioUnlock: "Desbloquear con biometría", bioFail: "No se pudo verificar. Introduce tu PIN", bioRegFail: "No se pudo activar la biometría",
  toastBioOn: "Biometría activada", toastBioOff: "Biometría desactivada",
  camTake: "Cámara", camTitle: "Cámara", camShot: "Hacer foto", camFlip: "Cambiar cámara", camClose: "Cerrar cámara",
  camDenied: "Sin acceso a la cámara. Permítelo en los ajustes del navegador.", camBusy: "Cámara no disponible",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type DeviceKey = keyof Strings;
export const makeDevice = (lang: Lang) => (k: DeviceKey): string => (ALL[lang] ?? ALL.en)[k];
