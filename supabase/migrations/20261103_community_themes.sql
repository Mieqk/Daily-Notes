-- Галерея тем от сообщества: пользователи выкладывают свои темы, другие ставят их в один клик.
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
--
-- В теме хранятся только настройки оформления (цвета #rrggbb, выбор шрифта, скругления и т. п.),
-- никакого CSS или ссылок: приложение само проверяет каждое поле перед применением.
-- Видят галерею все вошедшие пользователи. Менять и удалять тему может только её автор.

CREATE TABLE IF NOT EXISTS public.community_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '' CHECK (char_length(author_name) <= 40),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 200),
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) <= 8000),
  installs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_themes_popular_idx ON public.community_themes (installs DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_themes_author_idx ON public.community_themes (author);

ALTER TABLE public.community_themes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_themes FROM anon;
GRANT SELECT, DELETE ON public.community_themes TO authenticated;
-- Счётчик установок и автора напрямую менять нельзя
GRANT INSERT (author_name, name, description, data) ON public.community_themes TO authenticated;
GRANT UPDATE (author_name, name, description, data, updated_at) ON public.community_themes TO authenticated;

DROP POLICY IF EXISTS "community themes read" ON public.community_themes;
CREATE POLICY "community themes read" ON public.community_themes
FOR SELECT TO authenticated USING (true);

-- Не больше 20 тем на человека, чтобы галерею не завалили
DROP POLICY IF EXISTS "community themes add" ON public.community_themes;
CREATE POLICY "community themes add" ON public.community_themes
FOR INSERT TO authenticated
WITH CHECK (
  author = auth.uid()
  AND (SELECT count(*) FROM public.community_themes c WHERE c.author = auth.uid()) < 20
);

DROP POLICY IF EXISTS "community themes update" ON public.community_themes;
CREATE POLICY "community themes update" ON public.community_themes
FOR UPDATE TO authenticated USING (author = auth.uid()) WITH CHECK (author = auth.uid());

DROP POLICY IF EXISTS "community themes delete" ON public.community_themes;
CREATE POLICY "community themes delete" ON public.community_themes
FOR DELETE TO authenticated USING (author = auth.uid());

-- +1 к счётчику установок. Свои установки не считаются.
CREATE OR REPLACE FUNCTION public.community_theme_installed(theme_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_themes
  SET installs = installs + 1
  WHERE id = theme_id AND author <> auth.uid() AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.community_theme_installed(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_theme_installed(UUID) TO authenticated;

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='community_themes' ORDER BY 1;
