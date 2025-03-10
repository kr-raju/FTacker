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
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'

// Food entry and meal tracking types
type MealEntry = {
  id: string;
  userId: string;
  date: Date;
  name: string;
  time: string;
  calories: number;
  items: string[];
  completed: boolean;
  type: MealType;
  description?: string;
  waterIntake?: number;
};

type ViewType = 'day' | 'week' | 'month'

// Add food calorie dictionary with proper type definition
const foodCalorieDatabase: Record<string, number> = {
  // Breakfast items
  'toast': 75,
  'bread': 75,
  'egg': 70,
  'boiled egg': 70,
  'fried egg': 90,
  'scrambled egg': 100,
  'oatmeal': 150,
  'cereal': 120,
  'pancake': 90,
  'waffle': 100,
  'bacon': 45,
  'sausage': 100,
  'yogurt': 150,
  'granola': 120,
  'banana': 105,
  'apple': 95,
  'orange': 65,
  'grapefruit': 50,
  'avocado': 240,
  'avocado toast': 190,
  'bagel': 245,
  'cream cheese': 100,
  'butter': 100,
  'jam': 55,
  'peanut butter': 95,
  'coffee': 5,
  'coffee with milk': 30,
  'coffee with sugar': 35,
  'coffee with milk and sugar': 60,
  'tea': 2,
  'tea with milk': 27,
  'tea with sugar': 32,
  'tea with milk and sugar': 57,
  'orange juice': 110,
  'apple juice': 115,
  
  // Lunch items
  'sandwich': 350,
  'turkey sandwich': 320,
  'ham sandwich': 330,
  'chicken sandwich': 350,
  'tuna sandwich': 290,
  'grilled cheese': 400,
  'blt': 450,
  'wrap': 300,
  'chicken wrap': 350,
  'salad': 100,
  'caesar salad': 230,
  'greek salad': 180,
  'chicken salad': 250,
  'tuna salad': 190,
  'soup': 150,
  'tomato soup': 120,
  'chicken soup': 130,
  'vegetable soup': 80,
  'burger': 550,
  'cheeseburger': 630,
  'veggie burger': 320,
  'fries': 380,
  'pizza slice': 285,
  'pasta': 200,
  'spaghetti': 220,
  'mac and cheese': 350,
  
  // Dinner items
  'steak': 450,
  'chicken breast': 165,
  'grilled chicken': 180,
  'fried chicken': 320,
  'fish': 200,
  'salmon': 230,
  'tilapia': 110,
  'shrimp': 85,
  'rice': 200,
  'brown rice': 215,
  'quinoa': 220,
  'potato': 160,
  'mashed potato': 240,
  'sweet potato': 115,
  'broccoli': 55,
  'carrots': 50,
  'green beans': 35,
  'asparagus': 40,
  'corn': 130,
  'peas': 80,
  
  // Snacks
  'chips': 150,
  'popcorn': 120,
  'pretzels': 110,
  'nuts': 170,
  'almonds': 165,
  'peanuts': 160,
  'cashews': 155,
  'chocolate': 210,
  'candy': 100,
  'granola bar': 120,
  'protein bar': 200,
  'crackers': 80,
  'cheese': 110,
  'hummus': 70,
  'guacamole': 50,
  'salsa': 20,
  
  // Drinks
  'water': 0,
  'soda': 140,
  'diet soda': 0,
  'lemonade': 130,
  'iced tea': 70,
  'milk': 120,
  'almond milk': 40,
  'soy milk': 80,
  'beer': 150,
  'wine': 125,
  'cocktail': 200,
  'smoothie': 230,
  'protein shake': 180
};

