-- Свои шаблоны дня и плагины-виджеты: синхронизация через аккаунт и общая галерея.
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует fitness_data из 20261102_fitness_sync.sql.
--
-- Плагины здесь не программы, а настройки виджета (название, тип, цель, пункты списка).
-- Приложение проверяет каждое поле перед установкой, поэтому чужой плагин не может ничего прочитать или отправить.

-- 1. Разрешаем хранить в fitness_data свои шаблоны, плагины и их отметки по дням
ALTER TABLE public.fitness_data DROP CONSTRAINT IF EXISTS fitness_data_key_check;
ALTER TABLE public.fitness_data ADD CONSTRAINT fitness_data_key_check CHECK (
  key IN ('foods', 'foodLog', 'foodGoal', 'workoutLog', 'workoutTpl', 'restLen', 'dayTemplates', 'plugins', 'pluginData')
);

-- 2. Галерея шаблонов и плагинов от пользователей
CREATE TABLE IF NOT EXISTS public.community_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('template', 'plugin')),
  author UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '' CHECK (char_length(author_name) <= 40),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 200),
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) <= 8000),
  installs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_addons_popular_idx ON public.community_addons (kind, installs DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_addons_author_idx ON public.community_addons (author);

ALTER TABLE public.community_addons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_addons FROM anon;
GRANT SELECT, DELETE ON public.community_addons TO authenticated;
-- Счётчик установок и автора напрямую менять нельзя
GRANT INSERT (kind, author_name, name, description, data) ON public.community_addons TO authenticated;
GRANT UPDATE (author_name, name, description, data, updated_at) ON public.community_addons TO authenticated;

DROP POLICY IF EXISTS "community addons read" ON public.community_addons;
CREATE POLICY "community addons read" ON public.community_addons
FOR SELECT TO authenticated USING (true);

-- Не больше 40 публикаций на человека
DROP POLICY IF EXISTS "community addons add" ON public.community_addons;
CREATE POLICY "community addons add" ON public.community_addons
FOR INSERT TO authenticated
WITH CHECK (
  author = auth.uid()
  AND (SELECT count(*) FROM public.community_addons c WHERE c.author = auth.uid()) < 40
);

DROP POLICY IF EXISTS "community addons update" ON public.community_addons;
CREATE POLICY "community addons update" ON public.community_addons
FOR UPDATE TO authenticated USING (author = auth.uid()) WITH CHECK (author = auth.uid());

DROP POLICY IF EXISTS "community addons delete" ON public.community_addons;
CREATE POLICY "community addons delete" ON public.community_addons
FOR DELETE TO authenticated USING (author = auth.uid());

-- +1 к счётчику установок. Свои установки не считаются.
CREATE OR REPLACE FUNCTION public.community_addon_installed(addon_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_addons
  SET installs = installs + 1
  WHERE id = addon_id AND author <> auth.uid() AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.community_addon_installed(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_addon_installed(UUID) TO authenticated;

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='community_addons' ORDER BY 1;
