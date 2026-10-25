-- Синхронизация вкладок «Питание» и «Тренировки» через аккаунт. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно.
--
-- Одна строка = один набор данных пользователя (мои продукты, дневник еды, цель, тренировки, шаблоны, отдых).
-- Видит и меняет строки только их владелец.

CREATE TABLE IF NOT EXISTS public.fitness_data (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (key IN ('foods', 'foodLog', 'foodGoal', 'workoutLog', 'workoutTpl', 'restLen')),
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE public.fitness_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fitness_data FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_data TO authenticated;

DROP POLICY IF EXISTS "fitness data own" ON public.fitness_data;
CREATE POLICY "fitness data own" ON public.fitness_data
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
