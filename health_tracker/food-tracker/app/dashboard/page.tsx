'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '../../services/firebase'
import Header from '../../components/Header'
import AccountSwitcher from '../../components/AccountSwitcher'
import DashboardStats from '../../components/DashboardStats'
import WeekCalendar from '../../components/WeekCalendar'
import MonthCalendar from '../../components/MonthCalendar'
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
import { getUserNotifications, markNotificationAsRead, NotificationType } from '../../services/notificationService'
import { Timestamp } from 'firebase/firestore'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, limit } from 'firebase/firestore'
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
  count?: number; // Number of times this meal has been added
  lastUpdated?: Date; // Timestamp of last update
};

// New type for food suggestions
type FoodSuggestion = {
  name: string;
  calories: number;
  type?: MealType;
  frequency?: number; // How often this has been used
  lastUsed?: Date;   // When it was last used
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
  'water glass': 0,
  'soda can': 140,
  'diet soda can': 0,
  'lemonade glass': 130,
  'iced tea glass': 70,
  'milk glass': 120,
  'almond milk glass': 40,
  'soy milk glass': 80,
  'beer bottle': 150,
  'wine glass': 125,
  'cocktail glass': 200,
  'smoothie cup': 230,
  'protein shake bottle': 180,
  
  // Indian dishes
  'butter chicken curry': 490,
  'chicken tikka masala curry': 470,
  'paneer tikka appetizer': 350,
  'dal makhani lentils': 310,
  'chana masala chickpeas': 280,
  'palak paneer spinach': 340,
  'aloo gobi potato': 200,
  'samosa pastry': 160,
  'pakora fritters': 120,
  'naan bread': 260,
  'roti flatbread': 120,
  'chapati bread': 120,
  'paratha stuffed': 330,
  'biryani rice': 400,
  'chicken biryani dish': 450,
  'vegetable biryani dish': 350,
  'raita yogurt': 100,
  'tandoori chicken piece': 320,
  'tandoori roti bread': 140,
  'idli rice cake': 80,
  'dosa crepe': 180,
  'masala dosa stuffed': 250,
  'vada fritter': 150,
  'upma semolina': 200,
  'pav bhaji curry': 350,
  'chole bhature dish': 450,
  'gulab jamun sweet': 150,
  'jalebi sweet': 180,
  'kheer pudding': 200,
  'lassi yogurt drink': 180,
  'mango lassi drink': 230,
  
  // Chinese dishes
  'fried rice': 350,
  'vegetable fried rice': 320,
  'chicken fried rice': 380,
  'shrimp fried rice': 360,
  'lo mein': 370,
  'chow mein': 350,
  'kung pao chicken': 450,
  'sweet and sour chicken': 430,
  'general tso chicken': 490,
  'orange chicken': 470,
  'beef and broccoli': 400,
  'mongolian beef': 420,
  'mapo tofu': 300,
  'hot and sour soup': 100,
  'wonton soup': 120,
  'egg drop soup': 80,
  'spring roll': 150,
  'egg roll': 180,
  'dumplings': 40,
  'potstickers': 50,
  'steamed buns': 160,
  'peking duck': 500,
  'dim sum': 40,
  'fortune cookie': 30,
  
  // Mexican dishes
  'taco shell': 170,
  'burrito wrap': 450,
  'quesadilla cheese': 400,
  'enchilada corn': 350,
  'chimichanga fried': 500,
  'fajita grilled': 290,
  'nachos chips': 600,
  'tortilla chips plain': 140,
  'guacamole dip': 150,
  'salsa dip': 30,
  'refried beans side': 180,
  'spanish rice side': 200,
  'chile relleno pepper': 300,
  'tamale corn': 250,
  'churro dessert': 200,
  'flan dessert': 220,
  'horchata drink': 180,
  
  // Italian dishes
  'pizza': 285,
  'spaghetti bolognese': 380,
  'fettuccine alfredo': 450,
  'lasagna': 400,
  'ravioli': 350,
  'risotto': 350,
  'gnocchi': 300,
  'carbonara': 470,
  'penne arrabbiata': 320,
  'bruschetta': 150,
  'caprese salad': 250,
  'minestrone soup': 120,
  'tiramisu': 300,
  'cannoli': 230,
  'gelato': 200,
  
  // Mediterranean dishes
  'hummus with pita': 170,
  'baba ganoush dip': 160,
  'tabbouleh salad': 140,
  'falafel balls': 330,
  'shawarma wrap': 400,
  'gyro sandwich': 430,
  'kebab plate': 350,
  'greek salad with feta': 180,
  'tzatziki sauce': 60,
  'pita bread slice': 165,
  'couscous pilaf': 180,
  'moussaka casserole': 350,
  'spanakopita pastry': 300,
  'dolma stuffed leaves': 220,
  'baklava pastry': 330,
  
  // Middle Eastern dishes
  'hummus dip': 170,
  'falafel sandwich': 330,
  'shawarma plate': 400,
  'tabbouleh side': 140,
  'fattoush salad': 160,
  'mujadara lentils': 280,
  'kibbeh fried': 320,
  'manakish flatbread': 350,
  'labneh yogurt': 100,
  'halloumi cheese': 320,
  'baba ganoush eggplant': 160,
  'tahini sauce': 180,
  'pita bread pocket': 165,
  'lavash flatbread': 140,
  'kebab skewer': 350,
  'kofta meatballs': 300,
  'shakshuka eggs': 280,
  'kunafa dessert': 400,
  'baklava sweet': 330,
  
  // Iranian/Persian dishes
  'chelo kebab': 450,
  'joojeh kebab': 380,
  'koobideh': 350,
  'ghormeh sabzi': 320,
  'fesenjan': 400,
  'tahdig': 250,
  'ash reshteh': 300,
  'kuku sabzi': 280,
  'dolmeh': 220,
  'zereshk polo': 350,
  'tahchin': 380,
  'kashk bademjan': 250,
  'saffron rice': 220,
  'shirazi salad': 120,
  'doogh': 80,
  'sholeh zard': 300,
  'halva': 400,
  'gaz': 350,
  
  // Japanese dishes
  'sushi': 40,
  'sashimi': 35,
  'nigiri': 40,
  'maki roll': 30,
  'california roll': 250,
  'tempura': 300,
  'ramen': 450,
  'udon': 400,
  'soba': 350,
  'teriyaki chicken': 360,
  'katsu curry': 500,
  'miso soup': 80,
  'edamame': 120,
  'gyoza': 50,
  'yakitori': 200,
  'onigiri': 180,
  'okonomiyaki': 350,
  'takoyaki': 300,
  'matcha tea': 3,
  'sake': 150,
  
  // Thai dishes
  'pad thai noodles': 400,
  'green curry bowl': 350,
  'red curry dish': 350,
  'massaman curry bowl': 380,
  'tom yum soup bowl': 150,
  'tom kha gai soup': 180,
  'pad see ew noodles': 380,
  'drunken noodles dish': 400,
  'papaya salad plate': 150,
  'thai spring rolls': 150,
  'satay skewers': 200,
  'mango sticky rice dessert': 330,
  'thai iced tea drink': 180,
  
  // Vietnamese dishes
  'pho soup': 400,
  'banh mi sandwich': 350,
  'vietnamese spring rolls': 150,
  'summer rolls appetizer': 120,
  'bun cha dish': 380,
  'banh xeo crepe': 340,
  'com tam broken rice': 450,
  'cao lau noodles': 400,
  'vietnamese coffee drink': 80
};

