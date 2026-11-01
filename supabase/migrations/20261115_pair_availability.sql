-- Парное: «свободно / занято» по дням, чтобы видеть, когда вы можете побыть вместе.
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует pair_links из 20261111_pair_together.sql.
--
-- В базе только статус дня (свободно или занято), без причин и подробностей.
-- Видят отметки оба участника пары, менять и удалять свои может только их автор.

CREATE TABLE IF NOT EXISTS public.pair_availability (
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('free', 'busy')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id, day)
);
ALTER TABLE public.pair_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_availability FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_availability TO authenticated;

-- Подзапросы к pair_links идут через её RLS: доступ есть только у участников пары
DROP POLICY IF EXISTS "pair availability read" ON public.pair_availability;
CREATE POLICY "pair availability read" ON public.pair_availability
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

-- Окно с запасом на часовые пояса: от вчера до месяца вперёд
DROP POLICY IF EXISTS "pair availability add" ON public.pair_availability;
CREATE POLICY "pair availability add" ON public.pair_availability
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 2 AND current_date + 30
  AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair availability update own" ON public.pair_availability;
CREATE POLICY "pair availability update own" ON public.pair_availability
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 2 AND current_date + 30);

DROP POLICY IF EXISTS "pair availability delete own" ON public.pair_availability;
CREATE POLICY "pair availability delete own" ON public.pair_availability
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='pair_availability' ORDER BY 1;
