-- Полная синхронизация устройств: настройки, свои фоны, напоминания, ответы, рекорды и т.п. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Одна строка = один небольшой кусочек данных (например, одно быстрое напоминание или один свой фон).
-- Новее считается тот, у кого позже время правки (ts). Старая правка с отключённого устройства не затирает свежую:
-- это проверяет функция sync_put_many. Удалённое помечается deleted = true, чтобы удаление дошло до других устройств.
-- Видит и меняет строки только их владелец.

CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
  value JSONB,
  ts BIGINT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key),
  CONSTRAINT user_sync_size CHECK (value IS NULL OR pg_column_size(value) <= 1500000)
);

CREATE INDEX IF NOT EXISTS idx_user_sync_updated ON public.user_sync (user_id, updated_at);

ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_sync FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sync TO authenticated;

DROP POLICY IF EXISTS "user sync own" ON public.user_sync;
CREATE POLICY "user sync own" ON public.user_sync
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Пачка правок за один запрос; применяются только те, что новее лежащих в базе. Возвращает, сколько принято.
CREATE OR REPLACE FUNCTION public.sync_put_many(items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  it JSONB;
  n INTEGER := 0;
  c INTEGER;
  del BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF jsonb_typeof(items) <> 'array' OR jsonb_array_length(items) > 200 THEN RAISE EXCEPTION 'bad items'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    del := COALESCE((it->>'deleted')::boolean, false);
    INSERT INTO public.user_sync AS u (user_id, key, value, ts, deleted, updated_at)
    VALUES (auth.uid(), it->>'key', CASE WHEN del THEN NULL ELSE it->'value' END, (it->>'ts')::bigint, del, now())
    ON CONFLICT (user_id, key) DO UPDATE
      SET value = EXCLUDED.value, ts = EXCLUDED.ts, deleted = EXCLUDED.deleted, updated_at = now()
      WHERE u.ts < EXCLUDED.ts;
    GET DIAGNOSTICS c = ROW_COUNT;
    n := n + c;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.sync_put_many(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_put_many(JSONB) TO authenticated;

-- Чтобы изменения приходили на другие устройства сразу, а не при следующем открытии
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_sync') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sync;
  END IF;
END $$;

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='user_sync';
-- SELECT proname FROM pg_proc WHERE proname='sync_put_many';