// Function to estimate calories based on food name
const estimateCalories = (foodName: string): number => {
  if (!foodName) return 0;
  
  const lowercaseName = foodName.toLowerCase().trim();
  
  // Direct match
  if (foodCalorieDatabase[lowercaseName]) {
    return foodCalorieDatabase[lowercaseName];
  }
  
  // Partial match
  for (const [food, calories] of Object.entries(foodCalorieDatabase)) {
    if (lowercaseName.includes(food)) {
      return calories;
    }
  }
  
  // Default calories by meal type
  const defaultCalories: Record<MealType, number> = {
    coffee: 100,
    breakfast: 400,
    lunch: 600,
    snacks: 200,
    dinner: 500,
    custom: 300
  };
  
  // If no match found, return default based on meal type
  if (lowercaseName.includes('breakfast')) return defaultCalories.breakfast;
  if (lowercaseName.includes('lunch')) return defaultCalories.lunch;
  if (lowercaseName.includes('dinner')) return defaultCalories.dinner;
  if (lowercaseName.includes('snack')) return defaultCalories.snacks;
  if (lowercaseName.includes('coffee')) return defaultCalories.coffee;
  
  // If still no match, return a general estimate
  return 200;
};

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewType>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddMealModal, setShowAddMealModal] = useState(false)
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([])
  const [newMealName, setNewMealName] = useState('')
  const [newMealDescription, setNewMealDescription] = useState('')
  const [newMealWaterIntake, setNewMealWaterIntake] = useState('')
  const [customMealType, setCustomMealType] = useState('')
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionEmail, setConnectionEmail] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  // New state variables for edit and delete functionality
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<string | null>(null)
  
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
        await loadMealEntries(currentUser.uid)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router, currentDate])
  
  const loadMealEntries = async (userId: string) => {
    try {
      const startOfDay = new Date(currentDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)

      const q = query(
        collection(db, 'food_entries'),
        where('userId', '==', userId),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay)
      )

      const querySnapshot = await getDocs(q)
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      })) as MealEntry[]

      setMealEntries(entries)
    } catch (error) {
      console.error('Error loading meal entries:', error)
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
  
  // Function to handle editing a meal
  const handleEditMeal = (meal: MealEntry) => {
    setEditingMeal(meal);
    setSelectedMealType(meal.type);
    setNewMealName(meal.name);
    setNewMealDescription(meal.description || '');
    setNewMealWaterIntake(meal.waterIntake?.toString() || '');
    if (meal.type === 'custom') {
      setCustomMealType(meal.name);
    }
    setShowAddMealModal(true);
  };

  // Function to handle deleting a meal
  const handleDeleteMeal = async () => {
    if (!mealToDelete || !user) return;
    
    try {
      // Delete the meal from Firestore
      await deleteDoc(doc(db, 'food_entries', mealToDelete));
      
      // Refresh the meal entries
      await loadMealEntries(user.uid);
      
      // Close the confirmation dialog
      setShowDeleteConfirmation(false);
      setMealToDelete(null);
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  // Function to confirm deletion
  const confirmDeleteMeal = (mealId: string) => {
    setMealToDelete(mealId);
    setShowDeleteConfirmation(true);
  };

  // Modified handleAddMeal to support editing
  const handleAddMeal = async () => {
    if (!user || !selectedMealType) return;

    try {
      const mealType = selectedMealType === 'custom' ? customMealType : selectedMealType;
      const itemName = newMealName || mealType;
      
      // Calculate calories based on food name
      let calculatedCalories = estimateCalories(itemName);
      
      // If there's a description, check if it contains food items to add calories
      if (newMealDescription) {
        const words = newMealDescription.split(' ');
        for (const word of words) {
          const wordCalories = estimateCalories(word);
          if (wordCalories > 0) {
            calculatedCalories += wordCalories;
          }
        }
      }
      
      const mealData: Omit<MealEntry, 'id'> = {
        userId: user.uid,
        date: currentDate,
        name: itemName,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        calories: calculatedCalories,
        items: itemName ? [itemName] : [],
        completed: true,
        type: selectedMealType as MealType,
        description: newMealDescription || undefined,
        waterIntake: newMealWaterIntake ? parseInt(newMealWaterIntake) : undefined
      };

      if (editingMeal) {
        // Update existing meal
        await updateDoc(doc(db, 'food_entries', editingMeal.id), mealData);
        setEditingMeal(null);
      } else {
        // Add new meal
        await addDoc(collection(db, 'food_entries'), mealData);
      }
      
      loadMealEntries(user.uid);
      setShowAddMealModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding/updating meal:', error);
    }
  };

  // Modified resetForm to clear editing state
  const resetForm = () => {
    setSelectedMealType(null);
    setNewMealName('');
    setNewMealDescription('');
    setNewMealWaterIntake('');
    setCustomMealType('');
    setEditingMeal(null);
  };
  
  const openAddConnectionModal = () => {
    setConnectionEmail('')
    setConnectionError('')
    setShowAddConnectionModal(true)
  }
  
  const closeAddMealModal = () => {
    setShowAddMealModal(false)
  }
  
  // Handle accepting a connection request
  const handleAcceptConnection = async (connectionId: string) => {
    try {
      if (!user) throw new Error('No user found')
      
      await acceptConnection(connectionId, user.uid)
      
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
      await loadMealEntries(user.uid)
      
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
  
  const renderCalendarView = () => {
    const today = new Date()
    const startDate = new Date(currentDate)
    startDate.setDate(1) // Start from first day of month
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0) // Last day of month

    const days = []
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          const hasEntries = mealEntries.some(entry => 
            entry.date.toDateString() === date.toDateString()
          )
          const isToday = date.toDateString() === today.toDateString()
          const isPast = date < today
          const isFuture = date > today

          return (
            <button
              key={index}
              onClick={() => {
                setCurrentDate(date)
                setView('day')
              }}
              className={`
                p-2 rounded-lg text-center
                ${hasEntries ? 'bg-green-100 text-green-800' : ''}
                ${isToday ? 'border-2 border-primary-600' : ''}
                ${isPast ? 'bg-gray-50 text-gray-400' : ''}
                ${isFuture ? 'bg-blue-50 text-blue-600' : ''}
                hover:bg-gray-100 transition-colors
              `}
            >
              <div className="text-sm font-medium">{date.getDate()}</div>
              {hasEntries && (
                <div className="text-xs mt-1">
                  {mealEntries
                    .filter(entry => entry.date.toDateString() === date.toDateString())
                    .reduce((sum, entry) => sum + entry.calories, 0)} cal
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }
  
  const handleMealButtonClick = (type: MealType) => {
    // For quick click, just record the meal with default values
    if (!user) return;
    
    const defaultCalories: Record<MealType, number> = {
      coffee: 100,
      breakfast: 400,
      lunch: 600,
      snacks: 200,
      dinner: 500,
      custom: 300
    };
    
    const mealName = type === 'custom' ? 'Custom Meal' : type.charAt(0).toUpperCase() + type.slice(1);
    
    const entry: Omit<MealEntry, 'id'> = {
      userId: user.uid,
      date: currentDate,
      name: mealName,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      calories: defaultCalories[type],
      items: [mealName],
      completed: true,
      type: type,
      description: `Quick ${type} entry`,
    };
    
    addDoc(collection(db, 'food_entries'), entry)
      .then(() => {
        loadMealEntries(user.uid);
      })
      .catch(error => {
        console.error('Error adding quick meal:', error);
      });
  };
  
  const handleMealButtonMouseDown = (type: MealType) => {
    // Start timer for long press
    const timer = setTimeout(() => {
      setSelectedMealType(type);
      setShowAddMealModal(true);
      setLongPressTimer(null);
    }, 500); // 500ms for long press
    
    setLongPressTimer(timer);
  };
  
  const handleMealButtonMouseUp = (type: MealType) => {
    // If timer exists, it was a short press
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      handleMealButtonClick(type);
    }
  };
  
  const handleMealButtonTouchStart = (type: MealType) => {
    // Start timer for long press on touch devices
    const timer = setTimeout(() => {
      setSelectedMealType(type);
      setShowAddMealModal(true);
      setLongPressTimer(null);
    }, 500); // 500ms for long press
    
    setLongPressTimer(timer);
  };
  
  const handleMealButtonTouchEnd = (type: MealType) => {
    // If timer exists, it was a short press
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      handleMealButtonClick(type);
    }
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionError('');
    
    try {
      if (!user) throw new Error('No user found');
      
      await createConnectionRequest(
        user.uid,
        user.email,
        user.displayName || user.email.split('@')[0],
        connectionEmail
      );
      
      // Refresh connections
      const updatedConnections = await getUserConnections(user.uid);
      setConnections(updatedConnections as Connection[]);
      
      // Close modal and reset form
      setShowAddConnectionModal(false);
      setConnectionEmail('');
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to send connection request');
    }
  };
  
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Navigation and View Selector */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => moveDate(-1)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <button
              onClick={() => moveDate(1)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-1">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-md ${
                view === 'day' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-md ${
                view === 'week' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-md ${
                view === 'month' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
          </div>
        </div>
        
        {/* Calendar View */}
        {(view === 'week' || view === 'month') && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            {renderCalendarView()}
          </div>
        )}
        
        {/* Meal Type Buttons */}
        {view === 'day' && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {['coffee', 'breakfast', 'lunch', 'snacks', 'dinner', 'custom'].map((type) => (
              <button
                key={type}
                onMouseDown={() => handleMealButtonMouseDown(type as MealType)}
                onMouseUp={() => handleMealButtonMouseUp(type as MealType)}
                onMouseLeave={() => {
                  if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    setLongPressTimer(null);
                  }
                }}
                onTouchStart={() => handleMealButtonTouchStart(type as MealType)}
                onTouchEnd={() => handleMealButtonTouchEnd(type as MealType)}
                className={`p-4 rounded-lg text-white font-medium capitalize ${
                  mealEntries.some(entry => entry.type === type)
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {type}
                <div className="text-xs mt-1">
                  {mealEntries.some(entry => entry.type === type) && 
                    `${mealEntries.filter(entry => entry.type === type).reduce((sum, entry) => sum + entry.calories, 0)} cal`
                  }
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Meal Entries */}
        {view === 'day' && (
          <div className="space-y-4">
            {mealEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{entry.name}</h3>
                    <p className="text-sm text-gray-500">{entry.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 mr-4">
                      {entry.calories} kcal
                    </span>
                    <button 
                      onClick={() => handleEditMeal(entry)}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                      aria-label="Edit meal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => confirmDeleteMeal(entry.id)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      aria-label="Delete meal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {entry.description && (
                  <p className="mt-2 text-sm text-gray-600">{entry.description}</p>
                )}
                {entry.waterIntake && (
                  <p className="mt-2 text-sm text-blue-600">
                    Water: {entry.waterIntake}ml
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Add Meal Modal */}
      {showAddMealModal && selectedMealType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingMeal ? 'Edit' : 'Add'} {selectedMealType === 'custom' ? 'Custom' : selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Meal
              </h3>
              <button 
                onClick={() => {
                  setShowAddMealModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {selectedMealType === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Name
                </label>
                <input
                  type="text"
                  value={customMealType}
                  onChange={(e) => setCustomMealType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="Enter meal name"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="Enter item name (e.g. Chicken Sandwich)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Calories will be calculated based on the food item
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newMealDescription}
                onChange={(e) => setNewMealDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                rows={3}
                placeholder="Enter description or additional items"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Water/Juice Intake (ml)
              </label>
              <input
                type="number"
                value={newMealWaterIntake}
                onChange={(e) => setNewMealWaterIntake(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="Enter water/juice intake"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddMealModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMeal}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {editingMeal ? 'Update' : 'Add'} Meal
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Connection Modal */}
      {showAddConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Connection</h3>
              <button 
                onClick={() => setShowAddConnectionModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {connectionError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {connectionError}
              </div>
            )}
            
            <form onSubmit={handleAddConnection}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={connectionEmail}
                  onChange={(e) => setConnectionEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddConnectionModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Meal
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this meal? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMeal}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
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