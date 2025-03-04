import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-apple-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-apple-gray-900">
          Food Tracker
        </h1>
        <h2 className="mt-6 text-center text-2xl font-semibold text-apple-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-apple-gray-600">
          Or{' '}
          <Link href="/signup" className="font-medium text-apple-red hover:underline">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-apple sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm font-medium text-apple-gray-600 hover:text-apple-red">
          Back to home
        </Link>
      </div>
    </div>
  )
} 