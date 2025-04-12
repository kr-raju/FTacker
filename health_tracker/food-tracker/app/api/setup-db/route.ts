import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // SQL to create the table with all required columns
    const sql = `
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create users table
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
      email TEXT NOT NULL,
      display_name TEXT,
      user_info JSONB DEFAULT '{}'::jsonb,
      settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now())
    );

    -- Set up Row Level Security
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DO $$
    BEGIN
      -- Delete any existing policies to avoid duplicates
      DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
      DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
      DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

      -- Create policies
      CREATE POLICY "Users can view their own profile" 
      ON public.users FOR SELECT
      USING (auth.uid() = id);

      CREATE POLICY "Users can update their own profile"
      ON public.users FOR UPDATE
      USING (auth.uid() = id);

      CREATE POLICY "Users can insert their own profile"
      ON public.users FOR INSERT
      WITH CHECK (auth.uid() = id);
    END
    $$;
    `;

    // Execute the SQL through different methods
    try {
      // First, try the RPC methods that might be available
      try {
        const { error: rpcError1 } = await supabase.rpc('execute_sql', { sql });
        if (!rpcError1) {
          return NextResponse.json({ success: true, message: 'Database setup completed successfully via execute_sql' });
        }
        
        const { error: rpcError2 } = await supabase.rpc('query_raw', { query: sql });
        if (!rpcError2) {
          return NextResponse.json({ success: true, message: 'Database setup completed successfully via query_raw' });
        }
        
        const { error: rpcError3 } = await supabase.rpc('exec', { query: sql });
        if (!rpcError3) {
          return NextResponse.json({ success: true, message: 'Database setup completed successfully via exec' });
        }
        
        console.error('Could not execute SQL through RPC methods', { rpcError1, rpcError2, rpcError3 });
      } catch (rpcError) {
        console.error('Error calling RPC functions:', rpcError);
      }
      
      // Direct approach using postgrest
      console.log('Trying direct SQL approach');
      return NextResponse.json({ 
        success: false, 
        message: 'Database setup failed. Please manually run the SQL script in the Supabase dashboard.',
        instructions: 'Follow the instructions in README-SUPABASE-SETUP.md to set up the database manually.' 
      });
    } catch (error: any) {
      console.error('Error setting up database:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error setting up database:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 