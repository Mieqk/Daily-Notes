import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Lang } from "../i18n";
import { makeUI } from "../ui-strings";

/** Экран задания нового пароля после перехода по ссылке «Забыли пароль?». */
export default function NewPasswordScreen({ lang }: { lang: Lang }) {
  const u = makeUI(lang);
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError(u("pwShort")); return; }
    setBusy(true);
    setError(null);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setError(error.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6" style={{ boxShadow: "var(--shadow)" }}>
        <h1 className="font-display mb-4 text-lg font-bold">{u("newPwTitle")}</h1>
        <label htmlFor="new-password" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{u("password")}</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
        <button type="submit" disabled={busy} className="mt-4 h-11 w-full rounded-lg bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-60">
          {busy ? u("loading") : u("newPwSave")}
        </button>
      </form>
    </div>
  );
}
