'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '../services/firebase'
import Header from '../components/Header'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = getCurrentUser()
      if (!currentUser) {
        router.push('/auth/login')
        return
      }
      setUser(currentUser)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header 
        user={user}
        onSignOut={async () => {
          await router.push('/auth/login')
        }}
        notifications={[]}
        showNotifications={false}
        setShowNotifications={() => {}}
        onMarkNotificationAsRead={async () => {}}
        onAcceptConnection={async () => {}}
        onRejectConnection={async () => {}}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {user?.displayName || 'User'}
          </h1>
          <p className="text-xl text-gray-600">
            Track your nutrition journey with precision and style
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-105 transition-transform duration-200">
            <div className="text-primary-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Daily Progress</h3>
            <p className="text-gray-600">Track your daily nutrition goals and achievements</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-105 transition-transform duration-200">
            <div className="text-primary-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connection Hub</h3>
            <p className="text-gray-600">Connect and track progress with friends and family</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-105 transition-transform duration-200">
            <div className="text-primary-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nutrition Insights</h3>
            <p className="text-gray-600">Get detailed analytics and personalized recommendations</p>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="group relative bg-white rounded-2xl shadow-lg p-8 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
            <div className="relative">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Progress</h2>
              <p className="text-gray-600 mb-6">Track your daily nutrition, view insights, and achieve your goals</p>
              <div className="flex items-center text-primary-600">
                <span className="font-medium">View Dashboard</span>
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/connections')}
            className="group relative bg-white rounded-2xl shadow-lg p-8 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
            <div className="relative">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Track Connections</h2>
              <p className="text-gray-600 mb-6">Connect with friends, family, and track their nutrition journey</p>
              <div className="flex items-center text-primary-600">
                <span className="font-medium">View Connections</span>
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
} 