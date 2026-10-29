-- Личные заметки и свои ники для друзей: видны только их автору. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Друг ничего не узнаёт: строка принадлежит владельцу (owner_id) и закрыта политикой RLS только для него.

CREATE TABLE IF NOT EXISTS public.friend_notes (
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '' CHECK (char_length(nickname) <= 40),
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, friend_id)
);

ALTER TABLE public.friend_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friend_notes_own ON public.friend_notes;
CREATE POLICY friend_notes_own ON public.friend_notes
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Проверка:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='friend_notes';
