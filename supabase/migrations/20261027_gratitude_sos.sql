-- Благодарности друзьям и SOS-сигналы поддержки. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Всё отправляется только друзьям (принятые заявки) и только по явному действию человека.

-- ============ Благодарности ============
CREATE TABLE IF NOT EXISTS public.gratitude (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_user <> to_user)
);
ALTER TABLE public.gratitude ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gratitude FROM anon;
GRANT SELECT, INSERT, DELETE ON public.gratitude TO authenticated;

-- Не больше одной благодарности одному человеку в сутки (защита от спама)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gratitude_daily
  ON public.gratitude (from_user, to_user, ((created_at AT TIME ZONE 'utc')::date));

DROP POLICY IF EXISTS "gratitude read own" ON public.gratitude;
CREATE POLICY "gratitude read own" ON public.gratitude
FOR SELECT TO authenticated
USING (from_user = auth.uid() OR to_user = auth.uid());

DROP POLICY IF EXISTS "gratitude send to friends" ON public.gratitude;
CREATE POLICY "gratitude send to friends" ON public.gratitude
FOR INSERT TO authenticated
WITH CHECK (
  from_user = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_a = from_user AND f.user_b = to_user) OR (f.user_b = from_user AND f.user_a = to_user))
  )
);

DROP POLICY IF EXISTS "gratitude delete own" ON public.gratitude;
CREATE POLICY "gratitude delete own" ON public.gratitude
FOR DELETE TO authenticated
USING (from_user = auth.uid() OR to_user = auth.uid());

-- ============ SOS-сигналы ============
CREATE TABLE IF NOT EXISTS public.sos_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT CHECK (message IS NULL OR char_length(message) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.sos_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sos_signals FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_signals TO authenticated;

-- Один активный сигнал на человека
CREATE UNIQUE INDEX IF NOT EXISTS idx_sos_one_active
  ON public.sos_signals (user_id) WHERE resolved_at IS NULL;

DROP POLICY IF EXISTS "sos own" ON public.sos_signals;
CREATE POLICY "sos own" ON public.sos_signals
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sos friends read" ON public.sos_signals;
CREATE POLICY "sos friends read" ON public.sos_signals
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_a = auth.uid() AND f.user_b = sos_signals.user_id)
        OR (f.user_b = auth.uid() AND f.user_a = sos_signals.user_id))
  )
);

CREATE TABLE IF NOT EXISTS public.sos_support (
  signal_id UUID NOT NULL REFERENCES public.sos_signals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (signal_id, user_id)
);
ALTER TABLE public.sos_support ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sos_support FROM anon;
GRANT SELECT, INSERT, DELETE ON public.sos_support TO authenticated;

-- «Я рядом» можно нажать только на сигнал друга (чужие сигналы не видны, подзапрос идёт через RLS)
DROP POLICY IF EXISTS "sos support add" ON public.sos_support;
CREATE POLICY "sos support add" ON public.sos_support
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.sos_signals s
    WHERE s.id = sos_support.signal_id AND s.user_id <> auth.uid() AND s.resolved_at IS NULL
  )
);

-- Видят: сам откликнувшийся и автор сигнала
DROP POLICY IF EXISTS "sos support read" ON public.sos_support;
CREATE POLICY "sos support read" ON public.sos_support
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.sos_signals s WHERE s.id = sos_support.signal_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "sos support delete own" ON public.sos_support;
CREATE POLICY "sos support delete own" ON public.sos_support
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Проверка:
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('gratitude','sos_signals','sos_support') ORDER BY 1,2;
