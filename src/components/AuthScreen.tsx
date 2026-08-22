import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from '../icons';

interface AuthScreenProps {
  onContinueLocally: () => void;
}

export default function AuthScreen({ onContinueLocally }: AuthScreenProps) {
  const { signUp, signIn, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

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
      <div className="w-full max-w-md animate-rise rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 shadow-xl">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
            Daily Notes
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-faint)]">
            {isLogin ? 'С возвращением!' : 'Создайте аккаунт для синхронизации'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading || isResetMode}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              autoComplete="email"
            />
          </div>

          {!isResetMode && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 pr-10 text-sm outline-none transition-colors focus:border-[var(--accent)]"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink-soft)] disabled:opacity-50"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {isLogin && !isResetMode && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(true);
                  setError(null);
                  setSuccessMessage(null);
                  setPassword('');
                }}
                disabled={loading}
                className="text-xs font-medium text-[var(--ink-soft)] underline decoration-[var(--accent)] underline-offset-4 hover:text-[var(--accent)] disabled:opacity-50"
              >
                Забыли пароль?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isResetMode && !email)}
            className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
              loading
                ? 'bg-[var(--ink-faint)] cursor-not-allowed opacity-50'
                : 'bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {loading 
              ? 'Загрузка...' 
              : isResetMode 
                ? 'Отправить инструкции' 
                : isLogin 
                  ? 'Войти' 
                  : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Toggle Login/Signup or Back from Reset */}
        <div className="mt-6 text-center">
          {isResetMode ? (
            <p className="text-sm text-[var(--ink-soft)]">
              <button
                onClick={() => {
                  setIsResetMode(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                disabled={loading}
                className="font-semibold underline decoration-[var(--accent)] underline-offset-4 hover:text-[var(--accent)] disabled:opacity-50"
              >
                Назад ко входу
              </button>
            </p>
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
                className="ml-2 font-semibold underline decoration-[var(--accent)] underline-offset-4 hover:text-[var(--accent)] disabled:opacity-50"
              >
                {isLogin ? 'Создать' : 'Войти'}
              </button>
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs text-[var(--ink-faint)]">или</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        {/* Continue Locally Button */}
        <button
          onClick={onContinueLocally}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] py-3.5 text-sm font-semibold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-[0.98]"
        >
          Продолжить без аккаунта
        </button>

        <p className="mt-4 text-center text-xs text-[var(--ink-faint)]">
          Данные будут храниться локально в этом браузере
        </p>
      </div>
    </div>
  );
}
