-- Сквозное шифрование записей: хранилище ключей. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Здесь лежит не сам ключ, а «запертый» ключ данных: один раз под ключом от пароля шифрования,
-- второй раз под ключом восстановления. Расшифровать их без пароля или ключа восстановления нельзя,
-- в том числе нам. Сами записи по-прежнему лежат в entries / tasks / sleep_logs, но в зашифрованном
-- виде (текст начинается с «enc:v1.»), поэтому менять эти таблицы не нужно.

CREATE TABLE IF NOT EXISTS public.user_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salt TEXT NOT NULL,
  iter INTEGER NOT NULL CHECK (iter >= 100000),
  wrapped_pass TEXT NOT NULL,
  r_salt TEXT NOT NULL,
  wrapped_recovery TEXT NOT NULL,
  check_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_keys FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO authenticated;

DROP POLICY IF EXISTS "user keys read" ON public.user_keys;
CREATE POLICY "user keys read" ON public.user_keys FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user keys add" ON public.user_keys;
CREATE POLICY "user keys add" ON public.user_keys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user keys update" ON public.user_keys;
CREATE POLICY "user keys update" ON public.user_keys FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user keys delete" ON public.user_keys;
CREATE POLICY "user keys delete" ON public.user_keys FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='user_keys' ORDER BY 1;
