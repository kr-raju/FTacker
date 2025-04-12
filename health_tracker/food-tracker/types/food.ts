// Food-related types for the application

/**
 * Types of meals a food entry can be categorized as
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'coffee' | 'custom';

/**
 * Represents a food entry in the system
 */
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
 * Type for food suggestions that may appear in autocomplete
 */
export type FoodSuggestion = {
  name: string;
  calories: number;
  type?: MealType;
  frequency?: number; // How often this has been used
  lastUsed?: Date;   // When it was last used
};

/**
 * Type for a meal entry (collection of food items)
 */
export type MealEntry = {
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
  imageId?: string; // Reference to the food image
  isFromImage?: boolean; // Flag to indicate if entry was created from an image
}; 