-- Синхронизация с Google Календарём. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Токен доступа к календарю хранится только здесь и читается только серверной функцией
-- /api/gcal с ключом service_role. Для anon/authenticated таблица закрыта полностью:
-- клиент узнаёт о подключении через сам /api/gcal.

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider = 'google'),
  refresh_token TEXT NOT NULL,
  google_email TEXT,
  -- {"<id задачи>": {"e": "<id события в Google>", "d": "YYYY-MM-DD", "h": "<хэш содержимого>"}}
  synced JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_connections FROM anon, authenticated;
-- Политик нет намеренно: доступ только у service_role (он обходит RLS).

-- Проверка:
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.calendar_connections'::regclass;
