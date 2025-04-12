import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    
    if (!code) {
      console.error('No code provided in callback URL');
      return NextResponse.redirect(new URL('/auth/login?error=missing_code', request.url));
    }

    // Create a Supabase client with the user's Auth cookie
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
      },
    });

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url));
    }

    // Create a user profile if it doesn't exist
    if (data?.user) {
      try {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (!profileData) {
          // Create user profile if it doesn't exist
          await supabase.from('users').insert([{
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.email?.split('@')[0] || 'User',
            created_at: new Date(),
            updated_at: new Date(),
            user_info: {},
            settings: {
              measurement_unit: 'metric',
              calorie_goal: 2000,
              water_goal: 2000
            }
          }]);
        }
      } catch (error) {
        console.error('Error checking/creating user profile in callback:', error);
      }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/login?error=callback_error', request.url));
  }
} 