import React from 'react';
import { MealEntry } from '../types/index';

type MonthCalendarProps = {
  currentDate: Date;
  mealEntries: MealEntry[];
  onSelectDate: (date: Date) => void;
  onNavigateMonth: (direction: number) => void;
};

const MonthCalendar: React.FC<MonthCalendarProps> = ({
  currentDate,
  mealEntries,
  onSelectDate,
  onNavigateMonth
}) => {
  const today = new Date();
  const startDate = new Date(currentDate);
  startDate.setDate(1); // Start from first day of month
  
  // Calculate the first day to display (might be from previous month)
  const firstDayOfGrid = new Date(startDate);
  const dayOfWeek = firstDayOfGrid.getDay(); // 0 = Sunday, 1 = Monday, etc.
  firstDayOfGrid.setDate(firstDayOfGrid.getDate() - dayOfWeek);
  
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Last day of month
  
  // Calculate the last day to display (might be from next month)
  const lastDayOfGrid = new Date(endDate);
  const lastDayOfWeek = lastDayOfGrid.getDay();
  lastDayOfGrid.setDate(lastDayOfGrid.getDate() + (6 - lastDayOfWeek));
  
  const days = [];
  for (let d = new Date(firstDayOfGrid); d <= lastDayOfGrid; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => onNavigateMonth(-1)}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-gray-800">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        
        <button 
          onClick={() => onNavigateMonth(1)}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {days.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today;
          const isFuture = date > today;
          const isSelected = date.toDateString() === currentDate.toDateString();
          
          // Check if we have entries for this date
          const dateEntries = mealEntries.filter(entry => 
            new Date(entry.date).toDateString() === date.toDateString()
          );
          
          const hasEntries = dateEntries.length > 0;
          
          // Calculate total calories for this date
          const dateCalories = dateEntries.reduce((sum, entry) => sum + entry.calories, 0);
          
          // Determine background color based on entries and date
          let bgColor = 'bg-gray-50'; // Default
          let textColor = isCurrentMonth ? 'text-gray-900' : 'text-gray-400';
          let calorieColor = 'text-green-800';
          
          if (hasEntries && isCurrentMonth) {
            bgColor = 'bg-green-100'; // Has entries
            calorieColor = 'text-green-800';
          }
          
          if (isPast && !hasEntries && isCurrentMonth) {
            bgColor = 'bg-amber-50'; // Missed day
            calorieColor = 'text-amber-600';
          }
          
          if (isFuture && isCurrentMonth) {
            bgColor = 'bg-blue-50'; // Future day
            textColor = 'text-blue-800';
          }

          return (
            <button
              key={index}
              onClick={() => onSelectDate(date)}
              className={`
                p-2 rounded-lg text-center
                ${bgColor}
                ${isToday ? 'border-2 border-primary-600' : ''}
                ${isSelected ? 'ring-2 ring-primary-500' : ''}
                ${!isCurrentMonth ? 'opacity-40' : ''}
                hover:bg-gray-100 transition-colors
              `}
            >
              <div className={`text-sm font-medium ${textColor}`}>{date.getDate()}</div>
              
              {/* Always show calories for current month days */}
              {isCurrentMonth && (
                <div className={`text-xs mt-1 font-semibold ${calorieColor}`}>
                  {hasEntries ? `${dateCalories} cal` : isPast ? 'No data' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar; 