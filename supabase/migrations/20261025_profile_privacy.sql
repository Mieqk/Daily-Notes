-- Приватность профиля. Выполнять в Supabase -> SQL Editor после деплоя приложения.
-- Скрипт можно запускать повторно.
--
-- Правила:
--  * Имя и аватар видят все, кто нашёл вас по коду или отправил/получил заявку (для ясности, кто это).
--  * Статус, «о себе» и баннер видят только друзья и только если вы их не закрыли.
--  * Чужие строки таблицы profiles напрямую больше не читаются: только через функции ниже.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Кем вызывающий приходится владельцу профиля: self | friend | pending | NULL
CREATE OR REPLACE FUNCTION public._profile_relation(target UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN target = auth.uid() THEN 'self'
    WHEN EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.user_a = auth.uid() AND f.user_b = target) OR (f.user_b = auth.uid() AND f.user_a = target))
    ) THEN 'friend'
    WHEN EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.user_a = auth.uid() AND f.user_b = target) OR (f.user_b = auth.uid() AND f.user_a = target)
    ) THEN 'pending'
    ELSE NULL
  END;
$$;
REVOKE ALL ON FUNCTION public._profile_relation(UUID) FROM PUBLIC, anon, authenticated;

-- Профили с учётом приватности
CREATE OR REPLACE FUNCTION public.get_public_profiles(ids UUID[])
RETURNS TABLE (
  id UUID, display_name TEXT, avatar TEXT, avatar_url TEXT, banner_url TEXT,
  bio TEXT, friend_code TEXT, status_emoji TEXT, status_text TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar, p.avatar_url,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'banner', 'friends') <> 'nobody') THEN p.banner_url END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'bio', 'friends') <> 'nobody') THEN p.bio END,
    p.friend_code,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'status', 'friends') <> 'nobody') THEN p.status_emoji END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'status', 'friends') <> 'nobody') THEN p.status_text END
  FROM public.profiles p
  CROSS JOIN LATERAL (SELECT public._profile_relation(p.id) AS rel) r
  WHERE p.id = ANY(ids) AND r.rel IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) TO authenticated;

-- Поиск по коду: только то, что нужно, чтобы понять, кто это
CREATE OR REPLACE FUNCTION public.find_profile_by_code(code TEXT)
RETURNS TABLE (
  id UUID, display_name TEXT, avatar TEXT, avatar_url TEXT, banner_url TEXT,
  bio TEXT, friend_code TEXT, status_emoji TEXT, status_text TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar, p.avatar_url,
         NULL::TEXT, NULL::TEXT, p.friend_code, NULL::TEXT, NULL::TEXT
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.friend_code = upper(trim(code))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_profile_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_code(TEXT) TO authenticated;

-- Напрямую читается только своя строка
DROP POLICY IF EXISTS "profiles select related" ON public.profiles;
DROP POLICY IF EXISTS "profiles select own" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='profiles';
-- Ожидается одна политика SELECT: «profiles select own» (и «Users can view own profile», если вы её не удаляли).
