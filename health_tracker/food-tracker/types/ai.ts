import { MealType } from './index';

export interface FoodItem {
  name: string;
  calories: number;
  portion?: string;
  type?: MealType;
  isHealthy?: boolean;
}

export interface FoodAnalysisResult {
  items: FoodItem[];
  totalCalories: number;
  mealType: MealType;
  waterIntake: number;
  description: string;
  healthScore?: number;
  healthAssessment?: string;
  healthyAlternatives?: string;
}

export interface FoodImageData {
  id?: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  analysisResult: FoodAnalysisResult;
  createdAt?: Date;
  foodEntryId?: string; // Reference to the corresponding food entry
  hash?: string; // For image similarity matching
} 