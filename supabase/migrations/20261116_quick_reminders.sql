-- Быстрые напоминания с фоновым пушем. Выполнять в Supabase -> SQL Editor. Можно запускать повторно.
-- Нужна уже применённая 20261029_push_subscriptions.sql.
--
-- Строка появляется, только когда человек вошёл в аккаунт и разрешил уведомления: так сервер знает, что и когда
-- прислать пушем, пока приложение закрыто. Клиент пишет и удаляет только свои строки (RLS), читает и рассылает
-- серверная функция /api/push-reminders с ключом service_role, поэтому SELECT для клиента закрыт.

CREATE TABLE IF NOT EXISTS public.quick_reminders (
  id TEXT PRIMARY KEY CHECK (char_length(id) <= 64),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL CHECK (char_length(endpoint) <= 2048),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 200),
  remind_at TIMESTAMPTZ NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ru' CHECK (char_length(lang) <= 8),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_reminders_due ON public.quick_reminders (remind_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quick_reminders_user ON public.quick_reminders (user_id);

ALTER TABLE public.quick_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quick_reminders FROM anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quick_reminders TO authenticated;

DROP POLICY IF EXISTS "quick insert own" ON public.quick_reminders;
CREATE POLICY "quick insert own" ON public.quick_reminders
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quick update own" ON public.quick_reminders;
CREATE POLICY "quick update own" ON public.quick_reminders
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quick delete own" ON public.quick_reminders;
CREATE POLICY "quick delete own" ON public.quick_reminders
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='quick_reminders' ORDER BY 1;
