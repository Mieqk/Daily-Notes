-- Обложки и превью треков. Выполнять в Supabase -> SQL Editor. Можно запускать повторно.
-- Требует 20261119_now_playing.sql и 20261120_music_playlist.sql.
--
-- Обложка (cover) и 30-секундное превью (preview) приходят из поиска трека. Это только https-ссылки,
-- приложение дополнительно пропускает лишь адреса Apple (mzstatic.com, apple.com) и YouTube (ytimg.com).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_cover TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_preview TEXT;
ALTER TABLE public.profile_tracks ADD COLUMN IF NOT EXISTS cover TEXT;
ALTER TABLE public.profile_tracks ADD COLUMN IF NOT EXISTS preview TEXT;
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS track_cover TEXT;
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS track_preview TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_music_media_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_music_media_check CHECK (
  (music_cover IS NULL OR (char_length(music_cover) <= 300 AND music_cover ~ '^https://'))
  AND (music_preview IS NULL OR (char_length(music_preview) <= 300 AND music_preview ~ '^https://'))
);
ALTER TABLE public.profile_tracks DROP CONSTRAINT IF EXISTS profile_tracks_media_check;
ALTER TABLE public.profile_tracks ADD CONSTRAINT profile_tracks_media_check CHECK (
  (cover IS NULL OR (char_length(cover) <= 300 AND cover ~ '^https://'))
  AND (preview IS NULL OR (char_length(preview) <= 300 AND preview ~ '^https://'))
);
ALTER TABLE public.wall_posts DROP CONSTRAINT IF EXISTS wall_posts_track_media_check;
ALTER TABLE public.wall_posts ADD CONSTRAINT wall_posts_track_media_check CHECK (
  (track_cover IS NULL OR (char_length(track_cover) <= 300 AND track_cover ~ '^https://'))
  AND (track_preview IS NULL OR (char_length(track_preview) <= 300 AND track_preview ~ '^https://'))
);

-- Набор колонок меняется, поэтому функцию пересоздаём
DROP FUNCTION IF EXISTS public.get_public_profiles(UUID[]);
CREATE FUNCTION public.get_public_profiles(ids UUID[])
RETURNS TABLE (
  id UUID, display_name TEXT, avatar TEXT, avatar_url TEXT, banner_url TEXT,
  bio TEXT, friend_code TEXT, status_emoji TEXT, status_text TEXT,
  presence_state TEXT, last_seen_at TIMESTAMPTZ,
  music_title TEXT, music_artist TEXT, music_url TEXT, music_at TIMESTAMPTZ,
  music_cover TEXT, music_preview TEXT
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
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_at END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_cover END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'music', 'friends') <> 'nobody' AND p.music_at > now() - interval '1 day') THEN p.music_preview END
  FROM public.profiles p
  CROSS JOIN LATERAL (SELECT public._profile_relation(p.id) AS rel) r
  WHERE p.id = ANY(ids) AND r.rel IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) TO authenticated;

-- Проверка:
-- SELECT column_name FROM information_schema.columns WHERE table_name IN ('profiles','profile_tracks','wall_posts') AND column_name ~ 'cover|preview';
