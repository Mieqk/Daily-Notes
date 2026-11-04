-- Чтение собственных строк push_subscriptions и quick_reminders. Выполнять в Supabase -> SQL Editor. Можно запускать повторно.
--
-- Зачем: у этих двух таблиц клиенту выдавали INSERT/UPDATE/DELETE, но не SELECT. Postgres требует право SELECT на столбцы,
-- которые читает условие WHERE, поэтому «удалить по id/endpoint» (отмена быстрого напоминания, отписка от пуша)
-- могло молча не срабатывать, и серверный пуш приходил уже после удаления. Чужие строки по-прежнему не видны (RLS).

GRANT SELECT ON public.push_subscriptions TO authenticated;
DROP POLICY IF EXISTS "push select own" ON public.push_subscriptions;
CREATE POLICY "push select own" ON public.push_subscriptions
FOR SELECT TO authenticated USING (user_id = auth.uid());

GRANT SELECT ON public.quick_reminders TO authenticated;
DROP POLICY IF EXISTS "quick select own" ON public.quick_reminders;
CREATE POLICY "quick select own" ON public.quick_reminders
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Проверка:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('push_subscriptions','quick_reminders') ORDER BY 1,3;
