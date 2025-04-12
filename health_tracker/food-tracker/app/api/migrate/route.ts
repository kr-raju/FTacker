import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  }
});

// Migration function to create or update the required database tables
async function migrateDatabase() {
  console.log('Running database migration...');
  
  try {
    // First, check if the users table exists
    const { data: userTableExists, error: userTableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');
    
    if (userTableError) {
      console.error('Error checking for users table:', userTableError);
      throw userTableError;
    }
    
    if (!userTableExists || userTableExists.length === 0) {
      console.log('Users table does not exist, creating it...');
      
      // Create the users table
      const { error: createTableError } = await supabase.rpc('executeSQL', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.users (
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
        `
      });
      
      if (createTableError) {
        console.error('Error creating users table:', createTableError);
        throw createTableError;
      }
      
      console.log('Users table created successfully');
    } else {
      console.log('Users table exists, checking columns...');
      
      // Check if the display_name column exists
      const { data: displayNameExists, error: displayNameError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'users')
        .eq('column_name', 'display_name');
      
      if (displayNameError) {
        console.error('Error checking for display_name column:', displayNameError);
        throw displayNameError;
      }
      
      if (!displayNameExists || displayNameExists.length === 0) {
        console.log('display_name column does not exist, adding it...');
        
        // Add the display_name column
        const { error: addColumnError } = await supabase.rpc('executeSQL', {
          sql: `ALTER TABLE public.users ADD COLUMN display_name TEXT;`
        });
        
        if (addColumnError) {
          console.error('Error adding display_name column:', addColumnError);
          throw addColumnError;
        }
        
        console.log('display_name column added successfully');
      }
      
      // Check if the user_info column exists
      const { data: userInfoExists, error: userInfoError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'users')
        .eq('column_name', 'user_info');
      
      if (userInfoError) {
        console.error('Error checking for user_info column:', userInfoError);
        throw userInfoError;
      }
      
      if (!userInfoExists || userInfoExists.length === 0) {
        console.log('user_info column does not exist, adding it...');
        
        // Add the user_info column
        const { error: addColumnError } = await supabase.rpc('executeSQL', {
          sql: `ALTER TABLE public.users ADD COLUMN user_info JSONB DEFAULT '{}'::jsonb;`
        });
        
        if (addColumnError) {
          console.error('Error adding user_info column:', addColumnError);
          throw addColumnError;
        }
        
        console.log('user_info column added successfully');
      }
    }
    
    return { success: true, message: 'Migration completed successfully' };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, message: 'Migration failed', error };
  }
}

export async function GET() {
  const result = await migrateDatabase();
  
  return NextResponse.json(result);
}

// Also export the migrateDatabase function to be called at app startup
export { migrateDatabase }; 