-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  profile JSONB,
  settings JSONB DEFAULT '{
    "measurement_unit": "metric", 
    "calorie_goal": 2000, 
    "water_goal": 2000
  }'::jsonb
);

-- Create connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  connected_user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security if not already enabled
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for connections table
DO $$
BEGIN
    -- First check if the connections table exists and has the necessary columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'connections'
    ) THEN
        -- Check if the policy already exists
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'connections' AND policyname = 'Users can view connections where they are a participant') THEN
            CREATE POLICY "Users can view connections where they are a participant"
            ON public.connections FOR SELECT
            USING (auth.uid() = user_id OR auth.uid() = connected_user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'connections' AND policyname = 'Users can insert connections they initiate') THEN
            CREATE POLICY "Users can insert connections they initiate"
            ON public.connections FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'connections' AND policyname = 'Users can update connections they''re part of') THEN
            CREATE POLICY "Users can update connections they're part of"
            ON public.connections FOR UPDATE
            USING (auth.uid() = user_id OR auth.uid() = connected_user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'connections' AND policyname = 'Users can delete connections they initiated') THEN
            CREATE POLICY "Users can delete connections they initiated"
            ON public.connections FOR DELETE
            USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- Create policies for notifications table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
            CREATE POLICY "Users can view their own notifications"
            ON public.notifications FOR SELECT
            USING (auth.uid() = user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'notifications' AND policyname = 'Authenticated users can insert notifications') THEN
            CREATE POLICY "Authenticated users can insert notifications"
            ON public.notifications FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
            CREATE POLICY "Users can update their own notifications"
            ON public.notifications FOR UPDATE
            USING (auth.uid() = user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications') THEN
            CREATE POLICY "Users can delete their own notifications"
            ON public.notifications FOR DELETE
            USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- Set up storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'Food Images', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies if they don't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM storage.buckets 
        WHERE id = 'food-images'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can upload their own food images') THEN
            CREATE POLICY "Users can upload their own food images"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can view their own food images') THEN
            CREATE POLICY "Users can view their own food images"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own food images') THEN
            CREATE POLICY "Users can update their own food images"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies 
                        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete their own food images') THEN
            CREATE POLICY "Users can delete their own food images"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
        END IF;
    END IF;
END $$;

-- Create indexes for performance if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'food_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_food_entries_user_id') THEN
            CREATE INDEX idx_food_entries_user_id ON public.food_entries(user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_food_entries_date') THEN
            CREATE INDEX idx_food_entries_date ON public.food_entries(date);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'connections') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_connections_user_id') THEN
            CREATE INDEX idx_connections_user_id ON public.connections(user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_connections_connected_user_id') THEN
            CREATE INDEX idx_connections_connected_user_id ON public.connections(connected_user_id);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
            CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
        END IF;
    END IF;
END $$;

-- Create function for automatic updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updated_at if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_users') THEN
            CREATE TRIGGER set_updated_at_users
            BEFORE UPDATE ON public.users
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'food_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_food_entries') THEN
            CREATE TRIGGER set_updated_at_food_entries
            BEFORE UPDATE ON public.food_entries
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'connections') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_connections') THEN
            CREATE TRIGGER set_updated_at_connections
            BEFORE UPDATE ON public.connections
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_notifications') THEN
            CREATE TRIGGER set_updated_at_notifications
            BEFORE UPDATE ON public.notifications
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        END IF;
    END IF;
END $$; 