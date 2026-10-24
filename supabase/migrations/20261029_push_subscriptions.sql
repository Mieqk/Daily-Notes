-- Подписки на фоновые web-push уведомления. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Клиент пишет только свою подписку (RLS). Читает таблицу и рассылает пуши серверная
-- функция /api/push с ключом service_role, поэтому для anon/authenticated SELECT закрыт:
-- endpoint и ключи подписки чужим людям не нужны.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (char_length(endpoint) <= 2048),
  p256dh TEXT NOT NULL CHECK (char_length(p256dh) <= 256),
  auth TEXT NOT NULL CHECK (char_length(auth) <= 128),
  lang TEXT NOT NULL DEFAULT 'ru' CHECK (char_length(lang) <= 8),
  tz TEXT NOT NULL DEFAULT 'UTC' CHECK (char_length(tz) <= 64),
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time TEXT NOT NULL DEFAULT '20:00' CHECK (reminder_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  friends_enabled BOOLEAN NOT NULL DEFAULT true,
  last_reminder_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
-- Без SELECT: клиент делает upsert без чтения, а читает сервер (service_role обходит RLS).
GRANT INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "push insert own" ON public.push_subscriptions;
CREATE POLICY "push insert own" ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- upsert по endpoint требует права на обновление строки; USING нужен и для UPDATE, и для DELETE
DROP POLICY IF EXISTS "push update own" ON public.push_subscriptions;
CREATE POLICY "push update own" ON public.push_subscriptions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push delete own" ON public.push_subscriptions;
CREATE POLICY "push delete own" ON public.push_subscriptions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='push_subscriptions' ORDER BY 1;

-- Отметка «пуш по этой записи уже отправлен»: сервер ставит её атомарно, повторный вызов
-- /api/push для того же id ничего не рассылает.
ALTER TABLE public.gratitude ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;
ALTER TABLE public.sos_signals ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;
