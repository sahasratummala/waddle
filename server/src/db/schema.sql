-- ============================================================
-- Waddle Database Schema
-- Run this in your Supabase SQL editor or via CLI
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  username      TEXT NOT NULL,
  avatar_url    TEXT,
  points_total  INTEGER NOT NULL DEFAULT 0,
  points_available INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT username_min_length CHECK (char_length(username) >= 2),
  CONSTRAINT username_max_length CHECK (char_length(username) <= 30),
  CONSTRAINT points_total_non_negative CHECK (points_total >= 0),
  CONSTRAINT points_available_non_negative CHECK (points_available >= 0)
);

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- geese
-- ============================================================
CREATE TABLE IF NOT EXISTS public.geese (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL DEFAULT 'EGG',
  accessories JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT stage_valid CHECK (stage IN ('EGG', 'HATCHLING', 'GOSLING', 'GOOSE')),
  CONSTRAINT geese_user_unique UNIQUE (user_id)
);

-- Auto-create goose after profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.geese (user_id, stage, accessories)
  VALUES (NEW.id, 'EGG', '[]'::jsonb)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================
-- daily_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  title              TEXT NOT NULL,
  description        TEXT,
  estimated_minutes  INTEGER NOT NULL DEFAULT 30,
  points             INTEGER NOT NULL DEFAULT 20,
  category           TEXT NOT NULL DEFAULT 'OTHER',
  is_self_care       BOOLEAN NOT NULL DEFAULT FALSE,
  completed          BOOLEAN NOT NULL DEFAULT FALSE,
  photo_url          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT category_valid CHECK (
    category IN ('ACADEMIC', 'WORK', 'PERSONAL', 'SELF_CARE', 'CREATIVE', 'FITNESS', 'OTHER')
  ),
  CONSTRAINT estimated_minutes_positive CHECK (estimated_minutes > 0),
  CONSTRAINT points_positive CHECK (points > 0)
);

CREATE INDEX IF NOT EXISTS daily_tasks_user_date ON public.daily_tasks(user_id, date);

-- ============================================================
-- rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(6) NOT NULL,
  host_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_style   TEXT NOT NULL DEFAULT 'POMODORO',
  study_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'LOBBY',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT code_format CHECK (code ~ '^[A-Z0-9]{6}$'),
  CONSTRAINT study_style_valid CHECK (
    study_style IN ('POMODORO', 'FLOWMODORO', 'TIME_BLOCKING', 'CUSTOM')
  ),
  CONSTRAINT status_valid CHECK (
    status IN ('LOBBY', 'STUDYING', 'BREAK', 'GAME', 'ENDED')
  )
);

-- Unique active code: only one active room per code at a time
CREATE UNIQUE INDEX IF NOT EXISTS rooms_code_active
  ON public.rooms(code)
  WHERE status NOT IN ('ENDED');

-- ============================================================
-- room_participants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_participants (
  room_id       UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  points_earned INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (room_id, user_id),
  CONSTRAINT points_earned_non_negative CHECK (points_earned >= 0)
);

CREATE INDEX IF NOT EXISTS room_participants_room_id ON public.room_participants(room_id);
CREATE INDEX IF NOT EXISTS room_participants_user_id ON public.room_participants(user_id);

-- ============================================================
-- point_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_transactions_user_id ON public.point_transactions(user_id);

-- ============================================================
-- accessories (catalog — seeded below)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accessories (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,
  cost                INTEGER NOT NULL DEFAULT 50,
  category            TEXT NOT NULL DEFAULT 'other',
  unlocked_at_stage   TEXT NOT NULL DEFAULT 'EGG',

  CONSTRAINT cost_positive CHECK (cost > 0),
  CONSTRAINT category_valid CHECK (category IN ('hat', 'scarf', 'glasses', 'bag', 'other')),
  CONSTRAINT stage_valid CHECK (unlocked_at_stage IN ('EGG', 'HATCHLING', 'GOSLING', 'GOOSE'))
);

-- Seed accessories
INSERT INTO public.accessories (id, name, description, cost, category, unlocked_at_stage)
VALUES
  ('hat-1',     'Straw Hat',     'A classic summer hat',         50,  'hat',     'EGG'),
  ('hat-2',     'Top Hat',       'Very distinguished',           120, 'hat',     'HATCHLING'),
  ('hat-3',     'Party Hat',     'Lets celebrate!',              80,  'hat',     'EGG'),
  ('scarf-1',   'Cozy Scarf',    'Warm and woolly',              60,  'scarf',   'HATCHLING'),
  ('glasses-1', 'Reading Glasses','For the studious goose',      75,  'glasses', 'GOSLING'),
  ('glasses-2', 'Sunglasses',    'Cool vibes only',              100, 'glasses', 'GOSLING'),
  ('bag-1',     'Study Backpack','Carries all your books',       150, 'bag',     'GOSLING'),
  ('bag-2',     'Golden Briefcase','For the executive goose',    300, 'bag',     'GOOSE')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geese ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

-- profiles: users can read all profiles, only update their own
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- geese: users can read all geese, only update their own
CREATE POLICY "geese_select_all" ON public.geese
  FOR SELECT USING (true);

CREATE POLICY "geese_update_own" ON public.geese
  FOR UPDATE USING (auth.uid() = user_id);

-- daily_tasks: users can only see and manage their own
CREATE POLICY "daily_tasks_own" ON public.daily_tasks
  USING (auth.uid() = user_id);

-- rooms: anyone can read, authenticated users can create
CREATE POLICY "rooms_select_all" ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "rooms_insert_auth" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "rooms_update_host" ON public.rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- room_participants: participants can see their room's participants
CREATE POLICY "room_participants_select" ON public.room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_participants.room_id
        AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "room_participants_insert_auth" ON public.room_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- point_transactions: users can read their own
CREATE POLICY "point_transactions_own" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- accessories: everyone can read
CREATE POLICY "accessories_select_all" ON public.accessories
  FOR SELECT USING (true);
