'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '../../services/firebase'
import Header from '../../components/Header'
import AccountSwitcher from '../../components/AccountSwitcher'
import { 
  Connection,
  getUserConnections,
  createConnectionRequest,
  acceptConnection,
  rejectConnection
} from '../../services/connectionService'
import {
  FoodEntry,
  MealType,
  addFoodEntry,
  getFoodEntriesByDate
} from '../../services/foodService'
import { getUserNotifications, markNotificationAsRead } from '../../services/notificationService'
import { Timestamp } from 'firebase/firestore'

// Food entry and meal tracking types
type MealEntry = {
  id: string;
  meal: string;
  food: string;
  calories: number;
  timestamp: string;
};

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day')
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([])
  const [showAddMealModal, setShowAddMealModal] = useState(false)
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<string>('')
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [error, setError] = useState('')
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionEmail, setConnectionEmail] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Get user data, connections, and notifications on page load
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = getCurrentUser()
      
      if (!currentUser) {
        // Redirect to login if not authenticated
        router.push('/auth/login')
        return
      }
      
      setUser(currentUser)
      
      try {
        // Load connections
        const userConnections = await getUserConnections(currentUser.uid)
        setConnections(userConnections as Connection[])
        
        // Load notifications
        const userNotifications = await getUserNotifications(currentUser.uid)
        setNotifications(userNotifications)
        
        // Load meal entries for current date
        await loadFoodEntries(currentUser.uid, currentDate)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router, currentDate])
  
  // Load food entries from Firestore
  const loadFoodEntries = async (userId: string, date: Date) => {
    try {
      const entries = await getFoodEntriesByDate(userId, date)
      
      // Convert to MealEntry format for rendering
      const formattedEntries = entries.map((entry: any) => ({
        id: entry.id || '',
        meal: entry.mealType,
        food: entry.name,
        calories: entry.calories,
        timestamp: entry.date instanceof Date 
          ? entry.date.toISOString() 
          : typeof entry.date === 'object' && entry.date.seconds
            ? new Date(entry.date.seconds * 1000).toISOString()
            : new Date(entry.date).toISOString()
      }))
      
      setMealEntries(formattedEntries)
    } catch (error) {
      console.error('Error loading food entries:', error)
      setMealEntries([])
    }
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const moveDate = (days: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + days)
    setCurrentDate(newDate)
  }
  
  const openAddMealModal = (meal: string) => {
    setSelectedMeal(meal)
    resetMealForm()
    setShowAddMealModal(true)
  }
  
  const closeAddMealModal = () => {
    setShowAddMealModal(false)
    resetMealForm()
  }
  
  const resetMealForm = () => {
    setFoodName('')
    setCalories('')
    setError('')
  }
  
  const handleAddMeal = async () => {
    // Validate inputs
    if (!foodName.trim() || !calories.trim() || !selectedMeal) {
      setError('Please fill in all fields')
      return
    }
    
    const caloriesValue = parseInt(calories)
    if (isNaN(caloriesValue) || caloriesValue <= 0) {
      setError('Please enter a valid calorie amount')
      return
    }
    
    try {
      if (!user) return
      
      // Create new entry in Firestore
      const newEntry: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        name: foodName,
        description: '',
        mealType: selectedMeal as MealType,
        calories: caloriesValue,
        date: currentDate,
        time: new Date().toLocaleTimeString(),
      }
      
      await addFoodEntry(newEntry)
      
      // Refresh entries
      await loadFoodEntries(user.uid, currentDate)
      
      // Close modal and reset form
      closeAddMealModal()
    } catch (error) {
      console.error('Error adding meal:', error)
      setError('Failed to add meal. Please try again.')
    }
  }
  
  const openAddConnectionModal = () => {
    setConnectionEmail('')
    setConnectionError('')
    setShowAddConnectionModal(true)
  }
  
  const closeAddConnectionModal = () => {
    setShowAddConnectionModal(false)
  }
  
  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnectionError('')
    
    try {
      if (!user) throw new Error('No user found')
      
      await createConnectionRequest(
        user.uid,
        user.email,
        user.displayName || user.email.split('@')[0],
        connectionEmail
      )
      
      // Refresh connections
      const updatedConnections = await getUserConnections(user.uid)
      setConnections(updatedConnections as Connection[])
      
      // Close modal and reset form
      setShowAddConnectionModal(false)
      setConnectionEmail('')
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to send connection request')
    }
  }
  
  // Handle accepting a connection request
  const handleAcceptConnection = async (connectionId: string) => {
    try {
      if (!user) throw new Error('No user found')
      
      await acceptConnection(connectionId)
      
      // Refresh connections
      const updatedConnections = await getUserConnections(user.uid)
      setConnections(updatedConnections as Connection[])
      
      // Refresh notifications
      const updatedNotifications = await getUserNotifications(user.uid)
      setNotifications(updatedNotifications)
    } catch (error) {
      console.error('Error accepting connection:', error)
    }
  }

  // Handle rejecting a connection request
  const handleRejectConnection = async (connectionId: string) => {
    try {
      if (!user) throw new Error('No user found')
      
      await rejectConnection(connectionId)
      
      // Refresh connections
      const updatedConnections = await getUserConnections(user.uid)
      setConnections(updatedConnections as Connection[])
      
      // Refresh notifications
      const updatedNotifications = await getUserNotifications(user.uid)
      setNotifications(updatedNotifications)
    } catch (error) {
      console.error('Error rejecting connection:', error)
    }
  }

  // Handle marking a notification as read
  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      
      // Refresh notifications
      if (user) {
        const updatedNotifications = await getUserNotifications(user.uid)
        setNotifications(updatedNotifications)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  const handleViewTracking = (id: string) => {
    router.push(`/connections/${id}`)
  }
  
  const formatLastUpdate = (timestamp: any): string => {
    if (!timestamp) return 'Recently'
    
    let date: Date
    if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'object' && timestamp.seconds) {
      // Handle Firestore Timestamp
      date = new Date(timestamp.seconds * 1000)
    } else {
      // Try to parse as string
      date = new Date(timestamp)
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / (1000 * 60))
    
    if (diffMins < 60) {
      return `${diffMins} min ago`
    } else if (diffMins < 1440) {
      return `${Math.round(diffMins / 60)} hrs ago`
    } else {
      return `${Math.round(diffMins / 1440)} days ago`
    }
  }
  
  // Import sample data for testing Firebase integration
  const importSampleData = async () => {
    if (!user) return
    
    try {
      // Sample food entries for testing
      const sampleEntries = [
        {
          userId: user.uid,
          name: "Oatmeal with fruits",
          description: "Steel cut oats with banana and berries",
          mealType: "breakfast" as MealType,
          calories: 320,
          date: currentDate,
          time: "08:30 AM",
        },
        {
          userId: user.uid,
          name: "Greek Yogurt",
          description: "With honey and walnuts",
          mealType: "breakfast" as MealType,
          calories: 180,
          date: currentDate,
          time: "08:30 AM",
        },
        {
          userId: user.uid,
          name: "Chicken Salad",
          description: "Grilled chicken with mixed greens",
          mealType: "lunch" as MealType,
          calories: 450,
          date: currentDate,
          time: "12:45 PM",
        },
        {
          userId: user.uid,
          name: "Apple",
          description: "Medium sized red apple",
          mealType: "snacks" as MealType,
          calories: 95,
          date: currentDate,
          time: "03:30 PM",
        }
      ]
      
      // Add entries one by one
      for (const entry of sampleEntries) {
        await addFoodEntry(entry)
      }
      
      // Refresh entries
      await loadFoodEntries(user.uid, currentDate)
      
      alert("Sample data imported successfully!")
    } catch (error) {
      console.error("Error importing sample data:", error)
      alert("Failed to import sample data. Check console for details.")
    }
  }
  
  // Calculate total calories for the day
  const totalCalories = mealEntries.reduce((sum, entry) => sum + entry.calories, 0)
  
  // Get accepted connections
  const acceptedConnections = connections.filter(conn => conn.status === 'accepted')
  
  // Get pending connection requests
  const pendingRequests = connections.filter(conn => conn.status === 'pending')
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onSignOut={handleSignOut}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onAcceptConnection={handleAcceptConnection}
        onRejectConnection={handleRejectConnection}
      />
      
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => moveDate(-1)} className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">{formatDate(currentDate)}</h2>
          <button onClick={() => moveDate(1)} className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* View Selector */}
        <div className="mb-8 flex justify-center">
          <div className="segmented-control">
            <button 
              className={`segmented-control-option ${viewType === 'day' ? 'segmented-control-option-active' : ''}`}
              onClick={() => setViewType('day')}
            >
              Day
            </button>
            <button 
              className={`segmented-control-option ${viewType === 'week' ? 'segmented-control-option-active' : ''}`}
              onClick={() => setViewType('week')}
            >
              Week
            </button>
            <button 
              className={`segmented-control-option ${viewType === 'month' ? 'segmented-control-option-active' : ''}`}
              onClick={() => setViewType('month')}
            >
              Month
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Nutrition Summary */}
          <div className="md:col-span-1">
            <div className="apple-card mb-8">
              <h2 className="text-xl font-bold mb-6">Today's Summary</h2>
              
              {/* Calories Progress */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Calories</span>
                  <span className="font-medium">
                    {totalCalories}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-primary-600 h-2.5 rounded-full" 
                    style={{ width: `${(totalCalories / 2000) * 100}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {2000 - totalCalories} calories remaining
                </div>
              </div>
              
              {/* Macros */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Macronutrients</h3>
                
                {/* Protein */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">Protein</span>
                    <span className="text-sm font-medium">
                      {Math.round((totalCalories * 0.35) / 4)}g
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full" 
                      style={{ width: `${(Math.round((totalCalories * 0.35) / 4) / 120) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Carbs */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">Carbs</span>
                    <span className="text-sm font-medium">
                      {Math.round((totalCalories * 0.55) / 4)}g
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ width: `${(Math.round((totalCalories * 0.55) / 4) / 200) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Fat */}
                <div className="mb-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">Fat</span>
                    <span className="text-sm font-medium">
                      {Math.round((totalCalories * 0.2) / 9)}g
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-yellow-500 h-1.5 rounded-full" 
                      style={{ width: `${(Math.round((totalCalories * 0.2) / 9) / 65) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Track Others Section */}
            <div className="apple-card">
              <h2 className="text-xl font-bold mb-6">Track Others</h2>
              
              {acceptedConnections.length === 0 ? (
                <div className="text-center py-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-gray-500">No connections yet</h3>
                  <p className="text-sm text-gray-400 mb-4">Track friends and family members</p>
                  <button 
                    onClick={openAddConnectionModal}
                    className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-full text-sm"
                  >
                    + Track Others
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {acceptedConnections.slice(0, 3).map(connection => (
                    <div key={connection.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {user.email === connection.senderEmail 
                              ? connection.receiverName 
                              : connection.senderName}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Updated {formatLastUpdate(connection.updatedAt || connection.createdAt)}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleViewTracking(connection.id || '')}
                          className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full"
                        >
                          View Tracking
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Total connections: {acceptedConnections.length}
                    </span>
                    <button 
                      onClick={openAddConnectionModal}
                      className="text-xs bg-primary-100 text-primary-800 px-3 py-1 rounded-full flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New
                    </button>
                  </div>
                  
                  {acceptedConnections.length > 3 && (
                    <div className="text-center pt-2">
                      <Link href="/connections" className="text-sm text-primary-600 hover:text-primary-800">
                        View all connections
                      </Link>
                    </div>
                  )}
                  
                  {pendingRequests.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-900">Pending Requests</h3>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {pendingRequests.length}
                        </span>
                      </div>
                      <Link href="/connections" className="text-sm text-primary-600 hover:text-primary-800">
                        Manage requests
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Middle & Right Column - Meals & Food Tracking */}
          <div className="md:col-span-2">
            <div className="apple-card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Today's Meals</h2>
                <button 
                  className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
                  onClick={() => openAddMealModal('custom')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Custom Meal
                </button>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Add your meals throughout the day</span>
                <button 
                  className="text-xs bg-primary-100 text-primary-800 px-3 py-2 rounded-full flex items-center"
                  onClick={importSampleData}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Sample Data
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Breakfast */}
                <div>
                  <button 
                    onClick={() => openAddMealModal('breakfast')}
                    className={`meal-button ${mealEntries.some(entry => entry.meal === 'breakfast') ? 'meal-button-completed' : 'meal-button-default'}`}
                  >
                    <span>Breakfast</span>
                    {mealEntries.some(entry => entry.meal === 'breakfast') && (
                      <span>{mealEntries.filter(entry => entry.meal === 'breakfast').reduce((sum, entry) => sum + entry.calories, 0)} cal</span>
                    )}
                  </button>
                  
                  {mealEntries.some(entry => entry.meal === 'breakfast') && (
                    <div className="mt-2 pl-4 border-l-2 border-green-500">
                      <div className="text-sm text-gray-500">
                        {new Date(mealEntries.find(entry => entry.meal === 'breakfast')?.timestamp || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="mt-1">
                        {mealEntries.filter(entry => entry.meal === 'breakfast').map((entry, index) => (
                          <div key={index} className="text-gray-800">{entry.food}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Lunch */}
                <div>
                  <button 
                    onClick={() => openAddMealModal('lunch')}
                    className={`meal-button ${mealEntries.some(entry => entry.meal === 'lunch') ? 'meal-button-completed' : 'meal-button-default'}`}
                  >
                    <span>Lunch</span>
                    {mealEntries.some(entry => entry.meal === 'lunch') && (
                      <span>{mealEntries.filter(entry => entry.meal === 'lunch').reduce((sum, entry) => sum + entry.calories, 0)} cal</span>
                    )}
                  </button>
                  
                  {mealEntries.some(entry => entry.meal === 'lunch') && (
                    <div className="mt-2 pl-4 border-l-2 border-green-500">
                      <div className="text-sm text-gray-500">
                        {new Date(mealEntries.find(entry => entry.meal === 'lunch')?.timestamp || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="mt-1">
                        {mealEntries.filter(entry => entry.meal === 'lunch').map((entry, index) => (
                          <div key={index} className="text-gray-800">{entry.food}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Dinner */}
                <div>
                  <button 
                    onClick={() => openAddMealModal('dinner')}
                    className={`meal-button ${mealEntries.some(entry => entry.meal === 'dinner') ? 'meal-button-completed' : 'meal-button-default'}`}
                  >
                    <span>Dinner</span>
                    {mealEntries.some(entry => entry.meal === 'dinner') && (
                      <span>{mealEntries.filter(entry => entry.meal === 'dinner').reduce((sum, entry) => sum + entry.calories, 0)} cal</span>
                    )}
                  </button>
                  
                  {mealEntries.some(entry => entry.meal === 'dinner') && (
                    <div className="mt-2 pl-4 border-l-2 border-green-500">
                      <div className="text-sm text-gray-500">
                        {new Date(mealEntries.find(entry => entry.meal === 'dinner')?.timestamp || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="mt-1">
                        {mealEntries.filter(entry => entry.meal === 'dinner').map((entry, index) => (
                          <div key={index} className="text-gray-800">{entry.food}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Snacks */}
                <div>
                  <button 
                    onClick={() => openAddMealModal('snacks')}
                    className={`meal-button ${mealEntries.some(entry => entry.meal === 'snacks') ? 'meal-button-completed' : 'meal-button-default'}`}
                  >
                    <span>Snacks</span>
                    {mealEntries.some(entry => entry.meal === 'snacks') && (
                      <span>{mealEntries.filter(entry => entry.meal === 'snacks').reduce((sum, entry) => sum + entry.calories, 0)} cal</span>
                    )}
                  </button>
                  
                  {mealEntries.some(entry => entry.meal === 'snacks') && (
                    <div className="mt-2 pl-4 border-l-2 border-green-500">
                      <div className="text-sm text-gray-500">
                        {new Date(mealEntries.find(entry => entry.meal === 'snacks')?.timestamp || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="mt-1">
                        {mealEntries.filter(entry => entry.meal === 'snacks').map((entry, index) => (
                          <div key={index} className="text-gray-800">{entry.food}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Add Meal Modal */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Add {selectedMeal && selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
              </h3>
              <button onClick={closeAddMealModal} className="text-gray-400 hover:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="foodName" className="block text-sm font-medium text-gray-700 mb-1">
                  Food Item
                </label>
                <input
                  id="foodName"
                  type="text"
                  className="apple-input"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Chicken Sandwich"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="calories" className="block text-sm font-medium text-gray-700 mb-1">
                  Calories
                </label>
                <input
                  id="calories"
                  type="number"
                  className="apple-input"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g. 450"
                  required
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button 
                className="apple-btn w-full"
                onClick={handleAddMeal}
                disabled={!foodName || !calories || !selectedMeal}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Connection Modal */}
      {showAddConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Connection</h3>
              <button onClick={closeAddConnectionModal} className="text-gray-400 hover:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {connectionError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                {connectionError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="connectionEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="connectionEmail"
                  type="email"
                  className="apple-input"
                  value={connectionEmail}
                  onChange={(e) => setConnectionEmail(e.target.value)}
                  placeholder="Enter their email address"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={closeAddConnectionModal}
                className="btn-outline"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddConnection}
                className="apple-btn"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add AccountSwitcher */}
      <div className="fixed bottom-4 right-4 z-50">
        <AccountSwitcher />
      </div>
    </div>
  )
} 