/** Определение iPhone/iPad и режима «установлено на экран Домой» (PWA в Safari). */
export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** Приложение открыто с иконки на экране «Домой», а не во вкладке браузера. */
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

/** iPhone/iPad, где приложение ещё не добавлено на экран «Домой»: тут нет ни пушей, ни установки одной кнопкой. */
export const needsIosInstall = () => isIOS() && !isStandalone();
