'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const handleCallback = async () => {
      try {
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw new Error(sessionError.message)
        }

        if (session) {
          // Get the user data from the session
          const user = session.user
          
          // If we have a user, redirect to the profile setup page
          if (user) {
            // Check if the user profile exists
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single()
            
            if (profileError && profileError.code !== 'PGRST116') {
              throw new Error(profileError.message)
            }

            // If the profile doesn't exist, redirect to profile setup
            if (!profileData) {
              setMessage('Redirecting to profile setup...')
              router.push('/profile/setup')
              return
            }

            // If the profile exists, redirect to the dashboard
            setMessage('Authentication successful! Redirecting to dashboard...')
            router.push('/dashboard')
            return
          }
        }

        // Handle the case where there's no session
        setMessage('Verification successful! Please log in.')
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } catch (error: any) {
        console.error('Authentication error:', error)
        setError(error.message || 'Authentication failed')
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    }

    // Only run the callback if we have a code in the URL
    const code = searchParams.get('code')
    if (code) {
      handleCallback()
    } else {
      setError('No verification code found')
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    }
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">Authentication</h1>
        
        {error ? (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            <p>Error: {error}</p>
            <p className="mt-2">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg">
            <p>{message}</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 