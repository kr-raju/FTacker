'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '../../../services/dbService'
import AccountSwitcher from '../../../components/AccountSwitcher'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await auth.isAuthenticated()
        if (isAuth) {
          router.push('/dashboard')
        }
      } catch (err) {
        console.error('Auth check error:', err)
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Please fill in all fields')
      }

      // Attempt login
      const result = await auth.signIn(email, password)
      console.log('Login result:', result)
      
      // Check if login was successful
      if (result?.user) {
        // Create user profile if it doesn't exist
        try {
          await auth.createUserProfile(result.user.id, result.user.email)
        } catch (profileError) {
          console.error('Profile creation error:', profileError)
          // Continue even if profile creation fails
        }
        
        // Redirect to dashboard
        router.push('/dashboard')
        router.refresh() // Force a refresh to update the auth state
      } else {
        throw new Error('Login failed - no user data received')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">Sign in to your Food Tracker account</p>
        </div>
        
        <div className="mt-8 card">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="text-primary-600 hover:text-primary-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary-600 hover:text-primary-500">
              Sign up
            </Link>
          </p>
        </div>
        
        {/* Test Accounts Switcher */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">For testing purposes only:</p>
          <AccountSwitcher />
        </div>
      </div>
    </div>
  )
} 