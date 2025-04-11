import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DB_PROVIDER } from './services/dbConfig'

// Initialize Supabase client for middleware
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === '/auth/login' || path === '/auth/signup'

  // Get the token from the cookies
  const token = request.cookies.get('sb-access-token')?.value

  // Check if user is authenticated
  let isAuthenticated = false
  if (DB_PROVIDER === 'supabase') {
    if (token) {
      const { data: { session } } = await supabase.auth.getSession()
      isAuthenticated = !!session
    }
  } else {
    // For Firebase, we'll rely on the client-side auth state
    isAuthenticated = !!token
  }

  // Redirect logic
  if (isPublicPath && isAuthenticated) {
    // If user is authenticated and tries to access public path, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicPath && !isAuthenticated) {
    // If user is not authenticated and tries to access protected path, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/login',
    '/auth/signup',
  ],
} 