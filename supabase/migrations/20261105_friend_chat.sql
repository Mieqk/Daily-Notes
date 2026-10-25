-- Чат с друзьями: личные сообщения, фото и видео. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует are_friends() из 20261028_shared_buddy_challenges.sql.
--
-- Переписку видят только двое участников и только пока они друзья. Файлы лежат в закрытом
-- хранилище chat-media (папка = отправитель/получатель), приложение открывает их по временным ссылкам.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 2000),
  media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) <= 200),
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  CHECK (sender <> recipient),
  CHECK (body IS NOT NULL OR media_path IS NOT NULL),
  CHECK ((media_path IS NULL) = (media_type IS NULL)),
  -- вложение можно прикрепить только из своей папки «я/получатель/»
  CHECK (media_path IS NULL OR media_path LIKE sender::text || '/' || recipient::text || '/%')
);
CREATE INDEX IF NOT EXISTS chat_messages_pair_idx ON public.chat_messages (sender, recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_inbox_idx ON public.chat_messages (recipient, sender, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx ON public.chat_messages (recipient) WHERE read_at IS NULL;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_messages FROM anon;
REVOKE ALL ON public.chat_messages FROM authenticated;
GRANT SELECT, DELETE ON public.chat_messages TO authenticated;
-- клиент задаёт только эти поля; read_at ставит получатель, pushed_at только сервер
GRANT INSERT (sender, recipient, body, media_path, media_type) ON public.chat_messages TO authenticated;
GRANT UPDATE (read_at) ON public.chat_messages TO authenticated;

DROP POLICY IF EXISTS "chat read" ON public.chat_messages;
CREATE POLICY "chat read" ON public.chat_messages
FOR SELECT TO authenticated
USING ((sender = auth.uid() OR recipient = auth.uid()) AND public.are_friends(sender, recipient));

DROP POLICY IF EXISTS "chat send" ON public.chat_messages;
CREATE POLICY "chat send" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (sender = auth.uid() AND public.are_friends(sender, recipient));

-- Отметить прочитанным может только получатель
DROP POLICY IF EXISTS "chat mark read" ON public.chat_messages;
CREATE POLICY "chat mark read" ON public.chat_messages
FOR UPDATE TO authenticated
USING (recipient = auth.uid() AND public.are_friends(sender, recipient))
WITH CHECK (recipient = auth.uid());

-- Удалить можно только своё сообщение
DROP POLICY IF EXISTS "chat delete own" ON public.chat_messages;
CREATE POLICY "chat delete own" ON public.chat_messages
FOR DELETE TO authenticated USING (sender = auth.uid());

-- Сообщения приходят в реальном времени (Realtime уважает правила доступа выше)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- ============ Хранилище фото и видео ============
-- Закрытое, до 25 МБ на файл, только фото и видео. Путь: <отправитель>/<получатель>/<файл>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', false, 26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "chat media upload" ON storage.objects;
CREATE POLICY "chat media upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND CASE
    WHEN (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.are_friends(auth.uid(), ((storage.foldername(name))[2])::uuid)
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
      ELSE false
    END
  )
);

DROP POLICY IF EXISTS "chat media delete" ON storage.objects;
CREATE POLICY "chat media delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' ORDER BY 1;
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id='chat-media';
