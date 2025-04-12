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

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold">
              <span className={`inline-block w-3 h-3 rounded-full ${getTypeColor()} mr-2`}></span>
              Meal Details
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{entry.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(entry.date)} • {entry.time}
                </p>
              </div>
              {entry.count && entry.count > 1 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  x{entry.count}
                </span>
              )}
            </div>

            {/* Image (if available) */}
            {imageUrl && (
              <div className="mb-4">
                <div 
                  className="w-full h-48 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => setShowFullImage(true)}
                >
                  <img 
                    src={imageUrl} 
                    alt={entry.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                {entry.isFromImage && (
                  <div className="flex justify-end mt-1">
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      AI analyzed
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Basic Information */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500">Calories</h4>
                  <p className="text-lg font-semibold text-gray-800">{entry.calories}</p>
                </div>
                {entry.waterIntake && entry.waterIntake > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">Water</h4>
                    <p className="text-lg font-semibold text-gray-800">{entry.waterIntake} ml</p>
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500">Meal Type</h4>
                  <p className="text-lg font-semibold text-gray-800 capitalize">{entry.type}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {entry.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700">{entry.description}</p>
              </div>
            )}

            {/* Analyzed Items (if available from AI) */}
            {analysisResult && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Analyzed Items</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {analysisResult.items && analysisResult.items.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">Portion</th>
                          <th className="pb-2 text-right">Calories</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.items.map((item: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 last:border-0">
                            <td className="py-2">{item.name}</td>
                            <td className="py-2">{item.portion || '-'}</td>
                            <td className="py-2 text-right">{item.calories}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-gray-500 text-center py-2">
                      No detailed analysis available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={onDelete}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                Delete
              </button>
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
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