-- Совместный доступ к записям: поделиться записью дня с другом. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует are_friends() из 20261028_shared_buddy_challenges.sql.
--
-- Друг получает копию записи на момент отправки (текст, настроение, теги). Фото и задачи не передаются.
-- Повторная отправка той же даты тому же другу обновляет копию. Если дружба закончилась, запись
-- перестаёт быть видна получателю. Видят данные только владелец и получатель.

CREATE TABLE IF NOT EXISTS public.shared_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  mood SMALLINT CHECK (mood IS NULL OR mood BETWEEN 0 AND 10),
  tags TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (owner <> friend),
  UNIQUE (owner, friend, entry_date)
);
CREATE INDEX IF NOT EXISTS shared_entries_friend_idx ON public.shared_entries (friend, entry_date DESC);

ALTER TABLE public.shared_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shared_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_entries TO authenticated;

DROP POLICY IF EXISTS "shared entries read" ON public.shared_entries;
CREATE POLICY "shared entries read" ON public.shared_entries
FOR SELECT TO authenticated
USING (owner = auth.uid() OR (friend = auth.uid() AND public.are_friends(owner, friend)));

DROP POLICY IF EXISTS "shared entries add" ON public.shared_entries;
CREATE POLICY "shared entries add" ON public.shared_entries
FOR INSERT TO authenticated
WITH CHECK (owner = auth.uid() AND public.are_friends(owner, friend));

DROP POLICY IF EXISTS "shared entries update" ON public.shared_entries;
CREATE POLICY "shared entries update" ON public.shared_entries
FOR UPDATE TO authenticated
USING (owner = auth.uid())
WITH CHECK (owner = auth.uid() AND public.are_friends(owner, friend));

-- Владелец отзывает доступ, получатель убирает запись у себя
DROP POLICY IF EXISTS "shared entries delete" ON public.shared_entries;
CREATE POLICY "shared entries delete" ON public.shared_entries
FOR DELETE TO authenticated USING (owner = auth.uid() OR friend = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='shared_entries' ORDER BY 1;
