-- Укрепление доступа для БОЕВОЙ схемы проекта (таблицы entries/tasks/sleep_logs с date TEXT).
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- НЕ запускайте supabase/schema.sql на уже работающей базе: схемы различаются.

-- ============ 1. Друзья: убираем возможность навязать дружбу ============
-- Было: INSERT проверял только sender = auth.uid(), поэтому можно было
--   (а) вставить сразу status = 'accepted' и получить чтение чужого профиля,
--   (б) создать заявку между двумя другими людьми.
-- Было: UPDATE мог выполнить и отправитель, то есть принять свою же заявку.
DROP POLICY IF EXISTS "friendships insert own" ON public.friendships;
CREATE POLICY "friendships insert own" ON public.friendships
FOR INSERT TO authenticated
WITH CHECK (
  sender = auth.uid()
  AND status = 'pending'
  AND (user_a = auth.uid() OR user_b = auth.uid())
);

DROP POLICY IF EXISTS "friendships update own" ON public.friendships;
CREATE POLICY "friendships update own" ON public.friendships
FOR UPDATE TO authenticated
USING ((user_a = auth.uid() OR user_b = auth.uid()) AND sender <> auth.uid())
WITH CHECK ((user_a = auth.uid() OR user_b = auth.uid()) AND sender <> auth.uid());

-- Ограничения на новые строки (NOT VALID: старые строки не проверяются и не ломают запуск)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friendships_status_check') THEN
    ALTER TABLE public.friendships ADD CONSTRAINT friendships_status_check
      CHECK (status IN ('pending', 'accepted')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friendships_order_check') THEN
    ALTER TABLE public.friendships ADD CONSTRAINT friendships_order_check
      CHECK (user_a < user_b) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friendships_sender_check') THEN
    ALTER TABLE public.friendships ADD CONSTRAINT friendships_sender_check
      CHECK (sender = user_a OR sender = user_b) NOT VALID;
  END IF;
END $$;

-- ============ 2. Профили: чужие строки целиком больше не читаются ============
-- Было: friend_code IS NOT NULL давало любому вошедшему читать ВСЕ профили (включая settings).
-- Внимание: в старой политике «f.user_b = id» внутри подзапроса означало f.id, то есть
-- проверка друзей не работала и держалась только на friend_code. Здесь везде profiles.id.
DROP POLICY IF EXISTS "profiles select open" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_friends_and_codes" ON public.profiles;
DROP POLICY IF EXISTS "profiles select related" ON public.profiles;
CREATE POLICY "profiles select related" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user_a = auth.uid() AND f.user_b = profiles.id)
       OR (f.user_b = auth.uid() AND f.user_a = profiles.id)
  )
);

-- Поиск друга по коду: только публичные поля, без settings
CREATE OR REPLACE FUNCTION public.find_profile_by_code(code TEXT)
RETURNS TABLE (
  id UUID, display_name TEXT, avatar TEXT, avatar_url TEXT, banner_url TEXT,
  bio TEXT, friend_code TEXT, status_emoji TEXT, status_text TEXT
) AS $$
  SELECT p.id, p.display_name, p.avatar, p.avatar_url, p.banner_url,
         p.bio, p.friend_code, p.status_emoji, p.status_text
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.friend_code = upper(trim(code))
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.find_profile_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_code(TEXT) TO authenticated;

-- ============ Проверка после запуска ============
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE schemaname = 'public' AND tablename IN ('profiles', 'friendships') ORDER BY 1, 2;
-- Ожидается: у profiles одна политика SELECT («profiles select related»), insert/update own;
-- у friendships строгие insert/update.
