-- Звонки между друзьями (WebRTC): сигналы «звоню / ответил / отбой» и сетевые данные. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует are_friends() из 20261028_shared_buddy_challenges.sql.
--
-- Сам звук и видео идут напрямую между телефонами и в базу не попадают. Здесь лежат только короткие служебные
-- сообщения, которые приложение удаляет по окончании звонка. Видят их только двое участников и только пока они друзья.

CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  sender UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('invite', 'accept', 'decline', 'busy', 'offer', 'answer', 'ice', 'hangup')),
  video BOOLEAN NOT NULL DEFAULT false,
  payload JSONB CHECK (payload IS NULL OR pg_column_size(payload) <= 8192),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pushed_at TIMESTAMPTZ,
  CHECK (sender <> recipient)
);
CREATE INDEX IF NOT EXISTS call_signals_inbox_idx ON public.call_signals (recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS call_signals_sender_idx ON public.call_signals (sender, created_at DESC);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.call_signals FROM anon, authenticated;
GRANT SELECT, DELETE ON public.call_signals TO authenticated;
GRANT INSERT (call_id, sender, recipient, kind, video, payload) ON public.call_signals TO authenticated;

DROP POLICY IF EXISTS "call signals read" ON public.call_signals;
CREATE POLICY "call signals read" ON public.call_signals
FOR SELECT TO authenticated
USING ((sender = auth.uid() OR recipient = auth.uid()) AND public.are_friends(sender, recipient));

DROP POLICY IF EXISTS "call signals send" ON public.call_signals;
CREATE POLICY "call signals send" ON public.call_signals
FOR INSERT TO authenticated
WITH CHECK (sender = auth.uid() AND public.are_friends(sender, recipient));

DROP POLICY IF EXISTS "call signals delete own" ON public.call_signals;
CREATE POLICY "call signals delete own" ON public.call_signals
FOR DELETE TO authenticated USING (sender = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
  END IF;
END $$;

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='call_signals' ORDER BY 1;
