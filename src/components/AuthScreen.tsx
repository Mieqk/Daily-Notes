import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthScreenProps {
  onContinueLocally: () => void;
}

export default function AuthScreen({ onContinueLocally }: AuthScreenProps) {
  const { signUp, signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!email || !password) {
      setError('Заполните email и пароль');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      setLoading(false);
      return;
    }

    if (isLogin) {
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
              disabled={loading}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
              loading
                ? 'bg-[var(--ink-faint)] cursor-not-allowed opacity-50'
                : 'bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
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
