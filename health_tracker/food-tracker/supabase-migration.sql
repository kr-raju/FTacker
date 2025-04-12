-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with all needed columns
DO $$
BEGIN
  -- Check if users table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    -- If it exists, check if display_name column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'display_name') THEN
      -- Add display_name column if it doesn't exist
      ALTER TABLE public.users ADD COLUMN display_name TEXT;
    END IF;

    -- Check if user_info column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_info') THEN
      -- Add user_info column if it doesn't exist
      ALTER TABLE public.users ADD COLUMN user_info JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Check if settings column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'settings') THEN
      -- Add settings column if it doesn't exist
      ALTER TABLE public.users ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
  ELSE
    -- Create the users table if it doesn't exist
    CREATE TABLE public.users (
      id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
      email TEXT NOT NULL,
      display_name TEXT,
      user_info JSONB DEFAULT '{}'::jsonb,
      settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now())
    );

    -- Set up Row Level Security policies
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Policies for users table
    CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT
    USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

    CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);
  END IF;
END
$$; 