// Add serving size options for common foods
const servingSizeOptions: Record<string, { sizes: Record<string, number>, defaultSize: string }> = {
  // Fruits
  'apple': { 
    sizes: { 'small': 0.7, 'medium': 1, 'large': 1.3 }, 
    defaultSize: 'medium' 
  },
  'banana': { 
    sizes: { 'small': 0.7, 'medium': 1, 'large': 1.3 }, 
    defaultSize: 'medium' 
  },
  'orange': { 
    sizes: { 'small': 0.7, 'medium': 1, 'large': 1.3 }, 
    defaultSize: 'medium' 
  },
  
  // Proteins
  'chicken breast': { 
    sizes: { '3 oz': 0.75, '4 oz': 1, '6 oz': 1.5, '8 oz': 2 }, 
    defaultSize: '4 oz' 
  },
  'steak': { 
    sizes: { '4 oz': 0.67, '6 oz': 1, '8 oz': 1.33, '12 oz': 2 }, 
    defaultSize: '6 oz' 
  },
  'salmon': { 
    sizes: { '3 oz': 0.75, '4 oz': 1, '6 oz': 1.5, '8 oz': 2 }, 
    defaultSize: '4 oz' 
  },
  'egg': { 
    sizes: { '1 egg': 1, '2 eggs': 2, '3 eggs': 3 }, 
    defaultSize: '1 egg' 
  },
  
  // Grains
  'rice': { 
    sizes: { '1/2 cup': 0.5, '1 cup': 1, '1.5 cups': 1.5, '2 cups': 2 }, 
    defaultSize: '1 cup' 
  },
  'pasta': { 
    sizes: { '1/2 cup': 0.5, '1 cup': 1, '1.5 cups': 1.5, '2 cups': 2 }, 
    defaultSize: '1 cup' 
  },
  'bread': { 
    sizes: { '1 slice': 1, '2 slices': 2 }, 
    defaultSize: '1 slice' 
  },
  'cereal': { 
    sizes: { '1/2 cup': 0.5, '1 cup': 1, '1.5 cups': 1.5, '2 cups': 2 }, 
    defaultSize: '1 cup' 
  },
  
  // Vegetables
  'broccoli': { 
    sizes: { '1/2 cup': 0.5, '1 cup': 1, '2 cups': 2 }, 
    defaultSize: '1 cup' 
  },
  'carrots': { 
    sizes: { '1/2 cup': 0.5, '1 cup': 1, '2 cups': 2 }, 
    defaultSize: '1 cup' 
  },
  'salad': { 
    sizes: { 'small': 0.5, 'medium': 1, 'large': 2 }, 
    defaultSize: 'medium' 
  },
  
  // Dairy
  'milk': { 
    sizes: { '1/2 cup': 0.5, '1 cup': 1, '2 cups': 2 }, 
    defaultSize: '1 cup' 
  },
  'yogurt': { 
    sizes: { 'small (4 oz)': 0.5, 'regular (8 oz)': 1, 'large (12 oz)': 1.5 }, 
    defaultSize: 'regular (8 oz)' 
  },
  'cheese': { 
    sizes: { '1 slice': 1, '2 slices': 2, '1 oz': 1, '2 oz': 2 }, 
    defaultSize: '1 oz' 
  },
  
  // Snacks
  'chips': { 
    sizes: { 'small bag (1 oz)': 1, 'medium bag (2.5 oz)': 2.5, 'large bag (5 oz)': 5 }, 
    defaultSize: 'small bag (1 oz)' 
  },
  'nuts': { 
    sizes: { '1/4 cup': 0.5, '1/2 cup': 1, '1 cup': 2 }, 
    defaultSize: '1/4 cup' 
  },
  'chocolate': { 
    sizes: { 'small piece': 0.5, 'standard bar': 1, 'large bar': 2 }, 
    defaultSize: 'standard bar' 
  }
};

// Common units for portion sizes
const commonUnits = [
  'serving(s)',
  'cup(s)',
  'oz',
  'g',
  'tbsp',
  'tsp',
  'piece(s)',
  'slice(s)',
  'ml',
  'plate',
  'bowl'
];

