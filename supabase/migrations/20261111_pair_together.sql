-- Парное: настроение, общие цели, обратный отсчёт и «Доброе утро / Спокойной ночи».
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует are_friends() из 20261028_shared_buddy_challenges.sql.
--
-- pair_links - «пара» двух друзей (одна строка на двоих, не зависит от Sleep Party).
-- Всё остальное привязано к паре, и видят/меняют это только двое участников.
-- Настроение попадает сюда только по явному согласию: человек сам включает «делиться»,
-- в базу уходит лишь оценка 0-4 за день (без текста записи, тегов и фото).

CREATE TABLE IF NOT EXISTS public.pair_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b), -- порядок фиксирован, поэтому у пары ровно одна строка
  UNIQUE (user_a, user_b)
);
ALTER TABLE public.pair_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_links FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_links TO authenticated;

DROP POLICY IF EXISTS "pair links read" ON public.pair_links;
CREATE POLICY "pair links read" ON public.pair_links
FOR SELECT TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "pair links add" ON public.pair_links;
CREATE POLICY "pair links add" ON public.pair_links
FOR INSERT TO authenticated
WITH CHECK ((user_a = auth.uid() OR user_b = auth.uid()) AND public.are_friends(user_a, user_b));

DROP POLICY IF EXISTS "pair links delete" ON public.pair_links;
CREATE POLICY "pair links delete" ON public.pair_links
FOR DELETE TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());

-- Настроение за день (только то, чем человек решил поделиться)
CREATE TABLE IF NOT EXISTS public.pair_moods (
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 0 AND 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id, day)
);
ALTER TABLE public.pair_moods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_moods FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_moods TO authenticated;

DROP POLICY IF EXISTS "pair moods read" ON public.pair_moods;
CREATE POLICY "pair moods read" ON public.pair_moods
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair moods add" ON public.pair_moods;
CREATE POLICY "pair moods add" ON public.pair_moods
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 14 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair moods update own" ON public.pair_moods;
CREATE POLICY "pair moods update own" ON public.pair_moods
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 14 AND current_date + 1);

DROP POLICY IF EXISTS "pair moods delete own" ON public.pair_moods;
CREATE POLICY "pair moods delete own" ON public.pair_moods
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Общие цели: название, сколько раз нужно (target) и отметки каждого
CREATE TABLE IF NOT EXISTS public.pair_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  target SMALLINT NOT NULL DEFAULT 1 CHECK (target BETWEEN 1 AND 100),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pair_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_goals FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_goals TO authenticated;

DROP POLICY IF EXISTS "pair goals read" ON public.pair_goals;
CREATE POLICY "pair goals read" ON public.pair_goals
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair goals add" ON public.pair_goals;
CREATE POLICY "pair goals add" ON public.pair_goals
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair goals delete" ON public.pair_goals;
CREATE POLICY "pair goals delete" ON public.pair_goals
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

-- Отметка: один человек - одна отметка в день на цель
CREATE TABLE IF NOT EXISTS public.pair_goal_marks (
  goal_id UUID NOT NULL REFERENCES public.pair_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (goal_id, user_id, day)
);
ALTER TABLE public.pair_goal_marks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_goal_marks FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_goal_marks TO authenticated;

DROP POLICY IF EXISTS "pair marks read" ON public.pair_goal_marks;
CREATE POLICY "pair marks read" ON public.pair_goal_marks
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_goals g WHERE g.id = goal_id));

DROP POLICY IF EXISTS "pair marks add" ON public.pair_goal_marks;
CREATE POLICY "pair marks add" ON public.pair_goal_marks
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.pair_goals g WHERE g.id = goal_id));

DROP POLICY IF EXISTS "pair marks delete own" ON public.pair_goal_marks;
CREATE POLICY "pair marks delete own" ON public.pair_goal_marks
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- События для обратного отсчёта (встреча, поездка, годовщина)
CREATE TABLE IF NOT EXISTS public.pair_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  emoji TEXT NOT NULL DEFAULT '💞' CHECK (char_length(emoji) <= 8),
  starts_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pair_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_events FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_events TO authenticated;

DROP POLICY IF EXISTS "pair events read" ON public.pair_events;
CREATE POLICY "pair events read" ON public.pair_events
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair events add" ON public.pair_events;
CREATE POLICY "pair events add" ON public.pair_events
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair events delete" ON public.pair_events;
CREATE POLICY "pair events delete" ON public.pair_events
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

-- «Доброе утро / Спокойной ночи / Думаю о тебе» одним касанием: раз в день каждого вида
CREATE TABLE IF NOT EXISTS public.pair_touches (
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  sender UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('goodmorning', 'goodnight', 'thinking')),
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, sender, kind, day)
);
ALTER TABLE public.pair_touches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_touches FROM anon;
GRANT SELECT, INSERT, DELETE ON public.pair_touches TO authenticated;

DROP POLICY IF EXISTS "pair touches read" ON public.pair_touches;
CREATE POLICY "pair touches read" ON public.pair_touches
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair touches add" ON public.pair_touches;
CREATE POLICY "pair touches add" ON public.pair_touches
FOR INSERT TO authenticated
WITH CHECK (sender = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair touches delete own" ON public.pair_touches;
CREATE POLICY "pair touches delete own" ON public.pair_touches
FOR DELETE TO authenticated USING (sender = auth.uid());

-- Проверка:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public'
--  AND tablename IN ('pair_links','pair_moods','pair_goals','pair_goal_marks','pair_events','pair_touches') ORDER BY 1,2;
