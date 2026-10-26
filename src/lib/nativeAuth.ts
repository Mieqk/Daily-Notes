import { supabase } from './supabase';

/** Схема из capacitor.config.json (appId) и intent-filter в Android-манифесте. */
export const NATIVE_REDIRECT = 'io.vercel.dailynotes://auth';

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
export const isNativeApp = () => Boolean(cap()?.isNativePlatform?.());

/** Вход через Google: Google не пускает OAuth во встроенный WebView, поэтому открываем системный браузер. */
export async function signInWithGoogleNative(): Promise<string | null> {
  if (!supabase) return 'Supabase not configured';
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return error?.message ?? 'No OAuth url';
    try {
      await callNative('Browser', 'open', { url: data.url });
    } catch {
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
  const onOpen = async (event: { url: string }) => {
    if (!event.url.startsWith(NATIVE_REDIRECT)) return;
    const url = new URL(event.url.replace('#', '?'));
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');
    const code = url.searchParams.get('code');
    try {
      if (access_token && refresh_token) await client.auth.setSession({ access_token, refresh_token });
      else if (code) await client.auth.exchangeCodeForSession(code);
    } finally {
      await callNative('Browser', 'close').catch(() => {});
    }
  };
  if (!c?.addListener) return () => {};
  const handle = c.addListener('App', 'appUrlOpen', onOpen);
  return () => handle.remove();
}
