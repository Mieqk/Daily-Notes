-- Общий плейлист в «Парном»: оба из пары добавляют песни, слушать и убирать могут оба.
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует pair_links из 20261111_pair_together.sql и колонок cover/preview из 20261121_music_covers.sql.
--
-- Песня: название, исполнитель, ссылка, обложка и превью (те же https-ссылки, что в плейлисте профиля).
-- Видят и меняют только двое из пары. В общем плейлисте не больше 100 песен.

CREATE TABLE IF NOT EXISTS public.pair_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  artist TEXT CHECK (artist IS NULL OR char_length(artist) <= 80),
  url TEXT CHECK (url IS NULL OR (char_length(url) <= 300 AND url ~ '^https://')),
  cover TEXT CHECK (cover IS NULL OR (char_length(cover) <= 300 AND cover ~ '^https://')),
  preview TEXT CHECK (preview IS NULL OR (char_length(preview) <= 300 AND preview ~ '^https://')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pair_tracks_link_idx ON public.pair_tracks (link_id, created_at);

CREATE OR REPLACE FUNCTION public._pair_tracks_limit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.pair_tracks WHERE link_id = NEW.link_id) >= 100 THEN
    RAISE EXCEPTION 'pair playlist is full (100 tracks)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pair_tracks_limit ON public.pair_tracks;
CREATE TRIGGER pair_tracks_limit BEFORE INSERT ON public.pair_tracks FOR EACH ROW EXECUTE FUNCTION public._pair_tracks_limit();

ALTER TABLE public.pair_tracks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_tracks FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_tracks TO authenticated;

-- pair_links видят только двое из пары, поэтому проверка EXISTS пропускает только их
DROP POLICY IF EXISTS "pair tracks read" ON public.pair_tracks;
CREATE POLICY "pair tracks read" ON public.pair_tracks
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair tracks add" ON public.pair_tracks;
CREATE POLICY "pair tracks add" ON public.pair_tracks
FOR INSERT TO authenticated
WITH CHECK (added_by = auth.uid() AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair tracks delete" ON public.pair_tracks;
CREATE POLICY "pair tracks delete" ON public.pair_tracks
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

-- Проверка:
-- SELECT to_regclass('public.pair_tracks');
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='pair_tracks' ORDER BY 1;
