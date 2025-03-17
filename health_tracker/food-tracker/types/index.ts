import { MealType } from '../services/foodService';

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
};

export type FoodSuggestion = {
  name: string;
  calories: number;
  type?: MealType;
  frequency?: number; // How often this has been used
  lastUsed?: Date;   // When it was last used
};

export type ViewType = 'day' | 'week' | 'month'; 