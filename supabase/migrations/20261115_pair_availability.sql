-- Парное: быстрая отметка «занят(а) / свободен(на) вечером / свободен(на) весь день».
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует pair_links из 20261111_pair_together.sql.
--
-- Одна строка на человека и день. Видят и меняют только двое из пары (своё меняет только владелец).
-- Комментарий необязательный и короткий.

CREATE TABLE IF NOT EXISTS public.pair_availability (
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('busy', 'evening', 'free')),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 40),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id, day)
);
ALTER TABLE public.pair_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_availability FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_availability TO authenticated;

DROP POLICY IF EXISTS "pair avail read" ON public.pair_availability;
CREATE POLICY "pair avail read" ON public.pair_availability
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair avail add" ON public.pair_availability;
CREATE POLICY "pair avail add" ON public.pair_availability
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 14
  AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair avail update own" ON public.pair_availability;
CREATE POLICY "pair avail update own" ON public.pair_availability
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 14);

DROP POLICY IF EXISTS "pair avail delete own" ON public.pair_availability;
CREATE POLICY "pair avail delete own" ON public.pair_availability
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='pair_availability' ORDER BY 1;
