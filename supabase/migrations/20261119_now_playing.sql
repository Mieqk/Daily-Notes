-- Музыка «сейчас играет» в профиле. Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует 20261106_presence.sql (там создана get_public_profiles).
--
-- Человек сам выбирает трек (название, исполнитель, по желанию ссылка). Друзья видят его в профиле и в списке друзей.
-- Скрыть можно в приватности профиля (privacy->>'music' = 'nobody'). Трек старше суток друзьям не показывается.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_artist TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_music_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_music_check CHECK (
  char_length(music_title) <= 80 AND char_length(music_artist) <= 80
  AND (music_url IS NULL OR (char_length(music_url) <= 300 AND music_url ~ '^https://'))
);

-- Набор колонок меняется, поэтому функцию пересоздаём
DROP FUNCTION IF EXISTS public.get_public_profiles(UUID[]);
CREATE FUNCTION public.get_public_profiles(ids UUID[])
RETURNS TABLE (
  id UUID, display_name TEXT, avatar TEXT, avatar_url TEXT, banner_url TEXT,
  bio TEXT, friend_code TEXT, status_emoji TEXT, status_text TEXT,
  presence_state TEXT, last_seen_at TIMESTAMPTZ,
  music_title TEXT, music_artist TEXT, music_url TEXT, music_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar, p.avatar_url,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'banner', 'friends') <> 'nobody') THEN p.banner_url END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'bio', 'friends') <> 'nobody') THEN p.bio END,
    p.friend_code,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'status', 'friends') <> 'nobody') THEN p.status_emoji END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'status', 'friends') <> 'nobody') THEN p.status_text END,
    CASE
      WHEN r.rel NOT IN ('self', 'friend') THEN NULL
      WHEN r.rel = 'friend' AND p.presence_mode = 'hidden' THEN 'offline'
      WHEN p.last_seen_at IS NULL OR p.last_seen_at < now() - interval '2 minutes' THEN 'offline'
      WHEN p.presence_mode = 'dnd' THEN 'dnd'
      WHEN p.presence_mode = 'away' OR p.presence_idle THEN 'away'
      ELSE 'online'
    END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND p.presence_mode <> 'hidden') THEN p.last_seen_at END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_title END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_artist END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_url END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_at END
  FROM public.profiles p
  CROSS JOIN LATERAL (SELECT public._profile_relation(p.id) AS rel) r
  WHERE p.id = ANY(ids) AND r.rel IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) TO authenticated;

-- Проверка:
-- SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name LIKE 'music_%';
