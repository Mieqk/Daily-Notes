-- Общее растение пары: каждый поливает раз в день, растение растёт от вашего ухода.
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует pair_links из 20261111_pair_together.sql.
--
-- В базе только отметки «полил(а) в такой-то день»; стадия растения считается в приложении.
-- Видят и меняют отметки только двое участников пары.

CREATE TABLE IF NOT EXISTS public.pair_plant_care (
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id, day)
);
ALTER TABLE public.pair_plant_care ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_plant_care FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_plant_care TO authenticated;

-- Подзапросы к pair_links идут через её RLS: доступ есть только у участников пары
DROP POLICY IF EXISTS "pair plant read" ON public.pair_plant_care;
CREATE POLICY "pair plant read" ON public.pair_plant_care
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair plant add" ON public.pair_plant_care;
CREATE POLICY "pair plant add" ON public.pair_plant_care
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair plant delete own" ON public.pair_plant_care;
CREATE POLICY "pair plant delete own" ON public.pair_plant_care
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename = 'pair_plant_care' ORDER BY 2;
