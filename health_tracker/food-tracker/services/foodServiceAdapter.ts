import { FoodEntry, MealType as FoodServiceMealType } from './foodService';
import { MealEntry, MealType as DashboardMealType } from '../types/index';

/**
 * Converts a FoodEntry from the service to a MealEntry for the dashboard
 */
export const convertFoodEntryToMealEntry = (foodEntry: FoodEntry): MealEntry => {
  return {
    id: foodEntry.id || '',
    userId: foodEntry.userId,
    date: foodEntry.date,
    name: foodEntry.name,
    time: foodEntry.time || '',
    calories: foodEntry.calories,
    items: foodEntry.items || [],
    completed: foodEntry.completed,
    type: foodEntry.type as DashboardMealType,
    description: foodEntry.description,
    waterIntake: foodEntry.waterIntake,
    count: foodEntry.count,
    lastUpdated: foodEntry.lastUpdated
  };
};

/**
 * Converts a MealEntry from the dashboard to a FoodEntry for the service
 */
export const convertMealEntryToFoodEntry = (mealEntry: MealEntry): Omit<FoodEntry, 'id'> => {
  return {
    userId: mealEntry.userId,
    name: mealEntry.name,
    calories: mealEntry.calories,
    date: mealEntry.date,
    time: mealEntry.time,
    type: mealEntry.type as FoodServiceMealType,
    completed: mealEntry.completed,
    description: mealEntry.description,
    waterIntake: mealEntry.waterIntake,
    items: mealEntry.items,
    count: mealEntry.count,
    lastUpdated: mealEntry.lastUpdated
  };
};

/**
 * Converts an array of FoodEntry objects to MealEntry objects
 */
export const convertFoodEntriesToMealEntries = (foodEntries: FoodEntry[]): MealEntry[] => {
  return foodEntries.map(convertFoodEntryToMealEntry);
};

/**
 * Converts an array of MealEntry objects to FoodEntry objects
 */
export const convertMealEntriesToFoodEntries = (mealEntries: MealEntry[]): Omit<FoodEntry, 'id'>[] => {
  return mealEntries.map(convertMealEntryToFoodEntry);
}; 