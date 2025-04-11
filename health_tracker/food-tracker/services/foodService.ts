import { 
  db, 
  serverTimestamp, 
  formatTimestamp, 
  getProvider,
  translateFieldName,
  getCollection
} from './dbService';
import { DB_TABLES } from './dbConfig';
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
  Timestamp,
  DocumentReference,
  DocumentData,
  limit as firestoreLimit
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

// Firebase document handler interface
interface FirebaseDocumentHandler {
  id: string;
  set: (data: any) => Promise<any>;
  update: (data: any) => Promise<any>;
  delete: () => Promise<any>;
  get: () => Promise<any>;
  data: () => any;
}

/**
 * Add a food entry to the database
 * @param entry Food entry data
 * @returns Food entry with ID
 */
export const addFoodEntry = async (entry: Omit<FoodEntry, 'id'>): Promise<FoodEntry & { id: string }> => {
  try {
    const now = new Date();
    
    if (getProvider() === 'supabase') {
      // Prepare data for Supabase (snake_case)
      const entryData = {
        user_id: entry.userId,
        name: entry.name,
        calories: entry.calories,
        date: entry.date.toISOString(),
        time: entry.time,
        type: entry.type,
        completed: entry.completed,
        description: entry.description,
        water_intake: entry.waterIntake,
        items: entry.items,
        count: entry.count || 1,
        last_updated: now.toISOString(),
        image_id: entry.imageId,
        is_from_image: entry.isFromImage || false,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      
      // Insert into Supabase
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .insert(entryData)
        .select();
        
      if (error) throw error;
      
      // Convert response to camelCase
      const result = data[0];
      return {
        id: result.id,
        userId: result.user_id,
        name: result.name,
        calories: result.calories,
        date: new Date(result.date),
        time: result.time,
        type: result.type,
        completed: result.completed,
        description: result.description,
        waterIntake: result.water_intake,
        items: result.items,
        count: result.count,
        lastUpdated: new Date(result.last_updated),
        imageId: result.image_id,
        isFromImage: result.is_from_image
      };
    } else {
      // Firebase implementation
      const foodEntriesCollection = getCollection(DB_TABLES.FOOD_ENTRIES);
      
      if (!foodEntriesCollection || !foodEntriesCollection.doc) {
        throw new Error('Failed to get food entries collection');
      }
      
      // Create doc reference
      const docRef = foodEntriesCollection.doc() as DocumentReference<DocumentData>;
      
      const entryData = {
        ...entry,
        count: entry.count || 1,
        lastUpdated: serverTimestamp(),
        isFromImage: entry.isFromImage || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Use Firebase setDoc
      await setDoc(docRef, entryData);
      
      return {
        ...entry,
        id: docRef.id,
        count: entry.count || 1,
        lastUpdated: now
      };
    }
  } catch (error) {
    console.error('Error adding food entry:', error);
    throw error;
  }
};

/**
 * Update a food entry in the database
 * @param entryId Food entry ID
 * @param data Updated food entry data
 * @returns Success status
 */
export const updateFoodEntry = async (entryId: string, data: Partial<FoodEntry>): Promise<boolean> => {
  try {
    const now = new Date();
    
    if (getProvider() === 'supabase') {
      // Convert data to snake_case for Supabase
      const updateData: Record<string, any> = {};
      
      // Loop through properties and convert to snake_case
      Object.entries(data).forEach(([key, value]) => {
        // Skip id since we're using it in the query
        if (key === 'id') return;
        
        const snakeKey = translateFieldName(key);
        
        // Handle date objects
        if (value instanceof Date) {
          updateData[snakeKey] = value.toISOString();
        } else {
          updateData[snakeKey] = value;
        }
      });
      
      // Add updated timestamp
      updateData.updated_at = now.toISOString();
      
      // Update in Supabase
      const { error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .update(updateData)
        .eq('id', entryId);
        
      if (error) throw error;
    } else {
      // Firebase implementation
      const foodEntriesCollection = getCollection(DB_TABLES.FOOD_ENTRIES);
      
      if (!foodEntriesCollection || !foodEntriesCollection.doc) {
        throw new Error('Failed to get food entries collection');
      }
      
      const updateData: Record<string, any> = { ...data };
      
      // Remove id from update data
      delete updateData.id;
      
      // Add updated timestamp
      updateData.updatedAt = serverTimestamp();
      
      // Update in Firebase using Firebase's updateDoc
      const docRef = doc(db as any, DB_TABLES.FOOD_ENTRIES, entryId);
      await updateDoc(docRef, updateData);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating food entry:', error);
    return false;
  }
};

/**
 * Delete a food entry from the database
 * @param entryId Food entry ID
 * @returns Success status
 */
export const deleteFoodEntry = async (entryId: string): Promise<boolean> => {
  try {
    if (getProvider() === 'supabase') {
      // Delete from Supabase
      const { error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .delete()
        .eq('id', entryId);
        
      if (error) throw error;
    } else {
      // Delete from Firebase using Firebase's deleteDoc
      const docRef = doc(db as any, DB_TABLES.FOOD_ENTRIES, entryId);
      await deleteDoc(docRef);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting food entry:', error);
    return false;
  }
};

/**
 * Get food entries by date range
 * @param userId User ID
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of food entries
 */
export const getFoodEntriesByDate = async (
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<FoodEntry[]> => {
  try {
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .select('*')
        .eq('user_id', userId)
        .gte('date', startISO)
        .lte('date', endISO)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Convert snake_case to camelCase
      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        calories: item.calories,
        date: new Date(item.date),
        time: item.time,
        type: item.type,
        completed: item.completed,
        description: item.description,
        waterIntake: item.water_intake,
        items: item.items,
        count: item.count,
        lastUpdated: item.last_updated ? new Date(item.last_updated) : undefined,
        imageId: item.image_id,
        isFromImage: item.is_from_image
      }));
    } else {
      // Firebase implementation
      const q = query(
        collection(db as any, DB_TABLES.FOOD_ENTRIES),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      return querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name,
          calories: data.calories,
          date: formatTimestamp(data.date),
          time: data.time,
          type: data.type,
          completed: data.completed,
          description: data.description,
          waterIntake: data.waterIntake,
          items: data.items,
          count: data.count,
          lastUpdated: data.lastUpdated ? formatTimestamp(data.lastUpdated) : undefined,
          imageId: data.imageId,
          isFromImage: data.isFromImage
        };
      });
    }
  } catch (error) {
    console.error('Error getting food entries by date:', error);
    return [];
  }
};

/**
 * Get recent food entries
 * @param userId User ID
 * @param limit Number of entries to return
 * @returns Array of recent food entries
 */
export const getRecentFoodEntries = async (
  userId: string,
  limit: number = 30
): Promise<FoodEntry[]> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString())
        .order('date', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Convert snake_case to camelCase
      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        calories: item.calories,
        date: new Date(item.date),
        time: item.time,
        type: item.type,
        completed: item.completed,
        description: item.description,
        waterIntake: item.water_intake,
        items: item.items,
        count: item.count,
        lastUpdated: item.last_updated ? new Date(item.last_updated) : undefined,
        imageId: item.image_id,
        isFromImage: item.is_from_image
      }));
    } else {
      // Firebase implementation
      const q = query(
        collection(db as any, DB_TABLES.FOOD_ENTRIES),
        where('userId', '==', userId),
        where('date', '>=', thirtyDaysAgo),
        orderBy('date', 'desc'),
        firestoreLimit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      return querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name,
          calories: data.calories,
          date: formatTimestamp(data.date),
          time: data.time,
          type: data.type,
          completed: data.completed,
          description: data.description,
          waterIntake: data.waterIntake,
          items: data.items,
          count: data.count,
          lastUpdated: data.lastUpdated ? formatTimestamp(data.lastUpdated) : undefined,
          imageId: data.imageId,
          isFromImage: data.isFromImage
        };
      });
    }
  } catch (error) {
    console.error('Error getting recent food entries:', error);
    return [];
  }
};

