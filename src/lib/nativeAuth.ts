import { supabase } from './supabase';

/** Схема из capacitor.config.json (appId) и intent-filter в Android-манифесте. */
export const NATIVE_REDIRECT = 'io.vercel.dailynotes://auth';

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, any>;
  registerPlugin?: (name: string) => any;
}

const cap = (): CapacitorGlobal | undefined => (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

/**
 * Нативный плагин по имени. Страница грузится с сайта, без JS-пакетов Capacitor, поэтому в
 * Capacitor.Plugins плагина нет, пока его не зарегистрировали: registerPlugin подключает его к нативной части.
 */
const plugin = (name: string) => cap()?.Plugins?.[name] ?? cap()?.registerPlugin?.(name);

/** Страница открыта внутри Android-обёртки (Capacitor), а не в браузере. */
export const isNativeApp = () => Boolean(cap()?.isNativePlatform?.());

/** Вход через Google: Google не пускает OAuth во встроенный WebView, поэтому открываем системный браузер. */
export async function signInWithGoogleNative(): Promise<string | null> {
  const browser = plugin('Browser');
  if (!supabase || !browser) return 'Browser plugin unavailable';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return error?.message ?? 'No OAuth url';
  await browser.open({ url: data.url });
  return null;
}

/** Ловит возврат из браузера по ссылке io.vercel.dailynotes://auth#access_token=… и входит в аккаунт. */
export function initNativeAuthListener(): () => void {
  const app = plugin('App');
  if (!isNativeApp() || !app || !supabase) return () => {};
  const client = supabase;
  const handle = app.addListener('appUrlOpen', async (event: { url: string }) => {
    if (!event.url.startsWith(NATIVE_REDIRECT)) return;
    const url = new URL(event.url.replace('#', '?'));
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');
    const code = url.searchParams.get('code');
    try {
      if (access_token && refresh_token) await client.auth.setSession({ access_token, refresh_token });
      else if (code) await client.auth.exchangeCodeForSession(code);
    } finally {
      await plugin('Browser')?.close?.().catch(() => {});
    }
  });
  return () => {
    Promise.resolve(handle).then((h: { remove?: () => void }) => h?.remove?.());
  };
}
