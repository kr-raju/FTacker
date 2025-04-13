import React, { useState, useEffect } from 'react';
import { MealType } from '../types/food';
import * as dbProvider from '../services/db-provider';
import MealDetailModal from './MealDetailModal';

type FoodEntry = {
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
  count?: number;
  lastUpdated?: Date;
  imageId?: string; // Optional ID for linked food image
  isFromImage?: boolean; // Flag to indicate entry was created from image analysis
  imageUrl?: string; // Direct URL for the image (to avoid loading)
};

interface FoodEntryItemProps {
  entry: FoodEntry;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
  onIncrease: (entry: FoodEntry) => void;
  onDecrease: (entry: FoodEntry) => void;
}

const FoodEntryItem: React.FC<FoodEntryItemProps> = ({
  entry,
  onEdit,
  onDelete,
  onIncrease,
  onDecrease
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load image if entry has imageId and no direct imageUrl
  useEffect(() => {
    const loadImage = async () => {
      // If we already have a direct URL, use that instead
      if (entry.imageUrl) {
        setImageUrl(entry.imageUrl);
        return;
      }
      
      if (entry.imageId) {
        console.log("Loading image for entry:", entry.id, "imageId:", entry.imageId);
        try {
          // Get the food image data
          const foodImage = await dbProvider.getDocument('food_images', entry.imageId);
          console.log("Food image data:", foodImage);
          
          // First try thumbnailUrl, then imageUrl if thumbnail isn't available
          if (foodImage) {
            if (foodImage.thumbnailUrl) {
              console.log("Using thumbnail URL:", foodImage.thumbnailUrl);
              setImageUrl(foodImage.thumbnailUrl);
            } else if (foodImage.imageUrl) {
              console.log("Using image URL:", foodImage.imageUrl);
              setImageUrl(foodImage.imageUrl);
            } else {
              console.warn("No image or thumbnail URL found for food image:", foodImage);
            }
          } else {
            console.warn("No food image data found for imageId:", entry.imageId);
          }
        } catch (error) {
          console.error('Error loading food image:', error);
        }
      }
    };

    loadImage();
  }, [entry.imageId, entry.imageUrl]);

  // Get a color class based on meal type
  const getTypeColor = () => {
    switch (entry.type) {
      case 'breakfast':
        return 'from-yellow-500 to-yellow-600 border-yellow-500';
      case 'lunch':
        return 'from-green-500 to-green-600 border-green-500';
      case 'dinner':
        return 'from-blue-500 to-blue-600 border-blue-500';
      case 'snacks':
        return 'from-purple-500 to-purple-600 border-purple-500';
      case 'coffee':
        return 'from-amber-700 to-amber-800 border-amber-700';
      default:
        return 'from-gray-500 to-gray-600 border-gray-500';
    }
  };
  
  // Get a text color class based on meal type
  const getTypeTextColor = () => {
    switch (entry.type) {
      case 'breakfast':
        return 'text-yellow-600';
      case 'lunch':
        return 'text-green-600';
      case 'dinner':
        return 'text-blue-600';
      case 'snacks':
        return 'text-purple-600';
      case 'coffee':
        return 'text-amber-700';
      default:
        return 'text-gray-600';
    }
  };

  // Format items for display
  const formatItems = () => {
    if (!entry.items || entry.items.length === 0) {
      return '';
    }
    return entry.items.slice(0, 3).join(', ') + 
      (entry.items.length > 3 ? ` +${entry.items.length - 3} more` : '');
  };

  // Function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <>
      <div 
        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4"
        style={{ borderLeftColor: getTypeColor().split(' ').pop()?.replace('border-', '') || '#718096' }}
        onClick={() => {
          console.log("Opening detail modal for entry:", entry);
          setShowDetailModal(true);
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3 flex-grow">
              <div className="flex-grow">
                {/* Meal type badge & time */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${getTypeColor()} text-white shadow-sm`}>
                    {capitalizeWords(entry.type)}
                  </span>
                  <span className="text-xs text-gray-500">{entry.time}</span>
                  {entry.isFromImage && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      AI analyzed
                    </span>
                  )}
                </div>
                
                {/* Main heading with count */}
                <div className="flex items-center mb-1">
                  <h3 className="text-lg font-bold text-gray-900 mr-2">
                    {capitalizeWords(entry.name)}
                  </h3>
                  {entry.count && entry.count > 1 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      x{entry.count}
                    </span>
                  )}
                </div>
                
                {/* Description or items */}
                <div className="mb-1">
                  {entry.description && (
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {entry.description}
                    </p>
                  )}
                  {formatItems() && !entry.description && (
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {formatItems()}
                    </p>
                  )}
                </div>

                {/* Calories and water intake */}
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-gray-800 text-lg flex items-center">
                    <svg className="w-4 h-4 mr-1 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                    </svg>
                    {entry.calories}
                  </div>
                  
                  {entry.waterIntake && entry.waterIntake > 0 && (
                    <div className="text-xs text-blue-500 font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      {entry.waterIntake}ml
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Image thumbnail */}
              {imageUrl && (
                <div className="mr-2">
                  <img 
                    src={imageUrl} 
                    alt={entry.name} 
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm" 
                  />
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-col items-center space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onIncrease(entry);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Increase count"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrease(entry);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Decrease count"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(entry);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Meal Modal */}
      {showDetailModal && (
        <MealDetailModal
          entry={entry}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            onEdit(entry);
          }}
          onDelete={() => {
            setShowDetailModal(false);
            onDelete(entry.id);
          }}
        />
      )}
    </>
  );
};

export default FoodEntryItem; 