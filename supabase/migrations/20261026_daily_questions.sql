-- Вопросы дня: ответ можно опубликовать для друзей. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Хранится только то, чем человек сам решил поделиться: один ответ в день.
-- Вопрос определяется номером (question_idx), поэтому друг видит его на своём языке.

CREATE TABLE IF NOT EXISTS public.shared_answers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  question_idx INTEGER NOT NULL CHECK (question_idx >= 0),
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.shared_answers ENABLE ROW LEVEL SECURITY;

-- Права на таблицу: только вошедшие пользователи, остальное режет RLS
REVOKE ALL ON public.shared_answers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_answers TO authenticated;

-- Свои ответы: полный доступ
DROP POLICY IF EXISTS "shared answers own" ON public.shared_answers;
CREATE POLICY "shared answers own" ON public.shared_answers
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ответы друзей: только чтение и только для принятых заявок
DROP POLICY IF EXISTS "shared answers friends read" ON public.shared_answers;
CREATE POLICY "shared answers friends read" ON public.shared_answers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_a = auth.uid() AND f.user_b = shared_answers.user_id)
        OR (f.user_b = auth.uid() AND f.user_a = shared_answers.user_id))
  )
);

CREATE INDEX IF NOT EXISTS idx_shared_answers_date ON public.shared_answers(date);

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='shared_answers';
