import React from 'react';
import { MealType } from '../services/foodService';

type StatsProps = {
  totalCalories: number;
  caloriesByType: Record<MealType, number>;
  totalWaterIntake: number;
  avgDailyCalories?: number;
  daysInPeriod?: number;
  period: 'day' | 'week' | 'month';
};

const DashboardStats: React.FC<StatsProps> = ({
  totalCalories,
  caloriesByType,
  totalWaterIntake,
  avgDailyCalories,
  daysInPeriod = 1,
  period
}) => {
  // Default calorie goal - could be customizable in the future
  const calorieGoal = 2000;
  const waterGoal = 2000; // ml
  
  // Calculate percentage of goal reached
  const caloriePercentage = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));
  const waterPercentage = Math.min(100, Math.round((totalWaterIntake / waterGoal) * 100));
  
  // Get color based on meal type
  const getColor = (type: string) => {
    switch(type) {
      case 'breakfast': return 'bg-yellow-500';
      case 'lunch': return 'bg-green-500';
      case 'dinner': return 'bg-blue-500';
      case 'snacks': return 'bg-purple-500';
      case 'coffee': return 'bg-amber-700';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {period === 'day' ? 'Today\'s Stats' : 
         period === 'week' ? 'This Week\'s Stats' : 
         'This Month\'s Stats'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Calories Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 opacity-80">Total Calories</p>
              <h3 className="text-3xl font-bold text-blue-900 mt-1">{totalCalories}</h3>
              {period !== 'day' && avgDailyCalories && (
                <p className="text-xs text-blue-700 mt-1">
                  Avg: {avgDailyCalories} per day
                </p>
              )}
            </div>
            <div className="bg-blue-200 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-blue-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${caloriePercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-blue-800 mt-1">
              <span>0</span>
              <span>Goal: {calorieGoal}</span>
            </div>
          </div>
        </div>
        
        {/* Water Intake Card */}
        <div className="bg-gradient-to-br from-cyan-50 to-teal-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-800 opacity-80">Water Intake</p>
              <h3 className="text-3xl font-bold text-teal-900 mt-1">{totalWaterIntake} ml</h3>
              {period !== 'day' && (
                <p className="text-xs text-teal-700 mt-1">
                  Avg: {Math.round(totalWaterIntake / daysInPeriod)} ml per day
                </p>
              )}
            </div>
            <div className="bg-teal-200 rounded-full p-3">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-teal-200 rounded-full h-2.5">
              <div 
                className="bg-teal-600 h-2.5 rounded-full" 
                style={{ width: `${waterPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-teal-800 mt-1">
              <span>0</span>
              <span>Goal: {waterGoal} ml</span>
            </div>
          </div>
        </div>
        
        {/* Meal Distribution Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-amber-800 opacity-80">Meal Distribution</p>
            <div className="bg-amber-200 rounded-full p-3">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          
          {/* Meal type bars */}
          <div className="space-y-2">
            {Object.entries(caloriesByType).map(([type, calories]) => {
              if (calories === 0) return null;
              
              const percentage = Math.round((calories / totalCalories) * 100) || 0;
              
              return (
                <div key={type} className="flex items-center">
                  <div className="w-24 text-xs font-medium text-amber-900 capitalize">
                    {type}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div 
                        className={`${getColor(type)} h-2 rounded-full`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-16 text-right text-xs font-medium text-amber-900">
                    {calories} cal
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats; 