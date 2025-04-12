# Supabase Setup for Food Tracker

This guide provides instructions for setting up the Supabase database for the Food Tracker application.

## Database Setup

### Option 1: Manual SQL Execution

1. **Open the Supabase Dashboard**:
   - Log in to your Supabase account at https://app.supabase.com/
   - Select your Food Tracker project

2. **Open the SQL Editor**:
   - In the left sidebar, click "SQL Editor"
   - Click "New Query" to create a new SQL query

3. **Copy and paste the following SQL**:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with all needed columns
DROP TABLE IF EXISTS public.users;

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
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create food_entries table
CREATE TABLE IF NOT EXISTS public.food_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL,
  name TEXT NOT NULL,
  time TEXT,
  calories INTEGER DEFAULT 0,
  items TEXT[] DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  protein INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  fat INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now())
);

-- Set up RLS for food_entries
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

-- Policies for food_entries table
CREATE POLICY "Users can view their own food entries"
ON public.food_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food entries"
ON public.food_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food entries"
ON public.food_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food entries"
ON public.food_entries FOR DELETE
USING (auth.uid() = user_id);
```

4. **Run the SQL**:
   - Click the "Run" button to execute the SQL
   - You should see a success message indicating the queries were executed successfully

### Option 2: API Route

The application includes an API route that can be used to set up the database:

1. **Start the development server**:
   ```
   npm run dev
   ```

2. **Open the setup endpoint**:
   - Navigate to http://localhost:3000/api/setup-db in your browser
   - This will run the database setup script

## Troubleshooting

If you encounter the "Could not find the 'name' column of 'users' in the schema cache" error:

1. Make sure you've run the SQL script from Option 1 or accessed the API route from Option 2.

2. The error occurs because the application is trying to find a column that doesn't exist in the database. The SQL script creates the correct table structure with the required columns.

3. After running the setup, try registering a new user and completing the profile setup. The issue should be resolved. 