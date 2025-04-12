-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{"measurement_unit": "metric", "calorie_goal": 2000, "water_goal": 2000}'::JSONB
);

-- Create food_entries table
CREATE TABLE IF NOT EXISTS public.food_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  description TEXT,
  water_intake INTEGER,
  items JSONB,
  count INTEGER DEFAULT 1,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  image_id UUID,
  is_from_image BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create food_images table
CREATE TABLE IF NOT EXISTS public.food_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  analysis_result JSONB,
  hash TEXT,
  food_entry_id UUID REFERENCES public.food_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_email TEXT NOT NULL,
  receiver_name TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT,
  type TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage buckets
-- NOTE: This is done through the Supabase UI, not SQL
-- You'll need to create buckets:
-- 1. food-images

-- Row Level Security Policies
-- Enable row level security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE USING (auth.uid() = id);

-- Food entries policies
CREATE POLICY "Users can view their own food entries" 
ON public.food_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food entries" 
ON public.food_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food entries" 
ON public.food_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food entries" 
ON public.food_entries FOR DELETE USING (auth.uid() = user_id);

-- Food images policies
CREATE POLICY "Users can view their own food images" 
ON public.food_images FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food images" 
ON public.food_images FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food images" 
ON public.food_images FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food images" 
ON public.food_images FOR DELETE USING (auth.uid() = user_id);

-- Connections policies
CREATE POLICY "Users can view their own connections" 
ON public.connections FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can insert their own connections" 
ON public.connections FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own connections" 
ON public.connections FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can delete their own connections" 
ON public.connections FOR DELETE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE USING (auth.uid() = user_id); 