import React, { useState, useEffect } from 'react';
import { MealEntry } from '../types/index';
import { getFoodImage } from '../services/foodImageService';

type FoodEntryItemProps = {
  entry: MealEntry;
  onEdit: (entry: MealEntry) => void;
  onDelete: (id: string) => void;
  onIncrease: (entry: MealEntry) => void;
  onDecrease: (entry: MealEntry) => void;
};

const FoodEntryItem: React.FC<FoodEntryItemProps> = ({
  entry,
  onEdit,
  onDelete,
  onIncrease,
  onDecrease
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Get meal type color
  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'border-yellow-500';
      case 'lunch':
        return 'border-green-500';
      case 'dinner':
        return 'border-blue-500';
      case 'snacks':
        return 'border-purple-500';
      case 'coffee':
        return 'border-amber-700';
      default:
        return 'border-gray-500';
    }
  };

  // Load image if entry has an imageId
  useEffect(() => {
    const loadImage = async () => {
      if (entry.imageId) {
        try {
          const imageData = await getFoodImage(entry.imageId);
          if (imageData) {
            setImageUrl(imageData.imageUrl);
          }
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }
    };

    loadImage();
  }, [entry.imageId]);

  return (
    <>
      <div className={`border-l-4 ${getMealTypeColor(entry.type)} bg-white p-4 rounded-lg shadow mb-4 relative`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-800">{entry.name}</h3>
              
              {/* Display count if more than 1 */}
              {entry.count && entry.count > 1 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {entry.count}x
                </span>
              )}
              
              {/* Show photo icon if entry has an image */}
              {entry.imageId && (
                <button 
                  onClick={() => setShowImageModal(true)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="View food photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mt-1">{entry.description || ''}</p>
            
            {/* Time and calories */}
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <span className="mr-3">{entry.time}</span>
              <span className="font-semibold text-gray-700">{entry.calories} calories</span>
              
              {/* Water intake if any */}
              {entry.waterIntake && entry.waterIntake > 0 && (
                <span className="ml-3 flex items-center text-blue-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  {entry.waterIntake} ml
                </span>
              )}
            </div>
            
            {/* If from AI analysis, show AI badge */}
            {entry.isFromImage && (
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI analyzed
              </div>
            )}
          </div>
          
          {/* Image thumbnail (if available) */}
          {imageUrl && (
            <div 
              className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => setShowImageModal(true)}
            >
              <img src={imageUrl} alt="Food" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end mt-3 space-x-2">
          <button
            onClick={() => onDecrease(entry)}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Decrease count"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <button
            onClick={() => onIncrease(entry)}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Increase count"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          <button
            onClick={() => onEdit(entry)}
            className="p-1 text-blue-500 hover:text-blue-700"
            aria-label="Edit entry"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1 text-red-500 hover:text-red-700"
            aria-label="Delete entry"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Image Modal */}
      {showImageModal && imageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 z-10"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="w-full p-2">
              <img 
                src={imageUrl} 
                alt={entry.name} 
                className="w-full h-auto object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="p-4 bg-white">
              <h3 className="text-xl font-semibold text-gray-800">{entry.name}</h3>
              
              <div className="mt-2 text-gray-600">
                <p>{entry.description}</p>
              </div>
              
              <div className="mt-4 text-gray-700">
                <div className="flex justify-between items-center">
                  <span>Calories:</span>
                  <span className="font-semibold">{entry.calories}</span>
                </div>
                
                {entry.waterIntake && entry.waterIntake > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span>Water intake:</span>
                    <span className="font-semibold">{entry.waterIntake} ml</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-1">
                  <span>Meal type:</span>
                  <span className="font-semibold capitalize">{entry.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FoodEntryItem; 