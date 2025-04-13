import React, { useState, useEffect } from 'react';
import { MealType } from '../types/food';
import * as dbProvider from '../services/db-provider';

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
  imageId?: string;
  isFromImage?: boolean;
};

type MealDetailModalProps = {
  entry: FoodEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const MealDetailModal: React.FC<MealDetailModalProps> = ({
  entry,
  onClose,
  onEdit,
  onDelete
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (entry.imageId) {
        console.log("Loading image details for modal. ImageId:", entry.imageId);
        try {
          // Get the food image data
          const foodImage = await dbProvider.getDocument('food_images', entry.imageId);
          console.log("Food image data for modal:", foodImage);
          
          if (foodImage) {
            // Check for and set image URL
            if (foodImage.imageUrl) {
              setImageUrl(foodImage.imageUrl);
              console.log("Setting image URL:", foodImage.imageUrl);
            } else if (foodImage.thumbnailUrl) {
              setImageUrl(foodImage.thumbnailUrl);
              console.log("Setting thumbnail URL:", foodImage.thumbnailUrl);
            } else {
              console.warn("No image URLs found in food image data");
            }
            
            // Check for and set analysis result
            if (foodImage.analysisResult || foodImage.analysis_result) {
              const result = foodImage.analysisResult || foodImage.analysis_result;
              
              // If the result is a string, try to parse it as JSON
              if (typeof result === 'string') {
                try {
                  const parsedResult = JSON.parse(result);
                  setAnalysisResult(parsedResult);
                  console.log("Setting parsed analysis result:", parsedResult);
                } catch (parseError) {
                  console.error("Error parsing analysis result string:", parseError);
                  setAnalysisResult(result);
                }
              } else {
                setAnalysisResult(result);
                console.log("Setting analysis result:", result);
              }
            } else {
              console.warn("No analysis result found in food image data");
            }
          }
        } catch (error) {
          console.error('Error loading food image for modal:', error);
        }
      }
    };

    loadImage();
  }, [entry.imageId]);

  // Format the date
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get meal type color
  const getTypeColor = () => {
    switch (entry.type) {
      case 'breakfast':
        return 'bg-yellow-500';
      case 'lunch':
        return 'bg-green-500';
      case 'dinner':
        return 'bg-blue-500';
      case 'snacks':
        return 'bg-purple-500';
      case 'coffee':
        return 'bg-amber-700';
      default:
        return 'bg-gray-500';
    }
  };

  // Determine if meal is healthy (simplified logic)
  const getMealHealthInfo = () => {
    // Default values
    let isHealthy = false;
    let healthScore = 0;
    let healthText = "Unknown";
    let healthColor = "text-gray-500";
    
    if (analysisResult) {
      // Simple health scoring logic based on calories and items
      const calories = entry.calories || analysisResult.totalCalories || 0;
      const hasVegetables = analysisResult.items?.some((item: any) => 
        item.name.toLowerCase().includes('vegetable') || 
        item.name.toLowerCase().includes('salad') ||
        item.name.toLowerCase().includes('spinach') ||
        item.name.toLowerCase().includes('broccoli')
      );
      
      const hasFruits = analysisResult.items?.some((item: any) => 
        item.name.toLowerCase().includes('fruit') || 
        item.name.toLowerCase().includes('apple') ||
        item.name.toLowerCase().includes('banana') ||
        item.name.toLowerCase().includes('berry')
      );
      
      const hasProcessedFood = analysisResult.items?.some((item: any) => 
        item.name.toLowerCase().includes('fried') || 
        item.name.toLowerCase().includes('processed') ||
        item.name.toLowerCase().includes('pizza') ||
        item.name.toLowerCase().includes('burger')
      );
      
      // Calculate a simple health score
      healthScore = 5; // Start at neutral
      
      // Adjust based on calories
      if (calories < 300) healthScore += 1;
      if (calories > 800) healthScore -= 2;
      
      // Adjust based on content
      if (hasVegetables) healthScore += 2;
      if (hasFruits) healthScore += 1;
      if (hasProcessedFood) healthScore -= 2;
      
      // Determine health status based on score
      if (healthScore >= 7) {
        isHealthy = true;
        healthText = "Very Healthy";
        healthColor = "text-green-600";
      } else if (healthScore >= 5) {
        isHealthy = true;
        healthText = "Healthy";
        healthColor = "text-green-500";
      } else if (healthScore >= 3) {
        healthText = "Moderately Healthy";
        healthColor = "text-yellow-500";
      } else {
        healthText = "Less Healthy";
        healthColor = "text-red-500";
      }
    }
    
    return { isHealthy, healthText, healthColor, healthScore };
  };

  const { healthText, healthColor } = getMealHealthInfo();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 relative"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 rounded-t-2xl">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-75 mb-1">
                  {formatDate(entry.date)} • {entry.time}
                </div>
                <h2 className="text-2xl font-bold flex items-center">
                  {entry.name}
                  {entry.count && entry.count > 1 && (
                    <span className="ml-2 bg-white bg-opacity-25 text-white px-2 py-0.5 rounded-full text-sm">
                      x{entry.count}
                    </span>
                  )}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          
            {/* Health status badge */}
            {healthText && (
              <div className="flex justify-end -mt-4 px-6">
                <span className={`${healthColor} font-semibold bg-white py-1 px-4 rounded-full shadow text-sm border border-gray-100`}>
                  {healthText}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Image (if available) */}
            {imageUrl && (
              <div className="mb-6">
                <div 
                  className="w-full h-60 rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-md hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setShowFullImage(true)}
                >
                  <img 
                    src={imageUrl} 
                    alt={entry.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex justify-end mt-2">
                  {entry.isFromImage && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                      AI analyzed
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center">
                <div className="text-xs text-blue-500 uppercase font-semibold tracking-wide mb-1">Calories</div>
                <div className="text-2xl font-bold text-blue-700">{entry.calories}</div>
                <div className="text-xs text-blue-400">kcal</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center">
                <div className="text-xs text-purple-500 uppercase font-semibold tracking-wide mb-1">Meal</div>
                <div className="text-xl font-bold text-purple-700 capitalize">{entry.type}</div>
              </div>
              
              {entry.waterIntake && entry.waterIntake > 0 ? (
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <div className="text-xs text-cyan-500 uppercase font-semibold tracking-wide mb-1">Water</div>
                  <div className="text-2xl font-bold text-cyan-700">{entry.waterIntake}</div>
                  <div className="text-xs text-cyan-400">ml</div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <div className="text-xs text-amber-500 uppercase font-semibold tracking-wide mb-1">Time</div>
                  <div className="text-xl font-bold text-amber-700">{entry.time}</div>
                </div>
              )}
            </div>

            {/* Description */}
            {entry.description && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <div className="bg-gray-50 rounded-xl p-4 text-gray-700 shadow-sm">
                  {entry.description}
                </div>
              </div>
            )}

            {/* Analyzed Items (if available from AI) */}
            {analysisResult && analysisResult.items && analysisResult.items.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Analyzed Items</h4>
                <div className="bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-3 px-4 text-left font-semibold text-gray-700">Item</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700">Portion</th>
                        <th className="py-3 px-4 text-right font-semibold text-gray-700">Calories</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.items.map((item: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                          <td className="py-3 px-4 text-gray-600">{item.portion || '-'}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-800">{item.calories}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100">
                        <td colSpan={2} className="py-3 px-4 font-bold text-gray-800">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-800">{analysisResult.totalCalories}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={onDelete}
                className="px-5 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center font-medium transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button
                onClick={onEdit}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center font-medium transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && imageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button 
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={imageUrl} 
            alt={entry.name} 
            className="max-h-[90vh] max-w-full object-contain" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default MealDetailModal; 