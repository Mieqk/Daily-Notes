// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auth } = vi.hoisted(() => ({ auth: {
  setSession: vi.fn(async (_: unknown) => ({ error: null as { message: string } | null })),
  exchangeCodeForSession: vi.fn(async (_: string) => ({ error: null as { message: string } | null })),
  signInWithOAuth: vi.fn(async (_: unknown) => ({ data: { url: 'https://accounts.example/auth' } as { url?: string } | null, error: null as { message: string } | null })),
} }));
vi.mock('./supabase', () => ({ supabase: { auth } }));

import { NATIVE_AUTH_ERROR, NATIVE_REDIRECT, initNativeAuthListener, isNativeApp, signInWithGoogleNative } from './nativeAuth';

type UrlHandler = (e: { url: string }) => unknown;
let onUrl: UrlHandler | null;
let nativeCalls: [string, string, unknown][];
let launchUrl: string | undefined;
let errors: string[];
const onError = (e: Event) => errors.push((e as CustomEvent<string>).detail);

function installCapacitor(over: Record<string, unknown> = {}) {
  (window as any).Capacitor = {
    isNativePlatform: () => true,
    nativePromise: async (plugin: string, method: string, options?: unknown) => {
      nativeCalls.push([plugin, method, options]);
      if (method === 'getLaunchUrl') return launchUrl ? { url: launchUrl } : {};
      return {};
    },
    addListener: (_p: string, _e: string, cb: UrlHandler) => { onUrl = cb; return { remove: () => { onUrl = null; } }; },
    ...over,
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  onUrl = null;
  nativeCalls = [];
  launchUrl = undefined;
  errors = [];
  vi.clearAllMocks();
  window.addEventListener(NATIVE_AUTH_ERROR, onError);
  installCapacitor();
});
afterEach(() => {
  window.removeEventListener(NATIVE_AUTH_ERROR, onError);
  delete (window as any).Capacitor;
  delete (window as any).__nativeAuthMsg;
});

describe('isNativeApp', () => {
  it('в обычном браузере false', () => {
    delete (window as any).Capacitor;
    expect(isNativeApp()).toBe(false);
  });
  it('внутри Capacitor true', () => {
    expect(isNativeApp()).toBe(true);
  });
});

describe('initNativeAuthListener: разбор ссылки возврата', () => {
  it('токены во фрагменте (#access_token=…) -> setSession и закрытие браузера', async () => {
    initNativeAuthListener();
    await onUrl!({ url: `${NATIVE_REDIRECT}#access_token=AT&refresh_token=RT&expires_in=3600` });
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'AT', refresh_token: 'RT' });
    expect(nativeCalls).toContainEqual(['Browser', 'close', undefined]);
  });

  it('код (?code=…) -> exchangeCodeForSession', async () => {
    initNativeAuthListener();
    await onUrl!({ url: `${NATIVE_REDIRECT}?code=abc123` });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('чужие ссылки игнорируются', async () => {
    initNativeAuthListener();
    await onUrl!({ url: 'https://example.com/#access_token=AT&refresh_token=RT' });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(nativeCalls.some(([, m]) => m === 'close')).toBe(false);
  });

  it('ошибка Supabase показывается пользователю', async () => {
    auth.setSession.mockResolvedValueOnce({ error: { message: 'bad jwt' } });
    initNativeAuthListener();
    await onUrl!({ url: `${NATIVE_REDIRECT}#access_token=AT&refresh_token=RT` });
    expect(errors[errors.length - 1]).toBe('bad jwt');
    expect((window as any).__nativeAuthMsg).toBe('bad jwt');
  });

  it('ошибка от Google (error_description) в ссылке показывается', async () => {
    initNativeAuthListener();
    await onUrl!({ url: `${NATIVE_REDIRECT}#error=access_denied&error_description=User+cancelled` });
    expect(errors[errors.length - 1]).toBe('User cancelled');
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('ссылка без токенов даёт понятное сообщение', async () => {
    initNativeAuthListener();
    await onUrl!({ url: NATIVE_REDIRECT });
    expect(errors[errors.length - 1]).toMatch(/Нет токена/);
  });

  it('стартовая ссылка (страница перезагрузилась во время входа) тоже обрабатывается', async () => {
    launchUrl = `${NATIVE_REDIRECT}#access_token=AT&refresh_token=RT`;
    initNativeAuthListener();
    await flush();
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'AT', refresh_token: 'RT' });
  });

  it('отписка снимает слушатель', () => {
    const stop = initNativeAuthListener();
    expect(onUrl).not.toBeNull();
    stop();
    expect(onUrl).toBeNull();
  });

  it('вне приложения ничего не подписывает', () => {
    delete (window as any).Capacitor;
    initNativeAuthListener();
    expect(onUrl).toBeNull();
  });

  it('без addListener сообщает об этом', () => {
    installCapacitor({ addListener: undefined });
    initNativeAuthListener();
    expect(errors[errors.length - 1]).toMatch(/Слушатель/);
  });
});

describe('signInWithGoogleNative', () => {
  it('просит у Supabase адрес без редиректа и открывает его в системном браузере', async () => {
    expect(await signInWithGoogleNative()).toBeNull();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true } });
    expect(nativeCalls).toContainEqual(['Browser', 'open', { url: 'https://accounts.example/auth' }]);
  });

  it('ошибка Supabase возвращается текстом', async () => {
    auth.signInWithOAuth.mockResolvedValueOnce({ data: null, error: { message: 'provider disabled' } });
    expect(await signInWithGoogleNative()).toBe('provider disabled');
  });

  it('нет адреса в ответе -> сообщение', async () => {
    auth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });
    expect(await signInWithGoogleNative()).toBe('No OAuth url');
  });

  it('исключение превращается в текст', async () => {
    auth.signInWithOAuth.mockRejectedValueOnce(new Error('network'));
    expect(await signInWithGoogleNative()).toBe('network');
  });
});
