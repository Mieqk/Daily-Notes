-- Sleep Party: совместное отслеживание сна. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует are_friends() из 20261028_shared_buddy_challenges.sql.
--
-- Пара друзей (party) и ночи, которыми участники сами решили поделиться.
-- Заметки и пробуждения не передаются: только часы, оценка, время отбоя и подъёма.
-- Видят и меняют данные только двое участников.

CREATE TABLE IF NOT EXISTS public.sleep_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (owner <> buddy)
);
-- Одна вечеринка на пару, независимо от того, кто её создал
CREATE UNIQUE INDEX IF NOT EXISTS sleep_parties_pair_idx
  ON public.sleep_parties (LEAST(owner, buddy), GREATEST(owner, buddy));

ALTER TABLE public.sleep_parties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sleep_parties FROM anon;
GRANT SELECT, INSERT, DELETE ON public.sleep_parties TO authenticated;

DROP POLICY IF EXISTS "sleep parties read" ON public.sleep_parties;
CREATE POLICY "sleep parties read" ON public.sleep_parties
FOR SELECT TO authenticated USING (owner = auth.uid() OR buddy = auth.uid());

DROP POLICY IF EXISTS "sleep parties add" ON public.sleep_parties;
CREATE POLICY "sleep parties add" ON public.sleep_parties
FOR INSERT TO authenticated
WITH CHECK (owner = auth.uid() AND public.are_friends(owner, buddy));

DROP POLICY IF EXISTS "sleep parties delete" ON public.sleep_parties;
CREATE POLICY "sleep parties delete" ON public.sleep_parties
FOR DELETE TO authenticated USING (owner = auth.uid() OR buddy = auth.uid());

CREATE TABLE IF NOT EXISTS public.sleep_party_nights (
  party_id UUID NOT NULL REFERENCES public.sleep_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL, -- дата пробуждения, как ключ записи сна в приложении
  hours NUMERIC(3,1) NOT NULL CHECK (hours BETWEEN 0 AND 24),
  quality SMALLINT NOT NULL DEFAULT 0 CHECK (quality BETWEEN 0 AND 5),
  bedtime TEXT CHECK (bedtime IS NULL OR bedtime ~ '^[0-2][0-9]:[0-5][0-9]$'),
  waketime TEXT CHECK (waketime IS NULL OR waketime ~ '^[0-2][0-9]:[0-5][0-9]$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id, day)
);
ALTER TABLE public.sleep_party_nights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sleep_party_nights FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_party_nights TO authenticated;

-- Подзапросы к sleep_parties идут через её RLS: доступ есть только у участников пары
DROP POLICY IF EXISTS "sleep nights read" ON public.sleep_party_nights;
CREATE POLICY "sleep nights read" ON public.sleep_party_nights
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sleep_parties p WHERE p.id = party_id));

DROP POLICY IF EXISTS "sleep nights add" ON public.sleep_party_nights;
CREATE POLICY "sleep nights add" ON public.sleep_party_nights
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND day BETWEEN current_date - 7 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.sleep_parties p WHERE p.id = party_id)
);

DROP POLICY IF EXISTS "sleep nights update own" ON public.sleep_party_nights;
CREATE POLICY "sleep nights update own" ON public.sleep_party_nights
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND day BETWEEN current_date - 7 AND current_date + 1
  AND EXISTS (SELECT 1 FROM public.sleep_parties p WHERE p.id = party_id)
);

DROP POLICY IF EXISTS "sleep nights delete own" ON public.sleep_party_nights;
CREATE POLICY "sleep nights delete own" ON public.sleep_party_nights
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public'
--  AND tablename IN ('sleep_parties','sleep_party_nights') ORDER BY 1,2;
