'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '../../../services/firebase'
import { 
  getConnectionTrackingData, 
  ConnectionTrackingData,
  getUserConnections,
  findUserByEmail
} from '../../../services/connectionService'
import Header from '../../../components/Header'
import * as dbProvider from '../../../services/db-provider'

type UserData = {
  id: string;
  email: string;
  displayName?: string;
  userInfo?: {
    age: number;
    sex: string;
    weight: number;
    height: number;
  };
  waterIntake?: number;
};

type DailyGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
};

type ConnectionData = {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  lastUpdate: string;
  userInfo?: {
    age: number;
    sex: string;
    weight: number;
    height: number;
  };
  dailyGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
};

type MealEntry = {
  id: string;
  userId: string;
  date: any;
  name: string;
  time: string;
  calories: number;
  items: string[];
  completed: boolean;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export default function ConnectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const connectionId = params?.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [nutritionSummary, setNutritionSummary] = useState<any>(null);

  useEffect(() => {
    const loadConnectionData = async () => {
      try {
        console.log('=== Loading connection data ===');
        // Check if user is logged in
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
          console.log('❌ No user found, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        setUser(currentUser);
        console.log('Current user:', currentUser.uid);
        
        // Get connection data
        const connections = await getUserConnections(currentUser.uid);
        const connectionData = connections.find(c => c.id === connectionId);
        
        if (!connectionData) {
          throw new Error("Connection not found");
        }
        
        // Get connected user data
        const connectedUserId = connectionData.role === 'requester' 
          ? connectionData.connectedUserId 
          : connectionData.userId;
        
        const connectedUserData = await dbProvider.getDocument('users', connectedUserId);
        
        if (!connectedUserData) {
          throw new Error("Connected user not found");
        }
        
        // Get basic tracking stats
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7); // Get data for the last 7 days
        const trackingData = await getConnectionTrackingData(currentUser.uid, connectionId, startDate, today);
        console.log('Connection tracking data:', trackingData);
        
        if (!trackingData) {
          throw new Error("Failed to get tracking data");
        }
        
        // Get food entries for the connected user
        const foodEntries = await dbProvider.queryDocuments('food_entries', [
          { field: 'userId', operator: '==', value: connectedUserId }
        ]);
        
        // Convert to MealEntry format
        const mealEntriesData = foodEntries.map((entry: any) => ({
          id: entry.id,
          userId: entry.userId,
          date: entry.date,
          name: entry.name,
          time: entry.mealType || 'breakfast',
          calories: entry.calories || 0,
          items: [entry.name],
          completed: true,
          protein: entry.protein || 0,
          carbs: entry.carbs || 0,
          fat: entry.fat || 0
        }));
        
        // Set connection data
        setConnection({
          id: connectionId,
          name: connectedUserData.displayName || connectedUserData.email.split('@')[0],
          email: connectedUserData.email,
          status: connectionData.status,
          lastUpdate: connectionData.createdAt ? 
            new Date(connectionData.createdAt).toISOString() : 
            new Date().toISOString(),
          userInfo: connectedUserData.userInfo,
          dailyGoals: {
            calories: 2000,
            protein: 50,
            carbs: 250,
            fat: 70,
            water: 2000
          }
        });
        
        // Set meal entries
        setMealEntries(mealEntriesData);
        
        // Calculate nutrition summary
        const totalCalories = mealEntriesData.reduce((sum: number, entry: MealEntry) => 
          sum + (entry.completed ? entry.calories : 0), 0);
        const totalProtein = mealEntriesData.reduce((sum: number, entry: MealEntry) => 
          sum + (entry.completed ? (entry.protein || 0) : 0), 0);
        const totalCarbs = mealEntriesData.reduce((sum: number, entry: MealEntry) => 
          sum + (entry.completed ? (entry.carbs || 0) : 0), 0);
        const totalFat = mealEntriesData.reduce((sum: number, entry: MealEntry) => 
          sum + (entry.completed ? (entry.fat || 0) : 0), 0);
        
        setNutritionSummary({
          calories: {
            consumed: totalCalories,
            goal: 2000,
            remaining: 2000 - totalCalories
          },
          macros: {
            protein: { value: totalProtein, goal: 50 },
            carbs: { value: totalCarbs, goal: 250 },
            fat: { value: totalFat, goal: 70 }
          },
          water: {
            consumed: 0,
            goal: 2000
          }
        });
        
        console.log('✅ Data loaded successfully');
      } catch (error: any) {
        console.error('❌ Error loading connection data:', error);
        setError(error.message || 'Failed to load connection data');
      } finally {
        setLoading(false);
      }
    };
    
    loadConnectionData();
  }, [connectionId, router]);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const moveDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <Link 
            href="/connections" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to connections
          </Link>
        </div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Connection not found</p>
          <Link 
            href="/connections" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to connections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        onSignOut={async () => {
          await router.push('/auth/login');
        }}
        notifications={[]}
        showNotifications={false}
        setShowNotifications={() => {}}
        onMarkNotificationAsRead={async () => {}}
        onAcceptConnection={async () => {}}
        onRejectConnection={async () => {}}
      />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button and connection info */}
        <div className="mb-8">
          <Link 
            href="/connections" 
            className="flex items-center text-primary-600 hover:text-primary-700 mb-4 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to connections
          </Link>
          
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-semibold">
              {connection.name.charAt(0)}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{connection.name}'s Food Tracking</h1>
              <p className="text-gray-500">{connection.email}</p>
            </div>
          </div>
        </div>
        
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
              className={`segmented-control-option ${view === 'day' ? 'segmented-control-option-active' : ''}`}
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button 
              className={`segmented-control-option ${view === 'week' ? 'segmented-control-option-active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button 
              className={`segmented-control-option ${view === 'month' ? 'segmented-control-option-active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - User Info & Goals */}
          <div className="md:col-span-1">
            {/* User Info Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-6">User Information</h2>
              
              {connection.userInfo ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Age</label>
                    <p className="text-lg">{connection.userInfo.age} years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Sex</label>
                    <p className="text-lg capitalize">{connection.userInfo.sex}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Weight</label>
                    <p className="text-lg">{connection.userInfo.weight} kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Height</label>
                    <p className="text-lg">{connection.userInfo.height} cm</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No user information available</p>
              )}
            </div>

            {/* Daily Goals Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Daily Goals</h2>
              
              {connection.dailyGoals ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Calories</label>
                    <p className="text-lg">{connection.dailyGoals.calories} kcal</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Protein</label>
                    <p className="text-lg">{connection.dailyGoals.protein}g</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Carbs</label>
                    <p className="text-lg">{connection.dailyGoals.carbs}g</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fat</label>
                    <p className="text-lg">{connection.dailyGoals.fat}g</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Water</label>
                    <p className="text-lg">{connection.dailyGoals.water}ml</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No daily goals set</p>
              )}
            </div>
          </div>

          {/* Middle Column - Meal Entries */}
          <div className="md:col-span-2">
            {/* Nutrition Summary Card */}
            {nutritionSummary && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-bold mb-6">Today's Summary</h2>
                
                <div className="space-y-6">
                  {/* Calories */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Calories</span>
                      <span className="text-sm text-gray-900">
                        {nutritionSummary.calories.consumed} / {nutritionSummary.calories.goal} kcal
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 rounded-full h-2" 
                        style={{ 
                          width: `${Math.min(100, (nutritionSummary.calories.consumed / nutritionSummary.calories.goal) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Protein</span>
                      <span className="text-sm text-gray-900">
                        {nutritionSummary.macros.protein.value}g / {nutritionSummary.macros.protein.goal}g
                      </span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Carbs</span>
                      <span className="text-sm text-gray-900">
                        {nutritionSummary.macros.carbs.value}g / {nutritionSummary.macros.carbs.goal}g
                      </span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Fat</span>
                      <span className="text-sm text-gray-900">
                        {nutritionSummary.macros.fat.value}g / {nutritionSummary.macros.fat.goal}g
                      </span>
                    </div>
                  </div>
                  
                  {/* Water */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Water</span>
                      <span className="text-sm text-gray-900">
                        {nutritionSummary.water.consumed} / {nutritionSummary.water.goal} ml
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 rounded-full h-2" 
                        style={{ 
                          width: `${Math.min(100, (nutritionSummary.water.consumed / nutritionSummary.water.goal) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Meal Entries */}
            <div className="space-y-6">
              {mealEntries.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-500">No meal entries for today</p>
                </div>
              ) : (
                mealEntries.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{entry.name}</h3>
                        <p className="text-sm text-gray-500">{entry.time}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {entry.calories} kcal
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {entry.items && entry.items.length > 0 ? (
                        entry.items.map((item, index) => (
                          <div key={index} className="flex items-center">
                            <span className="text-sm text-gray-600">{item}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No items listed</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 