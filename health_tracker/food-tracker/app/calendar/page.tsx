'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '../../services/firebase'

export default function CalendarPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayViewModal, setShowDayViewModal] = useState(false)

  // Mock data for days with entries
  const mockEntriesData = {
    completed: ['2023-12-01', '2023-12-02', '2023-12-03', '2023-12-05', '2023-12-07', '2023-12-08', '2023-12-10'],
    missed: ['2023-12-04', '2023-12-06', '2023-12-09']
  }

  // Mock calories for days
  const mockCaloriesData: { [key: string]: number } = {
    '2023-12-01': 1850,
    '2023-12-02': 1760,
    '2023-12-03': 2100,
    '2023-12-05': 1920,
    '2023-12-07': 1650,
    '2023-12-08': 1800,
    '2023-12-10': 1950
  }

  // Mock meal data for selected day view
  const [selectedDayMeals, setSelectedDayMeals] = useState<{
    [key: string]: {
      name: string;
      time: string;
      calories: number;
      items: string[];
      completed: boolean;
    }
  }>({
    breakfast: {
      name: 'Breakfast',
      time: '08:30 AM',
      calories: 450,
      items: ['Oatmeal with fruits', 'Coffee'],
      completed: true
    },
    lunch: {
      name: 'Lunch',
      time: '12:30 PM',
      calories: 650,
      items: ['Grilled chicken salad', 'Wheat bread'],
      completed: true
    },
    dinner: {
      name: 'Dinner',
      time: '07:00 PM',
      calories: 750,
      items: ['Salmon', 'Brown rice', 'Steamed vegetables'],
      completed: true
    },
    snacks: {
      name: 'Snacks',
      time: '03:30 PM',
      calories: 200,
      items: ['Apple', 'Yogurt'],
      completed: true
    }
  })

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

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const moveDate = (amount: number) => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (amount * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + amount);
    }
    setCurrentDate(newDate);
  }

  const openDayView = (date: Date) => {
    setSelectedDate(date);
    setShowDayViewModal(true);
  }

  const getCalendarDays = () => {
    if (view === 'week') {
      return getWeekDays();
    } else {
      return getMonthDays();
    }
  }

  const getWeekDays = () => {
    const days = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }

  const getMonthDays = () => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Get days from previous month to fill the first week
    const startingDayOfWeek = firstDay.getDay();
    const prevMonthDays = startingDayOfWeek;
    
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Get days from next month to complete the last week
    const endingDayOfWeek = lastDay.getDay();
    const nextMonthDays = 6 - endingDayOfWeek;
    
    // Add days from previous month
    const prevMonth = new Date(year, month, 0);
    const prevMonthTotalDays = prevMonth.getDate();
    
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push(day);
    }
    
    // Add days from current month
    for (let i = 1; i <= totalDays; i++) {
      const day = new Date(year, month, i);
      days.push(day);
    }
    
    // Add days from next month
    for (let i = 1; i <= nextMonthDays; i++) {
      const day = new Date(year, month + 1, i);
      days.push(day);
    }
    
    return days;
  }

  const getDayClass = (day: Date) => {
    const today = new Date();
    const isToday = day.toDateString() === today.toDateString();
    const dateKey = formatDateKey(day);
    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
    
    let classes = 'calendar-day ';
    
    // Check if the day is in the current month
    if (!isCurrentMonth && view === 'month') {
      classes += 'text-gray-300 ';
    }
    
    // Check completed or missed days
    if (mockEntriesData.completed.includes(dateKey)) {
      classes += 'calendar-day-completed ';
    } else if (mockEntriesData.missed.includes(dateKey)) {
      classes += 'calendar-day-missed ';
    } else if (day.getTime() <= today.getTime()) {
      classes += 'calendar-day-missed ';
    } else {
      classes += 'calendar-day-neutral ';
    }
    
    // Current day indicator
    if (isToday) {
      classes += 'calendar-day-current ';
    }
    
    return classes;
  }

  const getTotalCalories = (day: Date) => {
    const dateKey = formatDateKey(day);
    return mockCaloriesData[dateKey] || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Food Tracker</h1>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/profile" className="text-gray-700 hover:text-gray-900">
              {user?.email || 'User'}
            </Link>
            <button 
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Selector & Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
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
          
          <div className="flex justify-center">
            <div className="segmented-control">
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
        </div>
        
        {/* Calendar */}
        <div className="apple-card">
          {/* Day headers (S M T W T F S) */}
          <div className="grid grid-cols-7 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={index} className="text-center text-gray-500 text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className={`grid grid-cols-7 gap-2 ${view === 'month' ? 'grid-rows-6' : 'grid-rows-1'}`}>
            {getCalendarDays().map((day, index) => (
              <div 
                key={index}
                className="p-1 text-center"
                onClick={() => openDayView(day)}
              >
                <div className="flex flex-col items-center cursor-pointer hover:bg-gray-100 rounded-lg p-2">
                  <div className={getDayClass(day)}>
                    {day.getDate()}
                  </div>
                  {getTotalCalories(day) > 0 && (
                    <div className="text-xs mt-1 font-medium">
                      {getTotalCalories(day)} cal
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 rounded-full mr-2"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 rounded-full mr-2"></div>
              <span>Missed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-white border border-gray-300 rounded-full mr-2"></div>
              <span>Future</span>
            </div>
          </div>
        </div>
      </main>
      
      {/* Day View Modal */}
      {showDayViewModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setShowDayViewModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(selectedDayMeals).map(([key, meal]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-gray-900 font-medium">{meal.name}</h4>
                    <span className="text-sm font-medium">{meal.calories} cal</span>
                  </div>
                  <div className="text-sm text-gray-500">{meal.time}</div>
                  <div className="mt-1 text-gray-700">
                    {meal.items.join(', ')}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Calories</span>
                  <span className="font-bold">
                    {Object.values(selectedDayMeals).reduce((sum, meal) => sum + meal.calories, 0)} cal
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button 
                onClick={() => setShowDayViewModal(false)}
                className="btn-outline"
              >
                Close
              </button>
              <Link
                href={`/dashboard?date=${selectedDate.toISOString()}`}
                className="apple-btn"
              >
                View Full Day
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 