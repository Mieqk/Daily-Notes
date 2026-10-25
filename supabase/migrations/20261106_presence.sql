-- Статус «в сети»: друзья видят, когда вы онлайн, и ваш режим. Выполнять в Supabase -> SQL Editor.
-- Скрипт можно запускать повторно. Требует 20261025_profile_privacy.sql (get_public_profiles).
--
-- Режимы (presence_mode): auto (по активности), away (не активен), dnd (не беспокоить, уведомления от друзей
-- молчат), hidden (невидимка: друзья видят «не в сети» без времени визита).
-- Приложение раз в минуту сообщает, что вы на месте (touch_presence). Через 2 минуты тишины человек «не в сети».
-- Статус видят только друзья и вы сами; у тех, кто лишь отправил заявку, его нет.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS presence_mode TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_presence_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_presence_mode_check CHECK (presence_mode IN ('auto', 'away', 'dnd', 'hidden'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS presence_idle BOOLEAN NOT NULL DEFAULT false;

-- «Я на месте»: обновляет только свою строку
CREATE OR REPLACE FUNCTION public.touch_presence(idle BOOLEAN DEFAULT false)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen_at = now(), presence_idle = COALESCE(idle, false) WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.touch_presence(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_presence(BOOLEAN) TO authenticated;

-- Профили с учётом приватности и статусом в сети (меняется набор колонок, поэтому функцию пересоздаём)
DROP FUNCTION IF EXISTS public.get_public_profiles(UUID[]);
CREATE FUNCTION public.get_public_profiles(ids UUID[])
RETURNS TABLE (
  id UUID, display_name TEXT, avatar TEXT, avatar_url TEXT, banner_url TEXT,
  bio TEXT, friend_code TEXT, status_emoji TEXT, status_text TEXT,
  presence_state TEXT, last_seen_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar, p.avatar_url,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'banner', 'friends') <> 'nobody') THEN p.banner_url END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'bio', 'friends') <> 'nobody') THEN p.bio END,
    p.friend_code,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'status', 'friends') <> 'nobody') THEN p.status_emoji END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND COALESCE(p.privacy->>'status', 'friends') <> 'nobody') THEN p.status_text END,
    CASE
      WHEN r.rel NOT IN ('self', 'friend') THEN NULL
      WHEN r.rel = 'friend' AND p.presence_mode = 'hidden' THEN 'offline'
      WHEN p.last_seen_at IS NULL OR p.last_seen_at < now() - interval '2 minutes' THEN 'offline'
      WHEN p.presence_mode = 'dnd' THEN 'dnd'
      WHEN p.presence_mode = 'away' OR p.presence_idle THEN 'away'
      ELSE 'online'
    END,
    CASE WHEN r.rel = 'self' OR (r.rel = 'friend' AND p.presence_mode <> 'hidden') THEN p.last_seen_at END
  FROM public.profiles p
  CROSS JOIN LATERAL (SELECT public._profile_relation(p.id) AS rel) r
  WHERE p.id = ANY(ids) AND r.rel IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) TO authenticated;

-- Проверка:
-- SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('presence_mode','last_seen_at','presence_idle');
