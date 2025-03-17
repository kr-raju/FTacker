import React from 'react';
import { MealEntry } from '../types/index';

type WeekCalendarProps = {
  currentDate: Date;
  mealEntries: MealEntry[];
  onSelectDate: (date: Date) => void;
};

const WeekCalendar: React.FC<WeekCalendarProps> = ({
  currentDate,
  mealEntries,
  onSelectDate
}) => {
  // Function to get start and end of week
  const getWeekDates = (date: Date) => {
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - day); // Go to Sunday
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Go to Saturday
    
    return { startDate, endDate };
  };
  
  const { startDate, endDate } = getWeekDates(currentDate);
  const days = [];
  
  // Generate array of dates for the week
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </h3>
      
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {days.map((date, index) => {
          const today = new Date();
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
          let textColor = 'text-gray-900';
          let calorieColor = 'text-green-800';
          
          if (hasEntries) {
            bgColor = 'bg-green-100'; // Has entries
          }
          
          if (isPast && !hasEntries) {
            bgColor = 'bg-amber-50'; // Missed day
            calorieColor = 'text-amber-600';
          }
          
          if (isFuture) {
            bgColor = 'bg-blue-50'; // Future day
            textColor = 'text-blue-800';
          }
          
          return (
            <button
              key={index}
              onClick={() => onSelectDate(date)}
              className={`
                p-3 rounded-lg text-center
                ${bgColor}
                ${isToday ? 'border-2 border-primary-600' : ''}
                ${isSelected ? 'ring-2 ring-primary-500' : ''}
                hover:bg-gray-100 transition-colors
              `}
            >
              <div className={`text-sm font-medium ${textColor}`}>{date.getDate()}</div>
              
              {/* Always show calories or "No data" */}
              <div className={`text-xs mt-1 font-semibold ${calorieColor}`}>
                {hasEntries ? `${dateCalories} cal` : isPast ? 'No data' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekCalendar; 