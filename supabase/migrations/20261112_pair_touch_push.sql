-- Пуши о «Доброе утро / Спокойной ночи / Думаю о тебе» из блока «Вдвоём».
-- Выполнять в Supabase -> SQL Editor после 20261111_pair_together.sql. Скрипт можно запускать повторно.
-- Нужны уже настроенные фоновые пуши (20261029_push_subscriptions.sql и ключи VAPID).
--
-- id нужен, чтобы сервер мог найти конкретное касание; pushed_at ставит только сервер
-- (так одно касание нельзя разослать дважды).

ALTER TABLE public.pair_touches ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.pair_touches ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS pair_touches_id_idx ON public.pair_touches (id);

-- клиент задаёт только эти поля; id и pushed_at приходят от сервера
REVOKE INSERT ON public.pair_touches FROM authenticated;
GRANT INSERT (link_id, sender, kind, day) ON public.pair_touches TO authenticated;

-- Проверка:
-- SELECT column_name FROM information_schema.columns WHERE table_name='pair_touches' ORDER BY 1;
