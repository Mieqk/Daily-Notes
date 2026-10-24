-- Общие воспоминания, парные привычки и совместные челленджи. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Всё доступно только друзьям (принятые заявки) и только участникам.

-- Вспомогательная проверка дружбы
CREATE OR REPLACE FUNCTION public.are_friends(a UUID, b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_a = a AND f.user_b = b) OR (f.user_b = a AND f.user_a = b))
  );
$$;
REVOKE ALL ON FUNCTION public.are_friends(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;

-- ============ Общие воспоминания ============
CREATE TABLE IF NOT EXISTS public.shared_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  tag TEXT CHECK (tag IS NULL OR char_length(tag) BETWEEN 1 AND 24),
  memory_date DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (author <> friend)
);
ALTER TABLE public.shared_memories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shared_memories FROM anon;
GRANT SELECT, INSERT, DELETE ON public.shared_memories TO authenticated;

DROP POLICY IF EXISTS "memories read" ON public.shared_memories;
CREATE POLICY "memories read" ON public.shared_memories
FOR SELECT TO authenticated USING (author = auth.uid() OR friend = auth.uid());

DROP POLICY IF EXISTS "memories add" ON public.shared_memories;
CREATE POLICY "memories add" ON public.shared_memories
FOR INSERT TO authenticated
WITH CHECK (author = auth.uid() AND public.are_friends(author, friend));

DROP POLICY IF EXISTS "memories delete" ON public.shared_memories;
CREATE POLICY "memories delete" ON public.shared_memories
FOR DELETE TO authenticated USING (author = auth.uid() OR friend = auth.uid());

-- ============ Парные привычки ============
CREATE TABLE IF NOT EXISTS public.buddy_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (owner <> buddy)
);
ALTER TABLE public.buddy_habits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buddy_habits FROM anon;
GRANT SELECT, INSERT, DELETE ON public.buddy_habits TO authenticated;

DROP POLICY IF EXISTS "buddy habits read" ON public.buddy_habits;
CREATE POLICY "buddy habits read" ON public.buddy_habits
FOR SELECT TO authenticated USING (owner = auth.uid() OR buddy = auth.uid());

DROP POLICY IF EXISTS "buddy habits add" ON public.buddy_habits;
CREATE POLICY "buddy habits add" ON public.buddy_habits
FOR INSERT TO authenticated
WITH CHECK (owner = auth.uid() AND public.are_friends(owner, buddy));

DROP POLICY IF EXISTS "buddy habits delete" ON public.buddy_habits;
CREATE POLICY "buddy habits delete" ON public.buddy_habits
FOR DELETE TO authenticated USING (owner = auth.uid() OR buddy = auth.uid());

CREATE TABLE IF NOT EXISTS public.buddy_checkins (
  habit_id UUID NOT NULL REFERENCES public.buddy_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  PRIMARY KEY (habit_id, user_id, day)
);
ALTER TABLE public.buddy_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buddy_checkins FROM anon;
GRANT SELECT, INSERT, DELETE ON public.buddy_checkins TO authenticated;

-- Подзапрос к buddy_habits идёт через RLS: отметиться можно только в своей паре
DROP POLICY IF EXISTS "buddy checkins read" ON public.buddy_checkins;
CREATE POLICY "buddy checkins read" ON public.buddy_checkins
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.buddy_habits h WHERE h.id = habit_id));

DROP POLICY IF EXISTS "buddy checkins add" ON public.buddy_checkins;
CREATE POLICY "buddy checkins add" ON public.buddy_checkins
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND day BETWEEN current_date - 1 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.buddy_habits h WHERE h.id = habit_id)
);

DROP POLICY IF EXISTS "buddy checkins delete own" ON public.buddy_checkins;
CREATE POLICY "buddy checkins delete own" ON public.buddy_checkins
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ Совместные челленджи ============
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  goal_days INT NOT NULL CHECK (goal_days BETWEEN 3 AND 90),
  start_date DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.challenge_members (
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.challenge_checkins (
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  PRIMARY KEY (challenge_id, user_id, day)
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.challenges, public.challenge_members, public.challenge_checkins FROM anon;
GRANT SELECT, INSERT, DELETE ON public.challenges, public.challenge_members, public.challenge_checkins TO authenticated;

-- Участие проверяем функцией, чтобы политики не ссылались друг на друга рекурсивно
CREATE OR REPLACE FUNCTION public.is_challenge_member(cid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenge_members m WHERE m.challenge_id = cid AND m.user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_challenge_owner(cid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = cid AND c.owner = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_challenge_member(UUID), public.is_challenge_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_challenge_member(UUID), public.is_challenge_owner(UUID) TO authenticated;

DROP POLICY IF EXISTS "challenges read" ON public.challenges;
CREATE POLICY "challenges read" ON public.challenges
FOR SELECT TO authenticated USING (owner = auth.uid() OR public.is_challenge_member(id));

DROP POLICY IF EXISTS "challenges add" ON public.challenges;
CREATE POLICY "challenges add" ON public.challenges
FOR INSERT TO authenticated WITH CHECK (owner = auth.uid());

DROP POLICY IF EXISTS "challenges delete" ON public.challenges;
CREATE POLICY "challenges delete" ON public.challenges
FOR DELETE TO authenticated USING (owner = auth.uid());

DROP POLICY IF EXISTS "challenge members read" ON public.challenge_members;
CREATE POLICY "challenge members read" ON public.challenge_members
FOR SELECT TO authenticated USING (public.is_challenge_member(challenge_id) OR public.is_challenge_owner(challenge_id));

-- Добавлять участников может только создатель, и только друзей (или себя)
DROP POLICY IF EXISTS "challenge members add" ON public.challenge_members;
CREATE POLICY "challenge members add" ON public.challenge_members
FOR INSERT TO authenticated
WITH CHECK (
  public.is_challenge_owner(challenge_id)
  AND (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id))
);

-- Выйти можно самому, убрать участника может создатель
DROP POLICY IF EXISTS "challenge members delete" ON public.challenge_members;
CREATE POLICY "challenge members delete" ON public.challenge_members
FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_challenge_owner(challenge_id));

DROP POLICY IF EXISTS "challenge checkins read" ON public.challenge_checkins;
CREATE POLICY "challenge checkins read" ON public.challenge_checkins
FOR SELECT TO authenticated USING (public.is_challenge_member(challenge_id));

DROP POLICY IF EXISTS "challenge checkins add" ON public.challenge_checkins;
CREATE POLICY "challenge checkins add" ON public.challenge_checkins
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND day BETWEEN current_date - 1 AND current_date + 1
  AND public.is_challenge_member(challenge_id)
);

DROP POLICY IF EXISTS "challenge checkins delete own" ON public.challenge_checkins;
CREATE POLICY "challenge checkins delete own" ON public.challenge_checkins
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ Realtime для уведомлений (благодарности и SOS) ============
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gratitude; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_signals; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Проверка:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public'
--  AND tablename IN ('shared_memories','buddy_habits','buddy_checkins','challenges','challenge_members','challenge_checkins') ORDER BY 1,2;
