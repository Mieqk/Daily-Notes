-- Разрешает хозяину обновлять свои треки в плейлисте: так приложение дописывает обложку и превью
-- к трекам, добавленным раньше. Выполнять в Supabase -> SQL Editor. Можно запускать повторно.
-- Требует 20261120_music_playlist.sql и 20261121_music_covers.sql.

GRANT UPDATE (cover, preview) ON public.profile_tracks TO authenticated;

DROP POLICY IF EXISTS "tracks update own" ON public.profile_tracks;
CREATE POLICY "tracks update own" ON public.profile_tracks
FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profile_tracks' ORDER BY 1;
