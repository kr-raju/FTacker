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
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'coffee' | 'custom';

export interface FoodEntry {
  id?: string;
  userId: string;
  name: string;
  calories: number;
  date: Date;
  time: string;
  type: MealType;
  completed: boolean;
  description?: string;
  waterIntake?: number;
  items?: string[];
  count?: number;
  lastUpdated?: Date;
  imageId?: string; // Reference to the food image
  isFromImage?: boolean; // Flag to indicate if entry was created from an image
}

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
 * Gets food entries for a specific date range
 */
export const getFoodEntriesByDate = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FoodEntry[]> => {
  try {
    const q = query(
      collection(db, 'food_entries'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        calories: data.calories,
        date: data.date.toDate(),
        time: data.time,
        type: data.type,
        completed: data.completed,
        description: data.description,
        waterIntake: data.waterIntake,
        items: data.items,
        count: data.count || 1,
        lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : undefined,
        imageId: data.imageId,
        isFromImage: data.isFromImage || false
      } as FoodEntry;
    });

    return entries;
  } catch (error) {
    console.error('Error getting food entries by date range:', error);
    return [];
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
 * Gets total calories for a specific date
 */
export const getTotalCaloriesByDate = async (userId: string, date: Date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const entries = await getFoodEntriesByDate(userId, startOfDay, endOfDay);
    return entries.reduce((total, entry) => total + (entry.calories || 0), 0);
  } catch (error) {
    console.error('Error getting total calories:', error);
    return 0;
  }
}; 