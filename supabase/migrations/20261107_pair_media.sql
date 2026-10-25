-- Фото, видео и голос в парных разделах и в чате. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует 20261105_friend_chat.sql (хранилище chat-media)
-- и are_friends(), is_challenge_member() из 20261028_shared_buddy_challenges.sql.
--
-- Файлы лежат в закрытом хранилище chat-media: <автор>/<друг>/<файл> для пар и <автор>/ch-<id челленджа>/<файл>
-- для челленджей. Видят файл автор, его друг (пока они друзья) или участники челленджа.

-- 1. Аудио в разрешённых типах и в сообщениях чата
UPDATE storage.buckets SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav'
] WHERE id = 'chat-media';

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_media_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_media_type_check CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));

-- 2. Вложение к воспоминаниям, записям, отметкам и ночам
ALTER TABLE public.shared_memories ADD COLUMN IF NOT EXISTS media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 200);
ALTER TABLE public.shared_memories ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));
ALTER TABLE public.shared_entries ADD COLUMN IF NOT EXISTS media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 200);
ALTER TABLE public.shared_entries ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));
ALTER TABLE public.buddy_checkins ADD COLUMN IF NOT EXISTS media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 200);
ALTER TABLE public.buddy_checkins ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));
ALTER TABLE public.challenge_checkins ADD COLUMN IF NOT EXISTS media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 200);
ALTER TABLE public.challenge_checkins ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));
ALTER TABLE public.sleep_party_nights ADD COLUMN IF NOT EXISTS media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 200);
ALTER TABLE public.sleep_party_nights ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));

-- 3. Доступ к файлам: пары друзей и участники челленджей
DROP POLICY IF EXISTS "chat media upload" ON storage.objects;
CREATE POLICY "chat media upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND CASE
    WHEN (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.are_friends(auth.uid(), ((storage.foldername(name))[2])::uuid)
    WHEN (storage.foldername(name))[2] ~ '^ch-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_challenge_member(substr((storage.foldername(name))[2], 4)::uuid)
    ELSE false
  END
);

DROP POLICY IF EXISTS "chat media read" ON storage.objects;
CREATE POLICY "chat media read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR CASE
      WHEN (storage.foldername(name))[2] = auth.uid()::text
        AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN public.are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
      WHEN (storage.foldername(name))[2] ~ '^ch-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN public.is_challenge_member(substr((storage.foldername(name))[2], 4)::uuid)
      ELSE false
    END
  )
);

-- Проверка:
-- SELECT allowed_mime_types FROM storage.buckets WHERE id = 'chat-media';
-- SELECT table_name FROM information_schema.columns WHERE column_name = 'media_path' AND table_schema = 'public' ORDER BY 1;
