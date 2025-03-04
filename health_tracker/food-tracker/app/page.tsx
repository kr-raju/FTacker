'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '../services/firebase'
import Header from '../components/Header'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      // Redirect to login if not authenticated
      router.push('/auth/login')
      return
    }
    
    setUser(currentUser)
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Food Tracker</h1>
          <p className="text-xl text-gray-600">Track your meals and share with loved ones</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* My Food Tracking Option */}
          <Link href="/dashboard" className="block">
            <div className="apple-card hover:shadow-xl transition-shadow h-full flex flex-col">
              <div className="flex-1 p-8 flex flex-col items-center text-center">
                <div className="rounded-full bg-primary-100 p-4 mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">My Food Tracking</h2>
                <p className="text-gray-600">View and manage your personal meal records, nutrition goals, and progress.</p>
              </div>
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
                <span className="text-primary-600 font-medium">Track my meals &rarr;</span>
              </div>
            </div>
          </Link>
          
          {/* Track Others Option */}
          <Link href="/connections" className="block">
            <div className="apple-card hover:shadow-xl transition-shadow h-full flex flex-col">
              <div className="flex-1 p-8 flex flex-col items-center text-center">
                <div className="rounded-full bg-secondary-100 p-4 mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Others</h2>
                <p className="text-gray-600">Connect with family and friends to monitor their food intake and provide support.</p>
              </div>
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
                <span className="text-secondary-600 font-medium">View connections &rarr;</span>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="apple-card p-6 text-center">
              <p className="text-gray-600 text-sm">Today's Calories</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">650</p>
              <p className="text-xs text-gray-500 mt-1">/ 2000 goal</p>
            </div>
            
            <div className="apple-card p-6 text-center">
              <p className="text-gray-600 text-sm">Water Intake</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">1.2L</p>
              <p className="text-xs text-gray-500 mt-1">/ 2.5L goal</p>
            </div>
            
            <div className="apple-card p-6 text-center">
              <p className="text-gray-600 text-sm">Active Days</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </div>
            
            <div className="apple-card p-6 text-center">
              <p className="text-gray-600 text-sm">Connections</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">3</p>
              <p className="text-xs text-gray-500 mt-1">1 pending</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 