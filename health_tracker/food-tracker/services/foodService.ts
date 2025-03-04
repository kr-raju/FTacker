import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;

export type FoodEntry = {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  mealType: MealType;
  calories: number;
  date: Timestamp | Date;
  time: string;
  createdAt?: any;
  updatedAt?: any;
  // Additional nutritional info could be added here
};

/**
 * Adds a new food entry
 */
export const addFoodEntry = async (foodEntry: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Create a new document in the food_entries collection
    const entryRef = doc(collection(db, 'food_entries'));
    
    // Make sure date is a Firestore Timestamp
    const entry = {
      ...foodEntry,
      date: foodEntry.date instanceof Date 
        ? Timestamp.fromDate(foodEntry.date) 
        : foodEntry.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(entryRef, entry);
    
    return { id: entryRef.id, ...entry };
  } catch (error) {
    console.error('Error adding food entry:', error);
    throw error;
  }
};

/**
 * Gets food entries for a specific date
 */
export const getFoodEntriesByDate = async (userId: string, date: Date) => {
  try {
    // Convert date to start/end of day for query
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Query for entries within the date range
    const entriesQuery = query(
      collection(db, 'food_entries'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'asc')
    );
    
    const snapshot = await getDocs(entriesQuery);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error getting food entries:', error);
    throw error;
  }
};

/**
 * Gets food entries for a date range (useful for week/month views)
 */
export const getFoodEntriesByDateRange = async (userId: string, startDate: Date, endDate: Date) => {
  try {
    // Convert dates to Firestore Timestamps
    const start = Timestamp.fromDate(new Date(startDate));
    const end = Timestamp.fromDate(new Date(endDate));
    
    // Query for entries within the date range
    const entriesQuery = query(
      collection(db, 'food_entries'),
      where('userId', '==', userId),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc')
    );
    
    const snapshot = await getDocs(entriesQuery);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error getting food entries:', error);
    throw error;
  }
};

/**
 * Gets a single food entry by ID
 */
export const getFoodEntry = async (entryId: string) => {
  try {
    const entryDoc = await getDoc(doc(db, 'food_entries', entryId));
    
    if (!entryDoc.exists()) {
      throw new Error('Food entry not found');
    }
    
    return { id: entryDoc.id, ...entryDoc.data() };
  } catch (error) {
    console.error('Error getting food entry:', error);
    throw error;
  }
};

/**
 * Updates a food entry
 */
export const updateFoodEntry = async (entryId: string, data: Partial<FoodEntry>, userId: string) => {
  try {
    const entryRef = doc(db, 'food_entries', entryId);
    const entryDoc = await getDoc(entryRef);
    
    if (!entryDoc.exists()) {
      throw new Error('Food entry not found');
    }
    
    const entryData = entryDoc.data();
    
    // Ensure user is authorized to update this entry
    if (entryData.userId !== userId) {
      throw new Error('Unauthorized to update this food entry');
    }
    
    // Convert date to Timestamp if it's a Date object
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    if (data.date && data.date instanceof Date) {
      updateData.date = Timestamp.fromDate(data.date);
    }
    
    await updateDoc(entryRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating food entry:', error);
    throw error;
  }
};

/**
 * Deletes a food entry
 */
export const deleteFoodEntry = async (entryId: string, userId: string) => {
  try {
    const entryRef = doc(db, 'food_entries', entryId);
    const entryDoc = await getDoc(entryRef);
    
    if (!entryDoc.exists()) {
      throw new Error('Food entry not found');
    }
    
    const entryData = entryDoc.data();
    
    // Ensure user is authorized to delete this entry
    if (entryData.userId !== userId) {
      throw new Error('Unauthorized to delete this food entry');
    }
    
    await deleteDoc(entryRef);
    return true;
  } catch (error) {
    console.error('Error deleting food entry:', error);
    throw error;
  }
};

/**
 * Gets the total calories for a specific date
 */
export const getTotalCaloriesByDate = async (userId: string, date: Date) => {
  try {
    const entries = await getFoodEntriesByDate(userId, date) as (FoodEntry & { id: string })[];
    return entries.reduce((total, entry) => total + (entry.calories || 0), 0);
  } catch (error) {
    console.error('Error getting total calories:', error);
    throw error;
  }
}; 