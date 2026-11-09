-- Стенка в профиле: хозяин профиля выкладывает картинки с подписью, друзья смотрят.
-- Выполнять в Supabase -> SQL Editor. Можно запускать повторно.
-- Требует are_friends() из 20261028_shared_buddy_challenges.sql.
--
-- Картинки лежат в закрытом хранилище wall-media: <хозяин>/<файл>. Видят хозяин и его друзья (пока они друзья).
-- Добавлять и удалять посты может только хозяин.

CREATE TABLE IF NOT EXISTS public.wall_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 300),
  media_path TEXT NOT NULL CHECK (char_length(media_path) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_posts_user_idx ON public.wall_posts (user_id, created_at DESC);

ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.wall_posts TO authenticated;

DROP POLICY IF EXISTS "wall select" ON public.wall_posts;
CREATE POLICY "wall select" ON public.wall_posts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "wall insert own" ON public.wall_posts;
CREATE POLICY "wall insert own" ON public.wall_posts
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND media_path LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "wall delete own" ON public.wall_posts;
CREATE POLICY "wall delete own" ON public.wall_posts
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Хранилище: закрытое, до 8 МБ на файл, только картинки
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wall-media', 'wall-media', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "wall media upload" ON storage.objects;
CREATE POLICY "wall media upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wall-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "wall media read" ON storage.objects;
CREATE POLICY "wall media read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'wall-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "wall media delete" ON storage.objects;
CREATE POLICY "wall media delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'wall-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'wall_posts' ORDER BY 1;
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'wall-media';