// Enhanced function to estimate calories based on food name and portion size
const estimateCalories = (foodName: string, portionSize: number = 1, unit: string = ''): number => {
  if (!foodName) return 0;
  
  const lowercaseName = foodName.toLowerCase().trim();
  
  // Direct match with portion size adjustment
  if (foodCalorieDatabase[lowercaseName]) {
    return foodCalorieDatabase[lowercaseName] * portionSize;
  }
  
  // Partial match with portion size adjustment
  for (const [food, calories] of Object.entries(foodCalorieDatabase)) {
    if (lowercaseName.includes(food)) {
      return calories * portionSize;
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
  if (lowercaseName.includes('breakfast')) return defaultCalories.breakfast * portionSize;
  if (lowercaseName.includes('lunch')) return defaultCalories.lunch * portionSize;
  if (lowercaseName.includes('dinner')) return defaultCalories.dinner * portionSize;
  if (lowercaseName.includes('snack')) return defaultCalories.snacks * portionSize;
  if (lowercaseName.includes('coffee')) return defaultCalories.coffee * portionSize;
  
  // If still no match, return a general estimate
  return 200 * portionSize;
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
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  // New state variables for edit and delete functionality
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<string | null>(null)
  
  // New state variables for portion sizes
  const [portionSize, setPortionSize] = useState('1')
  const [portionUnit, setPortionUnit] = useState('')
  const [availableServingSizes, setAvailableServingSizes] = useState<Record<string, number>>({})
  const [selectedServingSize, setSelectedServingSize] = useState('')
  
  // Toast notification state
  const [toast, setToast] = useState<{message: string, visible: boolean, type: 'success' | 'error'}>({
    message: '',
    visible: false,
    type: 'success'
  })
  
  // New state variables for auto-suggestions
  const [foodSuggestions, setFoodSuggestions] = useState<FoodSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentMeals, setRecentMeals] = useState<FoodSuggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Function to format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // Function to move date forward or backward
  const moveDate = (days: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + days)
    setCurrentDate(newDate)
  }
  
  // Function to get start and end of week
  const getWeekDates = (date: Date) => {
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - day); // Go to Sunday
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Go to Saturday
    
    return { startDate, endDate };
  }
  
  // Function to calculate stats for different time periods
  const calculateStats = (period: 'day' | 'week' | 'month') => {
    let relevantEntries: MealEntry[] = [];
    let daysInPeriod = 1;
    
    if (period === 'day') {
      // Just use today's entries
      relevantEntries = mealEntries;
    } else if (period === 'week') {
      // Get entries for the current week
      const { startDate, endDate } = getWeekDates(currentDate);
      daysInPeriod = 7;
      
      // We would need to fetch this data from the server
      // For now, we'll just use the current day's data as a placeholder
      relevantEntries = mealEntries;
    } else if (period === 'month') {
      // Get entries for the current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      daysInPeriod = endOfMonth.getDate();
      
      // We would need to fetch this data from the server
      // For now, we'll just use the current day's data as a placeholder
      relevantEntries = mealEntries;
    }
    
    // Calculate total calories
    const totalCalories = relevantEntries.reduce((sum, entry) => sum + entry.calories, 0);
    
    // Calculate calories by meal type
    const caloriesByType: Record<MealType, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snacks: 0,
      coffee: 0,
      custom: 0
    };
    
    relevantEntries.forEach(entry => {
      caloriesByType[entry.type] += entry.calories;
    });
    
    // Calculate water intake
    const totalWaterIntake = relevantEntries.reduce((sum, entry) => sum + (entry.waterIntake || 0), 0);
    
    // Calculate average daily calories (for week and month views)
    const avgDailyCalories = period !== 'day' ? Math.round(totalCalories / daysInPeriod) : totalCalories;
    
    return {
      totalCalories,
      caloriesByType,
      totalWaterIntake,
      avgDailyCalories,
      daysInPeriod
    };
  };
  
  // Function to show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({
      message,
      visible: true,
      type
    })
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({...prev, visible: false}))
    }, 3000)
  }
  
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
        
        // Load recent meals for suggestions
        await loadRecentMeals(currentUser.uid)
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
      const entries = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : null,
          count: data.count || 1
        }
      }) as MealEntry[]

      setMealEntries(entries)
    } catch (error) {
      console.error('Error loading meal entries:', error)
    }
  }
  
  // Function to load recent meals for suggestions
  const loadRecentMeals = async (userId: string) => {
    try {
      // Get entries from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const q = query(
        collection(db, 'food_entries'),
        where('userId', '==', userId),
        where('date', '>=', thirtyDaysAgo),
        orderBy('date', 'desc'),
        limit(50) // Limit to 50 recent entries
      );
      
      const querySnapshot = await getDocs(q);
      
      // Process entries to create unique food suggestions
      const mealMap = new Map<string, FoodSuggestion>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.name;
        const type = data.type;
        
        // Extract the base food name without count or meal type prefix
        let foodName = name;
        
        // Remove meal type prefix if present (e.g., "Breakfast: Oatmeal" -> "Oatmeal")
        const mealTypePrefix = type.charAt(0).toUpperCase() + type.slice(1) + ': ';
        if (foodName.startsWith(mealTypePrefix)) {
          foodName = foodName.substring(mealTypePrefix.length);
        }
        
        // Remove count suffix if present (e.g., "Oatmeal (x3)" -> "Oatmeal")
        foodName = foodName.replace(/\s*\(\d+x\)$/, '');
        
        // Remove portion info if present (e.g., "Oatmeal (1 cup)" -> "Oatmeal")
        foodName = foodName.replace(/\s*\([^)]+\)$/, '');
        
        // If we already have this food, update its frequency
        if (mealMap.has(foodName.toLowerCase())) {
          const existing = mealMap.get(foodName.toLowerCase())!;
          existing.frequency = (existing.frequency || 0) + 1;
          
          // Update last used date if this entry is more recent
          const entryDate = data.date.toDate();
          if (!existing.lastUsed || entryDate > existing.lastUsed) {
            existing.lastUsed = entryDate;
          }
        } else {
          // Otherwise add it as a new suggestion
          mealMap.set(foodName.toLowerCase(), {
            name: foodName,
            calories: data.calories,
            type: data.type,
            frequency: 1,
            lastUsed: data.date.toDate()
          });
        }
      });
      
      // Convert map to array and sort by frequency (most used first)
      const recentMealsList = Array.from(mealMap.values())
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
      
      setRecentMeals(recentMealsList);
      console.log("Loaded recent meals:", recentMealsList);
    } catch (error) {
      console.error('Error loading recent meals:', error);
    }
  };
  
  // Function to generate food suggestions based on input
  const generateFoodSuggestions = (input: string) => {
    if (!input.trim()) {
      // If input is empty, show recent meals sorted by frequency
      setFoodSuggestions(recentMeals.slice(0, 10));
      return;
    }
    
    const inputLower = input.toLowerCase().trim();
    const suggestions: FoodSuggestion[] = [];
    
    // First add matches from recent meals
    const recentMatches = recentMeals
      .filter(meal => meal.name.toLowerCase().includes(inputLower))
      .slice(0, 5); // Limit to 5 recent matches
    
    suggestions.push(...recentMatches);
    
    // Then add matches from food database
    const dbMatches: FoodSuggestion[] = [];
    
    for (const [food, calories] of Object.entries(foodCalorieDatabase)) {
      if (food.includes(inputLower) && !suggestions.some(s => s.name.toLowerCase() === food)) {
        // Format food name with proper capitalization
        const formattedName = food
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        dbMatches.push({
          name: formattedName,
          calories: calories
        });
        
        // Limit database matches to 10
        if (dbMatches.length >= 10) break;
      }
    }
    
    // Sort database matches by relevance (exact match first, then starts with, then includes)
    dbMatches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      if (aName === inputLower && bName !== inputLower) return -1;
      if (bName === inputLower && aName !== inputLower) return 1;
      if (aName.startsWith(inputLower) && !bName.startsWith(inputLower)) return -1;
      if (bName.startsWith(inputLower) && !aName.startsWith(inputLower)) return 1;
      return 0;
    });
    
    // Combine recent and database matches, removing duplicates
    suggestions.push(...dbMatches);
    
    // Limit to 15 total suggestions
    setFoodSuggestions(suggestions.slice(0, 15));
  };
  
  // Function to handle food name input change
  const handleFoodNameChange = (name: string) => {
    setNewMealName(name);
    setSearchTerm(name);
    
    // Generate suggestions based on input
    generateFoodSuggestions(name);
    
    // Show suggestions dropdown
    setShowSuggestions(true);
    
    // Continue with existing portion size logic
    if (!name) return; // Don't process empty names
    
    // Check if we have predefined serving sizes for this food
    const lowercaseName = name.toLowerCase().trim();
    
    // Reset serving size options
    setAvailableServingSizes({});
    setSelectedServingSize('');
    
    // Auto-detect unit based on food name
    let detectedUnit = '';
    
    // Check for exact match in serving size options
    let foundMatch = false;
    for (const [food, options] of Object.entries(servingSizeOptions)) {
      if (lowercaseName.includes(food)) {
        setAvailableServingSizes(options.sizes);
        setSelectedServingSize(options.defaultSize);
        foundMatch = true;
        break;
      }
    }
    
    // If no match in serving sizes, try to intelligently assign units
    if (!foundMatch) {
      // Liquids
      if (lowercaseName.includes('water') || 
          lowercaseName.includes('coffee') || 
          lowercaseName.includes('tea') || 
          lowercaseName.includes('juice') || 
          lowercaseName.includes('milk') || 
          lowercaseName.includes('soda') || 
          lowercaseName.includes('drink') || 
          lowercaseName.includes('smoothie') ||
          lowercaseName.includes('latte') ||
          lowercaseName.includes('espresso') ||
          lowercaseName.includes('cappuccino') ||
          lowercaseName.includes('chai') ||
          lowercaseName.includes('soup') ||
          lowercaseName.includes('broth') ||
          lowercaseName.includes('stew')) {
        
        if (lowercaseName.includes('coffee') || 
            lowercaseName.includes('tea') || 
            lowercaseName.includes('chai')) {
          setPortionSize('1');
          setPortionUnit('cup(s)');
        } else if (lowercaseName.includes('soup') || 
                  lowercaseName.includes('broth') || 
                  lowercaseName.includes('stew')) {
          setPortionSize('1');
          setPortionUnit('bowl');
        } else {
          setPortionSize('1');
          setPortionUnit('ml');
        }
      }
      // Grains and pasta
      else if (lowercaseName.includes('rice') || 
               lowercaseName.includes('pasta') || 
               lowercaseName.includes('cereal') || 
               lowercaseName.includes('oatmeal') || 
               lowercaseName.includes('quinoa') ||
               lowercaseName.includes('noodle') ||
               lowercaseName.includes('spaghetti') ||
               lowercaseName.includes('macaroni') ||
               lowercaseName.includes('biryani') ||
               lowercaseName.includes('pulao') ||
               lowercaseName.includes('risotto')) {
        setPortionSize('1');
        setPortionUnit('cup(s)');
      }
      // Bread and baked goods
      else if (lowercaseName.includes('bread') || 
               lowercaseName.includes('toast') || 
               lowercaseName.includes('bagel') || 
               lowercaseName.includes('muffin') || 
               lowercaseName.includes('roll') ||
               lowercaseName.includes('naan') ||
               lowercaseName.includes('roti') ||
               lowercaseName.includes('chapati') ||
               lowercaseName.includes('paratha') ||
               lowercaseName.includes('tortilla') ||
               lowercaseName.includes('pita') ||
               lowercaseName.includes('cake') ||
               lowercaseName.includes('pie')) {
        
        if (lowercaseName.includes('cake') || lowercaseName.includes('pie')) {
          setPortionSize('1');
          setPortionUnit('slice(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('piece(s)');
        }
      }
      // Fruits
      else if (lowercaseName.includes('apple') || 
               lowercaseName.includes('banana') || 
               lowercaseName.includes('orange') || 
               lowercaseName.includes('fruit') ||
               lowercaseName.includes('berry') ||
               lowercaseName.includes('berries') ||
               lowercaseName.includes('grape') ||
               lowercaseName.includes('melon') ||
               lowercaseName.includes('mango') ||
               lowercaseName.includes('pineapple')) {
        
        if (lowercaseName.includes('berry') || 
            lowercaseName.includes('berries') || 
            lowercaseName.includes('grape')) {
          setPortionSize('1');
          setPortionUnit('cup(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('piece(s)');
        }
      }
      // Vegetables
      else if (lowercaseName.includes('vegetable') || 
               lowercaseName.includes('broccoli') || 
               lowercaseName.includes('carrot') || 
               lowercaseName.includes('salad') ||
               lowercaseName.includes('spinach') ||
               lowercaseName.includes('kale') ||
               lowercaseName.includes('lettuce') ||
               lowercaseName.includes('tomato') ||
               lowercaseName.includes('potato') ||
               lowercaseName.includes('corn') ||
               lowercaseName.includes('pea') ||
               lowercaseName.includes('bean') ||
               lowercaseName.includes('okra') ||
               lowercaseName.includes('bhindi') ||
               lowercaseName.includes('aloo') ||
               lowercaseName.includes('gobi') ||
               lowercaseName.includes('palak')) {
        
        if (lowercaseName.includes('salad')) {
          setPortionSize('1');
          setPortionUnit('plate');
        } else if (lowercaseName.includes('potato') || 
                  lowercaseName.includes('aloo')) {
          setPortionSize('1');
          setPortionUnit('piece(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('cup(s)');
        }
      }
      // Meats
      else if (lowercaseName.includes('chicken') || 
               lowercaseName.includes('beef') || 
               lowercaseName.includes('steak') || 
               lowercaseName.includes('fish') || 
               lowercaseName.includes('meat') || 
               lowercaseName.includes('pork') ||
               lowercaseName.includes('lamb') ||
               lowercaseName.includes('turkey') ||
               lowercaseName.includes('salmon') ||
               lowercaseName.includes('tuna') ||
               lowercaseName.includes('shrimp') ||
               lowercaseName.includes('prawn') ||
               lowercaseName.includes('tandoori') ||
               lowercaseName.includes('tikka') ||
               lowercaseName.includes('kebab')) {
        
        if (lowercaseName.includes('kebab')) {
          setPortionSize('1');
          setPortionUnit('skewer(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('oz');
        }
      }
      // Eggs
      else if (lowercaseName.includes('egg') ||
               lowercaseName.includes('omelet') ||
               lowercaseName.includes('omelette')) {
        setPortionSize('1');
        setPortionUnit('piece(s)');
      }
      // Indian dishes
      else if (lowercaseName.includes('curry') ||
               lowercaseName.includes('masala') ||
               lowercaseName.includes('dal') ||
               lowercaseName.includes('paneer') ||
               lowercaseName.includes('samosa') ||
               lowercaseName.includes('pakora') ||
               lowercaseName.includes('chaat') ||
               lowercaseName.includes('korma') ||
               lowercaseName.includes('vindaloo') ||
               lowercaseName.includes('saag') ||
               lowercaseName.includes('chana')) {
        
        if (lowercaseName.includes('samosa') || 
            lowercaseName.includes('pakora')) {
          setPortionSize('1');
          setPortionUnit('piece(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('bowl');
        }
      }
      // Italian dishes
      else if (lowercaseName.includes('pizza') ||
               lowercaseName.includes('lasagna') ||
               lowercaseName.includes('pasta') ||
               lowercaseName.includes('risotto') ||
               lowercaseName.includes('gnocchi')) {
        
        if (lowercaseName.includes('pizza')) {
          setPortionSize('1');
          setPortionUnit('slice(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('serving(s)');
        }
      }
      // Mexican dishes
      else if (lowercaseName.includes('taco') ||
               lowercaseName.includes('burrito') ||
               lowercaseName.includes('enchilada') ||
               lowercaseName.includes('quesadilla') ||
               lowercaseName.includes('nachos')) {
        
        if (lowercaseName.includes('taco')) {
          setPortionSize('1');
          setPortionUnit('piece(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('serving(s)');
        }
      }
      // Asian dishes
      else if (lowercaseName.includes('sushi') ||
               lowercaseName.includes('roll') ||
               lowercaseName.includes('stir fry') ||
               lowercaseName.includes('fried rice') ||
               lowercaseName.includes('dumpling') ||
               lowercaseName.includes('spring roll') ||
               lowercaseName.includes('pad thai')) {
        
        if (lowercaseName.includes('sushi') || 
            lowercaseName.includes('roll') || 
            lowercaseName.includes('dumpling') || 
            lowercaseName.includes('spring roll')) {
          setPortionSize('1');
          setPortionUnit('piece(s)');
        } else {
          setPortionSize('1');
          setPortionUnit('serving(s)');
        }
      }
      // Snacks
      else if (lowercaseName.includes('chip') || 
               lowercaseName.includes('crisp') || 
               lowercaseName.includes('snack') || 
               lowercaseName.includes('nut') || 
               lowercaseName.includes('candy') ||
               lowercaseName.includes('chocolate') ||
               lowercaseName.includes('cookie') ||
               lowercaseName.includes('cracker')) {
        setPortionSize('1');
        setPortionUnit('serving(s)');
      }
      // Default
      else {
        setPortionSize('1');
        setPortionUnit('serving(s)');
      }
    }
  };
  
  // Function to select a suggestion
  const handleSelectSuggestion = (suggestion: FoodSuggestion) => {
    setNewMealName(suggestion.name);
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    
    // If the suggestion has a type and it's different from the current selection,
    // and we're not editing, update the meal type
    if (suggestion.type && !editingMeal && suggestion.type !== selectedMealType) {
      setSelectedMealType(suggestion.type);
    }
    
    // Check for serving size options
    const lowercaseName = suggestion.name.toLowerCase().trim();
    
    // Reset serving size options
    setAvailableServingSizes({});
    setSelectedServingSize('');
    
    // Check for exact match in serving size options
    for (const [food, options] of Object.entries(servingSizeOptions)) {
      if (lowercaseName.includes(food)) {
        setAvailableServingSizes(options.sizes);
        setSelectedServingSize(options.defaultSize);
        break;
      }
    }
  };
  
  // Function to handle editing a meal
  const handleEditMeal = (meal: MealEntry) => {
    setEditingMeal(meal);
    setSelectedMealType(meal.type);
    
    // Extract the base name without count information
    let displayName = meal.name;
    const mealTypeName = meal.type.charAt(0).toUpperCase() + meal.type.slice(1);
    
    // Remove meal type prefix if present
    if (displayName.startsWith(mealTypeName + ': ')) {
      displayName = displayName.substring((mealTypeName + ': ').length);
    }
    
    // Remove count suffix if present
    displayName = displayName.replace(/\s*\(\d+x\)$/, '');
    
    // Remove portion info if present
    displayName = displayName.replace(/\s*\([^)]+\)$/, '');
    
    setNewMealName(displayName);
    setSearchTerm(displayName); // Set search term for suggestions
    
    // Extract portion information from the name if present
    const portionMatch = meal.name.match(/\(([^)]+)\)/);
    if (portionMatch) {
      const portionInfo = portionMatch[1];
      // Try to parse portion size and unit
      const sizeMatch = portionInfo.match(/^([\d.]+)\s*(.+)?$/);
      if (sizeMatch) {
        setPortionSize(sizeMatch[1]);
        if (sizeMatch[2]) {
          setPortionUnit(sizeMatch[2]);
        }
      } else {
        // If no number found, it might be a predefined serving size
        setSelectedServingSize(portionInfo);
      }
    } else {
      // Reset portion fields if no portion info found
      setPortionSize('1');
      setPortionUnit('');
      setSelectedServingSize('');
    }
    
    setNewMealDescription(meal.description || '');
    setNewMealWaterIntake(meal.waterIntake?.toString() || '');
    
    if (meal.type === 'custom') {
      setCustomMealType(displayName);
    }
    
    // Generate suggestions based on the food name
    generateFoodSuggestions(displayName);
    
    setShowAddMealModal(true);
  };

  // Function to handle deleting a meal
  const handleDeleteMeal = async () => {
    if (!mealToDelete || !user) return;
    
    try {
      // Delete the meal from Firestore
      await deleteDoc(doc(db, 'food_entries', mealToDelete));
      
      // Show success toast
      showToast('Meal deleted successfully');
      
      // Refresh the meal entries
      await loadMealEntries(user.uid);
      
      // Close the confirmation dialog
      setShowDeleteConfirmation(false);
      setMealToDelete(null);
    } catch (error) {
      console.error('Error deleting meal:', error);
      showToast('Failed to delete meal. Please try again.', 'error');
    }
  };

  // Function to confirm deletion
  const confirmDeleteMeal = (mealId: string) => {
    setMealToDelete(mealId);
    setShowDeleteConfirmation(true);
  };

  // Modified handleAddMeal to update recent meals after adding
  const handleAddMeal = async () => {
    if (!user || !selectedMealType) return;

    try {
      console.log("Adding meal with type:", selectedMealType);
      
      // Ensure we have a valid meal type name with proper capitalization
      const mealTypeName = selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);
      const mealType = selectedMealType === 'custom' ? (customMealType || 'Custom Meal') : selectedMealType;
      console.log("Meal type:", mealType);
      
      // SIMPLIFIED: Create a basic meal with just the type if nothing else is provided
      // Use properly capitalized meal type name if no food name is provided
      const itemName = newMealName || mealTypeName;
      console.log("Item name:", itemName);
      
      // Default calories based on meal type
      const defaultCalories: Record<MealType, number> = {
        coffee: 100,
        breakfast: 400,
        lunch: 600,
        snacks: 200,
        dinner: 500,
        custom: 300
      };
      
      // Calculate calories - simplified to use defaults if needed
      let calculatedCalories = defaultCalories[selectedMealType as MealType];
      
      // Only try to calculate calories if a food name is provided
      if (newMealName) {
        // Calculate portion multiplier
        let portionMultiplier = 1;
        
        // If a serving size is selected, use its multiplier
        if (selectedServingSize && availableServingSizes[selectedServingSize]) {
          portionMultiplier = availableServingSizes[selectedServingSize];
          console.log("Using predefined serving size:", selectedServingSize, "multiplier:", portionMultiplier);
        } 
        // Otherwise use the manual portion size if provided
        else if (portionSize && !isNaN(parseFloat(portionSize))) {
          portionMultiplier = parseFloat(portionSize);
          console.log("Using manual portion size:", portionMultiplier);
        }
        
        // Try to calculate calories based on food name
        const foodCalories = estimateCalories(itemName, portionMultiplier);
        if (foodCalories > 0) {
          calculatedCalories = foodCalories;
        }
        console.log("Calculated calories:", calculatedCalories);
        
        // If there's a description, check if it contains food items to add calories
        if (newMealDescription) {
          const words = newMealDescription.split(' ');
          for (const word of words) {
            const wordCalories = estimateCalories(word);
            if (wordCalories > 0) {
              calculatedCalories += wordCalories;
              console.log("Added calories from description word:", word, wordCalories);
            }
          }
        }
      }
      
      // Format portion information for display
      let portionInfo = '';
      if (selectedServingSize) {
        portionInfo = selectedServingSize;
      } else if (portionSize && portionSize !== '1') {
        portionInfo = `${portionSize}${portionUnit ? ' ' + portionUnit : ''}`;
      }
      
      // Create display name with portion info if available
      const displayName = portionInfo ? `${itemName} (${portionInfo})` : itemName;
      
      // Include meal type in the name if it's not already part of the name
      const fullDisplayName = !itemName.toLowerCase().includes(mealType.toLowerCase()) 
        ? `${mealTypeName}: ${displayName}`
        : displayName;
      
      console.log("Final display name:", fullDisplayName);
      
      // SIMPLIFIED: Create a minimal meal entry with required fields
      const mealData: Omit<MealEntry, 'id'> = {
        userId: user.uid,
        date: currentDate,
        name: fullDisplayName,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        calories: Math.round(calculatedCalories),
        items: [itemName], // Always include at least the meal type
        completed: true,
        type: selectedMealType as MealType,
        count: 1,
        lastUpdated: new Date()
      };
      
      // Only add optional fields if they have values
      if (newMealDescription) {
        mealData.description = newMealDescription;
      }
      
      if (newMealWaterIntake) {
        mealData.waterIntake = parseInt(newMealWaterIntake);
      } else if (selectedMealType === 'coffee') {
        // Default water intake for coffee
        mealData.waterIntake = 250;
      }

      console.log("Saving meal data:", mealData);

      if (editingMeal) {
        // Update existing meal but preserve the count
        const updatedData = {
          ...mealData,
          count: editingMeal.count || 1 // Preserve the existing count
        };
        
        await updateDoc(doc(db, 'food_entries', editingMeal.id), updatedData);
        setEditingMeal(null);
        showToast(`${mealTypeName} updated successfully`);
      } else {
        // Add new meal
        await addDoc(collection(db, 'food_entries'), mealData);
        showToast(`${mealTypeName} added successfully`);
      }
      
      // Refresh the meal entries
      await loadMealEntries(user.uid);
      
      // Refresh recent meals for suggestions
      await loadRecentMeals(user.uid);
      
      setShowAddMealModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding/updating meal:', error);
      showToast('Failed to add meal. Please try again.', 'error');
    }
  };

  // Modified resetForm to clear suggestion state
  const resetForm = () => {
    setSelectedMealType(null);
    setNewMealName('');
    setNewMealDescription('');
    setNewMealWaterIntake('');
    setCustomMealType('');
    setEditingMeal(null);
    setPortionSize('1');
    setPortionUnit('');
    setAvailableServingSizes({});
    setSelectedServingSize('');
    setSearchTerm('');
    setShowSuggestions(false);
  };
  
  const openAddConnectionModal = () => {
    setConnectionEmail('')
    setConnectionError('')
    setShowAddConnectionModal(true)
  }
  
  const closeAddMealModal = () => {
    setShowAddMealModal(false)
  }
  
  // Function to quickly add a meal with minimal information
  const handleQuickAddMeal = async (type: MealType) => {
    if (!user) return;
    
    try {
      console.log("Quick adding meal of type:", type);
      
      // Create a default meal name based on type
      const mealName = type.charAt(0).toUpperCase() + type.slice(1);
      
      // Get default calories for this meal type
      const defaultCalories: Record<MealType, number> = {
        coffee: 100,
        breakfast: 400,
        lunch: 600,
        snacks: 200,
        dinner: 500,
        custom: 300
      };
      
      // Find entries of the same type from today
      const sameTypeMeals = mealEntries.filter(entry => 
        entry.type === type && 
        entry.date.toDateString() === currentDate.toDateString()
      );
      
      // Sort by most recent first
      sameTypeMeals.sort((a, b) => {
        const aTime = a.lastUpdated || new Date(a.date);
        const bTime = b.lastUpdated || new Date(b.date);
        return bTime.getTime() - aTime.getTime();
      });
      
      const now = new Date();
      
      // Check if there's any existing entry of this type today
      if (sameTypeMeals.length > 0) {
        // Update the most recent entry instead of creating a new one
        const recentMeal = sameTypeMeals[0];
        console.log("Found existing meal to update:", recentMeal);
        
        // Increment the count or set to 2 if it doesn't exist
        const newCount = (recentMeal.count || 1) + 1;
        
        // Calculate new calories based on count
        const newCalories = defaultCalories[type] * newCount;
        
        // Update the meal
        await updateDoc(doc(db, 'food_entries', recentMeal.id), {
          count: newCount,
          calories: newCalories,
          lastUpdated: now
        });
        
        // Show success message
        showToast(`${mealName} updated (${newCount}x)`);
      } else {
        // Create a new meal entry
        const mealData: Omit<MealEntry, 'id'> = {
          userId: user.uid,
          date: currentDate,
          name: mealName,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          calories: defaultCalories[type],
          items: [mealName],
          completed: true,
          type: type,
          count: 1,
          lastUpdated: now
        };
        
        // Add water intake for coffee
        if (type === 'coffee') {
          mealData.waterIntake = 250;
        }
        
        console.log("Creating new meal data:", mealData);
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'food_entries'), mealData);
        console.log("Document written with ID: ", docRef.id);
        
        // Show a toast notification
        showToast(`${mealName} added successfully`);
      }
      
      // Refresh the meal entries
      await loadMealEntries(user.uid);
    } catch (error) {
      console.error('Error quick-adding meal:', error);
      showToast('Failed to add meal. Please try again.', 'error');
    }
  };
  
  // Function to decrease meal count
  const handleDecreaseMealCount = async (meal: MealEntry) => {
    if (!user || !meal.id) return;
    
    try {
      // Get current count
      const currentCount = meal.count || 1;
      
      if (currentCount <= 1) {
        // If count is 1 or less, delete the meal
        await deleteDoc(doc(db, 'food_entries', meal.id));
        showToast(`${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)} removed`);
      } else {
        // Otherwise decrease the count
        const newCount = currentCount - 1;
        
        // Calculate calories per serving
        const caloriesPerServing = Math.round(meal.calories / currentCount);
        
        // Calculate new total calories
        const newCalories = caloriesPerServing * newCount;
        
        // Update the meal
        await updateDoc(doc(db, 'food_entries', meal.id), {
          count: newCount,
          calories: newCalories,
          lastUpdated: new Date()
        });
        
        showToast(`${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)} updated (${newCount}x)`);
      }
      
      // Refresh the meal entries
      await loadMealEntries(user.uid);
    } catch (error) {
      console.error('Error decreasing meal count:', error);
      showToast('Failed to update meal. Please try again.', 'error');
    }
  };
  
  // Function to handle mouse down on meal button
  const handleMealButtonMouseDown = (type: MealType) => {
    // Start a timer for long press
    const timer = setTimeout(() => {
      // Show the add meal modal for detailed entry
      setSelectedMealType(type);
      setShowAddMealModal(true);
      setLongPressTimer(null);
    }, 500); // 500ms for long press
    
    setLongPressTimer(timer);
  };
  
  // Function to handle mouse up on meal button
  const handleMealButtonMouseUp = (type: MealType) => {
    // If timer exists, it means the button wasn't long-pressed
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Quick add a meal of this type
      handleQuickAddMeal(type);
    }
  };
  
  // Function to handle touch start on meal button (for mobile)
  const handleMealButtonTouchStart = (type: MealType) => {
    // Start a timer for long press
    const timer = setTimeout(() => {
      // Show the add meal modal for detailed entry
      setSelectedMealType(type);
      setShowAddMealModal(true);
      setLongPressTimer(null);
    }, 500); // 500ms for long press
    
    setLongPressTimer(timer);
  };
  
  // Function to handle touch end on meal button (for mobile)
  const handleMealButtonTouchEnd = (type: MealType) => {
    // If timer exists, it means the button wasn't long-pressed
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Quick add a meal of this type
      handleQuickAddMeal(type);
    }
  };

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
  
  // Calculate stats for the current view
  const stats = calculateStats(view);
  
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

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-md shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        } transition-opacity duration-300 ease-in-out`}>
          <div className="flex items-center">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Navigation and View Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <button
              onClick={() => moveDate(-1)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-2xl font-bold text-gray-900">
              {formatDate(currentDate)}
            </div>
            <button
              onClick={() => moveDate(1)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="relative">
            <button 
              className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-3 w-full sm:w-auto justify-between"
              onClick={() => document.getElementById('view-dropdown')?.classList.toggle('hidden')}
            >
              <span className="font-medium text-gray-700">View: {view.charAt(0).toUpperCase() + view.slice(1)}</span>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div id="view-dropdown" className="hidden absolute right-0 z-10 mt-2 bg-white rounded-md shadow-lg border border-gray-200 w-full sm:w-40">
              <div 
                className={`p-3 cursor-pointer ${view === 'day' ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => {
                  setView('day');
                  document.getElementById('view-dropdown')?.classList.add('hidden');
                }}
              >
                Day
              </div>
              <div 
                className={`p-3 cursor-pointer ${view === 'week' ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => {
                  setView('week');
                  document.getElementById('view-dropdown')?.classList.add('hidden');
                }}
              >
                Week
              </div>
              <div 
                className={`p-3 cursor-pointer ${view === 'month' ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => {
                  setView('month');
                  document.getElementById('view-dropdown')?.classList.add('hidden');
                }}
              >
                Month
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Dashboard */}
        <DashboardStats 
          totalCalories={stats.totalCalories}
          caloriesByType={stats.caloriesByType}
          totalWaterIntake={stats.totalWaterIntake}
          avgDailyCalories={stats.avgDailyCalories}
          daysInPeriod={stats.daysInPeriod}
          period={view}
        />
        
        {/* Week View */}
        {view === 'week' && (
          <WeekCalendar 
            currentDate={currentDate}
            mealEntries={mealEntries}
            onSelectDate={(date) => {
              setCurrentDate(date);
              setView('day');
            }}
          />
        )}
        
        {/* Calendar View (Month) */}
        {view === 'month' && (
          <MonthCalendar 
            currentDate={currentDate}
            mealEntries={mealEntries}
            onSelectDate={(date) => {
              setCurrentDate(date);
              setView('day');
            }}
          />
        )}

        {/* Meal Type Color Legend */}
        {view === 'day' && mealEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Meal Types</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-xs text-gray-600">Breakfast</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs text-gray-600">Lunch</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-xs text-gray-600">Dinner</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                <span className="text-xs text-gray-600">Snacks</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-700 rounded-full mr-1"></div>
                <span className="text-xs text-gray-600">Coffee</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
                <span className="text-xs text-gray-600">Custom</span>
              </div>
            </div>
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
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  entry.type === 'breakfast' ? 'border-yellow-500' : 
                  entry.type === 'lunch' ? 'border-green-500' : 
                  entry.type === 'dinner' ? 'border-blue-500' : 
                  entry.type === 'snacks' ? 'border-purple-500' : 
                  entry.type === 'coffee' ? 'border-amber-700' : 'border-gray-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">{entry.name}</h3>
                      {(entry.count && entry.count > 1) && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          x{entry.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{entry.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 mr-4">
                      {entry.calories} kcal
                    </span>
                    
                    {/* Count adjustment buttons */}
                    {entry.count !== undefined && (
                      <div className="flex items-center mr-2">
                        <button
                          onClick={() => handleDecreaseMealCount(entry)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          aria-label="Decrease count"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleQuickAddMeal(entry.type)}
                          className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          aria-label="Increase count"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
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

      {/* Add/Edit Meal Modal */}
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
                  Meal Name <span className="text-xs text-gray-500">(optional)</span>
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

            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Food Item <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleFoodNameChange(e.target.value)}
                onFocus={() => {
                  generateFoodSuggestions(searchTerm);
                  setShowSuggestions(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="Enter food item (e.g. Chicken Sandwich)"
                autoComplete="off"
              />
              
              {/* Food Suggestions Dropdown */}
              {showSuggestions && foodSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                  {foodSuggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <span className="text-gray-900">{suggestion.name}</span>
                        {suggestion.frequency && (
                          <span className="ml-2 text-xs text-gray-500">
                            (used {suggestion.frequency} times)
                          </span>
                        )}
                      </div>
                      <span className="text-gray-600 text-sm">{suggestion.calories} cal</span>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                Calories will be calculated based on the food item
              </p>
            </div>

            {/* Serving Size Options */}
            {Object.keys(availableServingSizes).length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serving Size <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <select
                  value={selectedServingSize}
                  onChange={(e) => setSelectedServingSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                >
                  {Object.keys(availableServingSizes).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Portion Size */}
            {Object.keys(availableServingSizes).length === 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portion Size <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={portionSize}
                    onChange={(e) => setPortionSize(e.target.value)}
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    placeholder="1"
                    min="0.25"
                    step="0.25"
                  />
                  <select
                    value={portionUnit}
                    onChange={(e) => setPortionUnit(e.target.value)}
                    className="w-2/3 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    <option value="">Select unit (optional)</option>
                    {commonUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <textarea
                value={newMealDescription}
                onChange={(e) => setNewMealDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                rows={2}
                placeholder="Enter description or additional items"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Water/Juice Intake (ml) <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                type="number"
                value={newMealWaterIntake}
                onChange={(e) => setNewMealWaterIntake(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="Enter water/juice intake"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
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
                className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium text-lg shadow-sm"
              >
                {editingMeal ? 'Update' : 'Add'} Meal
              </button>
            </div>
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