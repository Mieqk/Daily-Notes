import { supabase } from './supabase';

/** Схема из capacitor.config.json (appId) и intent-filter в Android-манифесте. */
export const NATIVE_REDIRECT = 'io.vercel.dailynotes://auth';

/** Событие window с текстом ошибки возврата из браузера; экран входа показывает его под кнопкой. */
export const NATIVE_AUTH_ERROR = 'native-auth-error';

/** Журнал шагов входа для экрана входа в APK (на телефоне нет консоли): window.__nativeAuthLog. */
export const NATIVE_AUTH_LOG = 'native-auth-log';
export function nativeLog(message: string): void {
  const w = window as unknown as { __nativeAuthLog?: string[] };
  const line = `${new Date().toLocaleTimeString()} ${message}`;
  w.__nativeAuthLog = [...(w.__nativeAuthLog ?? []), line].slice(-12);
  window.dispatchEvent(new Event(NATIVE_AUTH_LOG));
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, any>;
  registerPlugin?: (name: string) => any;
  nativePromise?: (plugin: string, method: string, options?: unknown) => Promise<any>;
  addListener?: (plugin: string, event: string, cb: (data: any) => void) => { remove: () => void };
}

const cap = (): CapacitorGlobal | undefined => (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

/**
 * Вызов метода нативного плагина. Страница грузится с сайта, без JS-пакетов Capacitor, поэтому ни
 * Capacitor.Plugins, ни registerPlugin там нет; зато нативный мост всегда даёт nativePromise.
 */
const callNative = (name: string, method: string, options?: unknown): Promise<any> => {
  const c = cap();
  if (c?.nativePromise) return c.nativePromise(name, method, options);
  const p = c?.Plugins?.[name] ?? c?.registerPlugin?.(name);
  if (p?.[method]) return p[method](options);
  return Promise.reject(new Error(`${name} plugin unavailable`));
};

/** Страница открыта внутри Android-обёртки (Capacitor), а не в браузере. */
export const isNativeApp = () => {
  const w = window as unknown as { androidBridge?: unknown };
  return Boolean(cap()?.isNativePlatform?.() || w.androidBridge);
};

/** Признаки окружения для строки диагностики на экране входа (на телефоне нет консоли). */
export function nativeEnv(): string {
  const w = window as unknown as { androidBridge?: unknown };
  const ua = navigator.userAgent;
  return `режим=${isNativeApp() ? 'APK' : 'браузер'} Capacitor=${Boolean(cap())} isNativePlatform=${String(cap()?.isNativePlatform?.())} androidBridge=${Boolean(w.androidBridge)} wv=${/; wv\)/.test(ua)} standalone=${window.matchMedia?.('(display-mode: standalone)').matches ?? false}`;
}

/** Вход через Google: Google не пускает OAuth во встроенный WebView, поэтому открываем системный браузер. */
export async function signInWithGoogleNative(): Promise<string | null> {
  if (!supabase) return 'Supabase not configured';
  nativeLog('вход: открываю браузер');
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return error?.message ?? 'No OAuth url';
    try {
      await callNative('Browser', 'open', { url: data.url });
      nativeLog('вход: браузер открыт');
    } catch (e) {
      nativeLog(`вход: браузер не открылся (${e instanceof Error ? e.message : String(e)}), пробую напрямую`);
      // Плагин Browser недоступен: внешний адрес Capacitor откроет в системном браузере.
      window.location.href = data.url;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Ловит возврат из браузера по ссылке io.vercel.dailynotes://auth#access_token=… и входит в аккаунт. */
export function initNativeAuthListener(): () => void {
  const c = cap();
  if (!isNativeApp() || !supabase) return () => {};
  const client = supabase;
  nativeLog(`слушатель: addListener=${typeof c?.addListener}, nativePromise=${typeof c?.nativePromise}`);
  const onVisible = () => { if (document.visibilityState === 'visible') nativeLog('приложение снова на экране'); };
  document.addEventListener('visibilitychange', onVisible);
  const fail = (message: string) => {
    (window as unknown as { __nativeAuthMsg?: string }).__nativeAuthMsg = message;
    window.dispatchEvent(new CustomEvent(NATIVE_AUTH_ERROR, { detail: message }));
  };
  const onOpen = async (event: { url: string }) => {
    nativeLog(`appUrlOpen: ${String(event?.url).split(/[#?]/)[0]}`);
    if (!event?.url?.startsWith(NATIVE_REDIRECT)) return;
    try {
      const url = new URL(event.url.replace('#', '?'));
      fail(`Ссылка возврата получена (${[...url.searchParams.keys()].join(', ') || 'без параметров'})`);
      const access_token = url.searchParams.get('access_token');
      const refresh_token = url.searchParams.get('refresh_token');
      const code = url.searchParams.get('code');
      const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
      let result: { error: { message: string } | null } | null = null;
      if (access_token && refresh_token) result = await client.auth.setSession({ access_token, refresh_token });
      else if (code) result = await client.auth.exchangeCodeForSession(code);
      nativeLog(`токены: access=${Boolean(access_token)} refresh=${Boolean(refresh_token)} code=${Boolean(code)} ошибка=${authError ?? 'нет'}; сессия=${result ? (result.error ? 'ошибка' : 'есть') : 'нет'}`);
      if (result?.error) fail(result.error.message);
      else if (!result) fail(authError ?? `Нет токена во ссылке возврата (${[...url.searchParams.keys()].join(', ') || 'пусто'})`);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    } finally {
      await callNative('Browser', 'close').catch(() => {});
    }
  };
  // Если страница перезагрузилась, пока шёл вход, ссылка возврата приходит как стартовая.
  callNative('App', 'getLaunchUrl').then((r) => { nativeLog(`стартовая ссылка: ${r?.url ? String(r.url).split(/[#?]/)[0] : 'нет'}`); if (r?.url) onOpen(r); }).catch((e) => nativeLog(`getLaunchUrl: ${e instanceof Error ? e.message : String(e)}`));
  if (!c?.addListener) {
    fail('Слушатель возврата недоступен');
    return () => {};
  }
  const handle = c.addListener('App', 'appUrlOpen', onOpen);
  return () => { handle.remove(); document.removeEventListener('visibilitychange', onVisible); };
}
