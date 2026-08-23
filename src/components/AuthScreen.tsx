import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Mail, LockIcon, UserPlus, LogIn, Key, ArrowLeftIcon, Wifi, WifiOff } from '../icons';
import type { ThemeId } from '../themes';
import { THEMES } from '../themes';

interface AuthScreenProps {
  onContinueLocally: () => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
}

export default function AuthScreen({ onContinueLocally, theme, onTheme }: AuthScreenProps) {
  const { signUp, signIn, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Синхронизация не настроена');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!email) {
      setError('Введите email');
      setLoading(false);
      return;
    }

    if (!isResetMode && !password) {
      setError('Введите пароль');
      setLoading(false);
      return;
    }

    if (!isResetMode && password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      setLoading(false);
      return;
    }

    if (isLogin && !isResetMode) {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Неверный email или пароль');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Подтвердите email перед входом');
        } else {
          setError(error.message);
        }
      }
    } else if (isResetMode) {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Инструкции по сбросу пароля отправлены на почту!');
        setIsResetMode(false);
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Этот email уже зарегистрирован');
        } else if (error.message.includes('Invalid email')) {
          setError('Некорректный email');
        } else {
          setError(error.message);
        }
      } else {
        setSuccessMessage('Проверьте почту для подтверждения регистрации!');
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md animate-rise overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div
          className="relative flex flex-col items-center justify-center py-8"
          style={{ background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-deep, var(--accent)) 100%)` }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white blur-3xl"></div>
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white blur-3xl"></div>
          </div>

          <div className="relative z-10 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              {isResetMode ? (
                <Key className="h-8 w-8 text-white" />
              ) : isLogin ? (
                <LogIn className="h-8 w-8 text-white" />
              ) : (
                <UserPlus className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Daily Notes
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {isResetMode
                ? 'Восстановление доступа'
                : isLogin
                  ? 'С возвращением!'
                  : 'Создайте аккаунт'}
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              Тема оформления
            </p>
            <div className="flex justify-center gap-3">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => onTheme(th.id)}
                  className={`group relative h-10 w-10 rounded-full border-2 transition-all duration-300 ${
                    th.id === theme
                      ? 'border-[var(--accent)] scale-110 shadow-lg'
                      : 'border-[var(--line)] hover:scale-105 hover:shadow-md'
                  }`}
                  style={{ background: th.swatch.accent }}
                  title={th.name.ru}
                  aria-label={th.name.ru}
                >
                  {th.id === theme && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-3 w-3 rounded-full bg-white/80"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-rise">
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-rise">
              <span className="flex-shrink-0">✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading || isResetMode}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3.5 pl-11 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  autoComplete="email"
                />
                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ink-faint)]" />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                  <LockIcon className="h-4 w-4" />
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3.5 pl-11 pr-11 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <LockIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ink-faint)]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-soft)] disabled:opacity-50"
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isResetMode && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-[var(--line)] accent-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--ink-soft)]">Запомнить меня</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError(null);
                    setSuccessMessage(null);
                    setPassword('');
                  }}
                  disabled={loading}
                  className="text-xs font-medium text-[var(--ink-soft)] underline decoration-[var(--accent)] underline-offset-4 transition-colors hover:text-[var(--accent)] disabled:opacity-50"
                >
                  Забыли пароль?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isResetMode && !email)}
              className={`group flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all ${
                loading
                  ? 'bg-[var(--ink-faint)] cursor-not-allowed opacity-50'
                  : 'bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  Загрузка...
                </>
              ) : isResetMode ? (
                <>
                  <Mail className="h-5 w-5" />
                  Отправить инструкции
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="h-5 w-5" />
                  Войти
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Зарегистрироваться
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] py-4 text-sm font-semibold text-[var(--ink)] transition-all hover:border-[var(--accent)] hover:bg-[var(--hover)] active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
            </svg>
            Войти через Google
          </button>

          <div className="mt-6 text-center">
            {isResetMode ? (
              <button
                onClick={() => {
                  setIsResetMode(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                disabled={loading}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)] disabled:opacity-50"
              >
                <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Назад ко входу
              </button>
            ) : (
              <p className="text-sm text-[var(--ink-soft)]">
                {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  disabled={loading}
                  className="ml-2 font-semibold underline decoration-[var(--accent)] underline-offset-4 transition-colors hover:text-[var(--accent)]"
                >
                  {isLogin ? 'Создать' : 'Войти'}
                </button>
              </p>
            )}
          </div>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--line)] to-transparent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">или</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--line)] to-transparent" />
          </div>

          <button
            onClick={onContinueLocally}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] py-4 text-sm font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 hover:text-[var(--accent-deep)] active:scale-[0.98]"
          >
            <WifiOff className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
            Продолжить без аккаунта
          </button>

          <p className="mt-3 text-center text-xs text-[var(--ink-faint)]">
            <Wifi className="mr-1 inline h-3 w-3" />
            Данные будут храниться локально в этом браузере
          </p>
        </div>
      </div>
    </div>
  );
}
