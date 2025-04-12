import * as dbProvider from './db-provider';

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
    // Create a document with our database provider
    const entry = await dbProvider.createDocument('food_entries', {
      ...foodEntry,
      // Ensure date is correctly converted for storage
      date: foodEntry.date
    });
    
    return {
      ...entry,
      // Ensure the date is a JavaScript Date object for the client
      date: foodEntry.date instanceof Date ? foodEntry.date : new Date(foodEntry.date)
    };
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
    // For simplicity, we'll query all entries for the user
    // and then filter by date in JavaScript
    // In a production environment, we'd create proper database filters
    const allEntries = await dbProvider.queryDocuments('food_entries', { userId });
    
    // Filter entries within the date range
    const entriesInRange = allEntries.filter(entry => {
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });
    
    // Convert data formats
    return entriesInRange.map(entry => ({
      id: entry.id,
      userId: entry.userId,
      name: entry.name,
      calories: entry.calories,
      date: entry.date instanceof Date ? entry.date : new Date(entry.date),
      time: entry.time,
      type: entry.type,
      completed: entry.completed,
      description: entry.description,
      waterIntake: entry.waterIntake,
      items: entry.items,
      count: entry.count || 1,
      lastUpdated: entry.lastUpdated ? 
        (entry.lastUpdated instanceof Date ? entry.lastUpdated : new Date(entry.lastUpdated)) 
        : undefined,
      imageId: entry.imageId,
      isFromImage: entry.isFromImage || false
    }));
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
    // This is essentially the same as getFoodEntriesByDate
    // Kept for backward compatibility
    return getFoodEntriesByDate(userId, startDate, endDate);
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
    const entry = await dbProvider.getDocument('food_entries', entryId);
    
    if (!entry) {
      throw new Error('Food entry not found');
    }
    
    return {
      ...entry,
      date: entry.date instanceof Date ? entry.date : new Date(entry.date),
      lastUpdated: entry.lastUpdated ? 
        (entry.lastUpdated instanceof Date ? entry.lastUpdated : new Date(entry.lastUpdated)) 
        : undefined
    };
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
    // Get the current entry to verify ownership
    const entry = await dbProvider.getDocument('food_entries', entryId);
    
    if (!entry) {
      throw new Error('Food entry not found');
    }
    
    // Ensure user is authorized to update this entry
    if (entry.userId !== userId) {
      throw new Error('Unauthorized to update this food entry');
    }
    
    // Update the entry
    await dbProvider.updateDocument('food_entries', entryId, {
      ...data,
      // Ensure date is correctly handled
      date: data.date instanceof Date ? data.date : data.date
    });
    
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
    // Get the current entry to verify ownership
    const entry = await dbProvider.getDocument('food_entries', entryId);
    
    if (!entry) {
      throw new Error('Food entry not found');
    }
    
    // Ensure user is authorized to delete this entry
    if (entry.userId !== userId) {
      throw new Error('Unauthorized to delete this food entry');
    }
    
    // Delete the entry
    await dbProvider.deleteDocument('food_entries', entryId);
    
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