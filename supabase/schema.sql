-- Daily Notes Supabase Schema
-- Run this in SQL Editor at https://app.supabase.com

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================
-- ENTRIES TABLE (daily notes with mood, content, tags, photos)
-- ============================================
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INTEGER,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/edit their own entries
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/edit their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);

-- ============================================
-- SLEEP_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_start TEXT,
  sleep_end TEXT,
  quality INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/edit their own sleep logs
CREATE POLICY "Users can view own sleep logs" ON sleep_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep logs" ON sleep_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep logs" ON sleep_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep logs" ON sleep_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_logs(user_id, date);

-- ============================================
-- ДОПОЛНЕНИЯ (идемпотентно, безопасно запускать повторно)
-- ============================================

-- Профиль: поля, которые использует приложение
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_text TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_friend_code ON profiles(friend_code);

-- Записи: created_at нужен для «честной серии»
ALTER TABLE entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Сон: колонки, которые пишет клиент
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT 0;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS awakenings INTEGER DEFAULT 0;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- WITH CHECK, чтобы нельзя было передать свою строку другому user_id
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sleep logs" ON sleep_logs;
CREATE POLICY "Users can update own sleep logs" ON sleep_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- FRIENDSHIPS TABLE
-- user_a < user_b всегда (пара хранится в одном порядке)
-- ============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_a < user_b),
  CHECK (sender = user_a OR sender = user_b),
  UNIQUE(user_a, user_b)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(user_b);

DROP POLICY IF EXISTS "Participants can view friendships" ON friendships;
CREATE POLICY "Participants can view friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Sender can create request" ON friendships;
CREATE POLICY "Sender can create request" ON friendships
  FOR INSERT WITH CHECK (
    auth.uid() = sender AND status = 'pending'
    AND (auth.uid() = user_a OR auth.uid() = user_b)
  );

-- Принять заявку может только получатель (не отправитель)
DROP POLICY IF EXISTS "Recipient can accept request" ON friendships;
CREATE POLICY "Recipient can accept request" ON friendships
  FOR UPDATE USING (
    (auth.uid() = user_a OR auth.uid() = user_b) AND auth.uid() <> sender
  ) WITH CHECK (
    (auth.uid() = user_a OR auth.uid() = user_b) AND auth.uid() <> sender
  );

DROP POLICY IF EXISTS "Participants can delete friendship" ON friendships;
CREATE POLICY "Participants can delete friendship" ON friendships
  FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Профиль виден: себе, друзьям, тем, от кого пришла/кому ушла заявка,
-- а также любому вошедшему пользователю по коду друга (поиск по коду).
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view related profiles" ON profiles;
CREATE POLICY "Users can view related profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR friend_code IS NOT NULL AND auth.uid() IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_a = auth.uid() AND f.user_b = profiles.id)
         OR (f.user_b = auth.uid() AND f.user_a = profiles.id)
    )
  );

-- ============================================
-- STORAGE: публичные бакеты для аватаров и баннеров.
-- Писать и удалять может только владелец (папка = его user id).
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read profile images" ON storage.objects;
CREATE POLICY "Public read profile images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'banners'));

DROP POLICY IF EXISTS "Owner uploads profile images" ON storage.objects;
CREATE POLICY "Owner uploads profile images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('avatars', 'banners')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner updates profile images" ON storage.objects;
CREATE POLICY "Owner updates profile images" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('avatars', 'banners')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner deletes profile images" ON storage.objects;
CREATE POLICY "Owner deletes profile images" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('avatars', 'banners')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, settings)
  VALUES (NEW.id, NULL, '{}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
