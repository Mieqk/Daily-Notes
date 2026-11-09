-- Свои аудиофайлы в плейлисте: трек играет целиком в нашем плеере. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует 20261120_music_playlist.sql и are_friends() (20261028_shared_buddy_challenges.sql).
--
-- Файлы лежат в закрытом хранилище 'music-files', до 12 МБ каждый, только аудио. Слушать их может хозяин и его друзья.
-- В плейлисте можно держать не больше 10 своих файлов, чтобы не забивать место в хранилище.

ALTER TABLE public.profile_tracks ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE public.profile_tracks DROP CONSTRAINT IF EXISTS profile_tracks_audio_check;
ALTER TABLE public.profile_tracks ADD CONSTRAINT profile_tracks_audio_check CHECK (
  audio_path IS NULL OR (char_length(audio_path) <= 200 AND audio_path LIKE user_id::text || '/%')
);

CREATE OR REPLACE FUNCTION public._profile_tracks_audio_limit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.audio_path IS NOT NULL
     AND (SELECT count(*) FROM public.profile_tracks WHERE user_id = NEW.user_id AND audio_path IS NOT NULL) >= 10 THEN
    RAISE EXCEPTION 'too many uploaded tracks (10)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profile_tracks_audio_limit ON public.profile_tracks;
CREATE TRIGGER profile_tracks_audio_limit BEFORE INSERT ON public.profile_tracks FOR EACH ROW EXECUTE FUNCTION public._profile_tracks_audio_limit();

-- Хранилище: закрытое, до 12 МБ на файл, только аудио
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('music-files', 'music-files', false, 12582912,
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/flac'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "music files upload" ON storage.objects;
CREATE POLICY "music files upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'music-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "music files read" ON storage.objects;
CREATE POLICY "music files read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'music-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "music files delete" ON storage.objects;
CREATE POLICY "music files delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'music-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Проверка:
-- SELECT column_name FROM information_schema.columns WHERE table_name='profile_tracks' AND column_name='audio_path';
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'music-files';
