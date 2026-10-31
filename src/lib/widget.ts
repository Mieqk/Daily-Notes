import { callNative, isNativeApp } from './nativeAuth';

/** Что отправить виджету. Без входа в аккаунт серия неизвестна (-1), и виджет просит открыть приложение. */
export function widgetState(loggedIn: boolean, streak: number, doneToday: boolean, today: string) {
  return { streak: loggedIn ? Math.max(0, Math.floor(streak)) : -1, done: loggedIn && doneToday, day: today };
}

/** Отдаёт виджету Android серию дней и отметку за сегодня; в браузере и PWA ничего не делает. */
export function syncWidget(loggedIn: boolean, streak: number, doneToday: boolean, today: string): void {
  if (!isNativeApp()) return;
  callNative('DailyWidget', 'update', widgetState(loggedIn, streak, doneToday, today)).catch(() => {});
}