/**
 * Gets food entries for a date range (useful for week/month views)
 */
export const getFoodEntriesByDateRange = async (userId: string, startDate: Date, endDate: Date) => {
  try {
    // Convert dates to ISO strings or Firestore Timestamps based on provider
    if (getProvider() === 'firebase') {
      const start = Timestamp.fromDate(new Date(startDate));
      const end = Timestamp.fromDate(new Date(endDate));
      
      // Query for entries within the date range
      const q = query(
        collection(db as any, 'food_entries'),
        where('userId', '==', userId),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
    } else {
      // Use the Supabase implementation 
      return await getFoodEntriesByDate(userId, startDate, endDate);
    }
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
    if (getProvider() === 'firebase') {
      const entryDoc = await getDoc(doc(db as any, 'food_entries', entryId));
      
      if (!entryDoc.exists()) {
        throw new Error('Food entry not found');
      }
      
      return { id: entryDoc.id, ...entryDoc.data() };
    } else {
      // Supabase implementation
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .select('*')
        .eq('id', entryId)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        throw new Error('Food entry not found');
      }
      
      // Convert snake_case to camelCase
      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        calories: data.calories,
        date: new Date(data.date),
        time: data.time,
        type: data.type,
        completed: data.completed,
        description: data.description,
        waterIntake: data.water_intake,
        items: data.items,
        count: data.count,
        lastUpdated: data.last_updated ? new Date(data.last_updated) : undefined,
        imageId: data.image_id,
        isFromImage: data.is_from_image
      };
    }
  } catch (error) {
    console.error('Error getting food entry:', error);
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