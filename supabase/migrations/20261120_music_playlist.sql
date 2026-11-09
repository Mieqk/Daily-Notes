-- Плейлист в профиле и треки на стене. Выполнять в Supabase -> SQL Editor. Можно запускать повторно.
-- Требует are_friends() (20261028_shared_buddy_challenges.sql) и стенку (20261119_profile_wall.sql).
--
-- Плейлист: до 50 треков (название, исполнитель, ссылка). Видят хозяин и его друзья, менять может только хозяин.
-- Стенка: пост теперь может быть не только картинкой, но и треком (track_title, track_artist, track_url).

CREATE TABLE IF NOT EXISTS public.profile_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  artist TEXT CHECK (artist IS NULL OR char_length(artist) <= 80),
  url TEXT CHECK (url IS NULL OR (char_length(url) <= 300 AND url ~ '^https://')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_tracks_user_idx ON public.profile_tracks (user_id, created_at);

CREATE OR REPLACE FUNCTION public._profile_tracks_limit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.profile_tracks WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'playlist is full (50 tracks)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profile_tracks_limit ON public.profile_tracks;
CREATE TRIGGER profile_tracks_limit BEFORE INSERT ON public.profile_tracks FOR EACH ROW EXECUTE FUNCTION public._profile_tracks_limit();

ALTER TABLE public.profile_tracks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.profile_tracks TO authenticated;

DROP POLICY IF EXISTS "tracks select" ON public.profile_tracks;
CREATE POLICY "tracks select" ON public.profile_tracks
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "tracks insert own" ON public.profile_tracks;
CREATE POLICY "tracks insert own" ON public.profile_tracks
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tracks delete own" ON public.profile_tracks;
CREATE POLICY "tracks delete own" ON public.profile_tracks
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Стенка: пост-трек
ALTER TABLE public.wall_posts ALTER COLUMN media_path DROP NOT NULL;
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS track_title TEXT;
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS track_artist TEXT;
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS track_url TEXT;
ALTER TABLE public.wall_posts DROP CONSTRAINT IF EXISTS wall_posts_content_check;
ALTER TABLE public.wall_posts ADD CONSTRAINT wall_posts_content_check CHECK (
  (media_path IS NOT NULL AND track_title IS NULL)
  OR (media_path IS NULL AND char_length(track_title) BETWEEN 1 AND 80
      AND (track_artist IS NULL OR char_length(track_artist) <= 80)
      AND (track_url IS NULL OR (char_length(track_url) <= 300 AND track_url ~ '^https://')))
);

DROP POLICY IF EXISTS "wall insert own" ON public.wall_posts;
CREATE POLICY "wall insert own" ON public.wall_posts
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (media_path IS NULL OR media_path LIKE auth.uid()::text || '/%'));

-- Проверка:
-- SELECT to_regclass('public.profile_tracks');
-- SELECT column_name FROM information_schema.columns WHERE table_name='wall_posts' AND column_name LIKE 'track_%';
