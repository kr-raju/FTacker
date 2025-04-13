import React, { useState, useRef, useEffect } from 'react';
import { uploadAndAnalyzeFoodImage, addFoodEntryFromImage } from '../services/foodImageService';
import { FoodAnalysisResult, FoodItem } from '../types/ai';
import { MealType } from '../types/food';

type FoodImageUploaderProps = {
  userId: string;
  onSuccess: (entryId: string, entryData: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  mealType?: MealType;
};

const FoodImageUploader: React.FC<FoodImageUploaderProps> = ({
  userId,
  onSuccess,
  onError,
  onCancel,
  mealType
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [entryData, setEntryData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate userId on mount
  useEffect(() => {
    if (!userId) {
      console.error("FoodImageUploader: No userId provided");
    }
  }, [userId]);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file');
      return;
    }
    
    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError('Image size must be less than 5MB');
      return;
    }
    
    // Read the file and convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Image = e.target?.result?.toString() || '';
      setSelectedImage(base64Image);
    };
    reader.onerror = () => {
      onError('Error reading file');
    };
    reader.readAsDataURL(file);
  };
  
  // Handle camera capture (for mobile devices)
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };
  
  // Handle gallery selection
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };
  
  // Handle image upload and analysis
  const handleUploadAndAnalyze = async () => {
    if (!selectedImage) {
      onError('No image selected');
      return;
    }
    
    if (!userId) {
      onError('User not authenticated');
      console.error("Upload attempted without userId");
      return;
    }
    
    try {
      setIsUploading(true);
      setProgress(10);
      setAnalysisStage('Uploading image...');
      
      console.log("Starting image upload and analysis for user:", userId);
      
      // Upload and analyze the image
      setIsAnalyzing(true);
      setProgress(30);
      setAnalysisStage('Analyzing food contents with AI...');
      
      const result = await uploadAndAnalyzeFoodImage(userId, selectedImage);
      
      setProgress(70);
      setAnalysisResult(result.analysisResult);
      setAnalysisStage('Creating your meal entry...');
      
      console.log("Analysis complete:", result.analysisResult);
      
      // Override meal type if specified
      const mealTypeToUse = mealType || result.analysisResult.mealType;
      const analysisWithMealType = {
        ...result.analysisResult,
        mealType: mealTypeToUse as MealType
      };
      
      // Add a food entry based on the analysis
      const entry = await addFoodEntryFromImage(
        userId,
        analysisWithMealType,
        result.imageData.id
      );
      
      setProgress(100);
      setAnalysisStage('Analysis complete!');
      setIsCompleted(true);
      
      console.log("Food entry created:", entry.id);
      
      // Store the entry data to be returned when the user clicks "Done"
      // Avoid duplicate id field by not spreading the entry and explicitly setting needed fields
      setEntryData({
        id: entry.id,
        userId: entry.userId || userId,
        date: entry.date,
        name: entry.name || (analysisResult?.items[0]?.name || 'Unknown food'),
        time: entry.time,
        calories: entry.calories || analysisResult?.totalCalories || 0,
        items: entry.items || analysisResult?.items.map(item => item.name) || [],
        completed: true,
        type: entry.type || mealTypeToUse,
        description: entry.description || analysisResult?.description,
        waterIntake: entry.waterIntake || analysisResult?.waterIntake || 0,
        count: entry.count || 1,
        lastUpdated: new Date(),
        imageId: result.imageData.id,
        isFromImage: true,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl
      });
    } catch (error: any) {
      console.error('Error uploading and analyzing image:', error);
      onError(error.message || 'Failed to analyze image');
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  // Handle completion
  const handleDone = () => {
    if (entryData) {
      onSuccess(entryData.id, entryData);
    } else {
      handleCancel();
    }
  };
  
  // Handle cancellation
  const handleCancel = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setIsUploading(false);
    setIsAnalyzing(false);
    setProgress(0);
    setIsCompleted(false);
    setEntryData(null);
    onCancel();
  };
  
  // Get the primary food item from analysis result (if available)
  const getFoodItem = (): FoodItem | null => {
    if (!analysisResult || !analysisResult.items || analysisResult.items.length === 0) {
      return null;
    }
    return analysisResult.items[0];
  };

  // Get the primary food item details
  const primaryFood = getFoodItem();
  
  // Calculate health score for the food
  const calculateHealthScore = (): number => {
    if (!analysisResult) return 5; // Default to neutral if no analysis
    
    let healthScore = 5; // Start at neutral
    
    // Simple health scoring logic based on calories and items
    const calories = analysisResult.totalCalories || 0;
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
    
    // Adjust based on calories
    if (calories < 300) healthScore += 1;
    if (calories > 800) healthScore -= 2;
    
    // Adjust based on content
    if (hasVegetables) healthScore += 2;
    if (hasFruits) healthScore += 1;
    if (hasProcessedFood) healthScore -= 2;
    
    return healthScore;
  };
  
  // Add health score to analysis result if it doesn't already have one
  if (analysisResult && !analysisResult.healthScore) {
    analysisResult.healthScore = calculateHealthScore();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Analyze Food Photo
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
              disabled={isUploading && !isCompleted}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* File input (hidden) */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Image preview */}
          {selectedImage ? (
            <div className="mb-4">
              <div className="relative rounded-lg overflow-hidden w-full h-64 bg-gray-100">
                <img 
                  src={selectedImage} 
                  alt="Selected food" 
                  className="w-full h-full object-cover"
                />
                
                {!isUploading && !isAnalyzing && (
                  <>
                    {/* Remove button */}
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 flex flex-col space-y-4">
              {!userId ? (
                <div className="text-center py-8">
                  <div className="text-red-500 font-medium mb-2">Authentication Error</div>
                  <p className="text-gray-600 text-sm">
                    Unable to access this feature. Please make sure you are logged in and try again.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleCameraCapture}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </button>
                  
                  <button
                    onClick={handleGallerySelect}
                    className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choose from Gallery
                  </button>
                </>
              )}
            </div>
          )}
          
          {/* Analysis result */}
          {isAnalyzing && (
            <div className="mb-4">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      {analysisStage}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div 
                    style={{ width: `${progress}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Analysis result display */}
          {analysisResult && (
            <div className="border rounded-xl p-4 mb-4 bg-white shadow-md">
              <h4 className="text-xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-lg">ANALYSIS COMPLETE!</h4>
              
              {/* Progress bar */}
              <div className="relative pt-1 mb-6">
                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-blue-200">
                  <div 
                    style={{ width: '100%' }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                  ></div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    100%
                  </span>
                </div>
              </div>
              
              {/* Health Status Badge */}
              {analysisResult.healthScore && (
                <div className="flex justify-end mb-2">
                  <span className={`${
                    analysisResult.healthScore >= 7 ? 'text-green-600' :
                    analysisResult.healthScore >= 5 ? 'text-green-500' :
                    analysisResult.healthScore >= 3 ? 'text-yellow-500' :
                    'text-red-500'
                  } font-semibold bg-white py-1 px-4 rounded-full shadow text-sm border border-gray-100`}>
                    {
                      analysisResult.healthScore >= 7 ? 'Very Healthy' :
                      analysisResult.healthScore >= 5 ? 'Healthy' :
                      analysisResult.healthScore >= 3 ? 'Moderately Healthy' :
                      'Less Healthy'
                    }
                  </span>
                </div>
              )}
              
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <div className="text-xs text-blue-500 uppercase font-semibold tracking-wide mb-1">Calories</div>
                  <div className="text-2xl font-bold text-blue-700">{analysisResult.totalCalories}</div>
                  <div className="text-xs text-blue-400">kcal</div>
                </div>
                
                {primaryFood?.calories && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <div className="text-xs text-green-500 uppercase font-semibold tracking-wide mb-1">Item</div>
                    <div className="text-2xl font-bold text-green-700">{primaryFood.calories}</div>
                    <div className="text-xs text-green-400">kcal</div>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <div className="text-xs text-purple-500 uppercase font-semibold tracking-wide mb-1">Meal</div>
                  <div className="text-xl font-bold text-purple-700 capitalize">{mealType || analysisResult.mealType}</div>
                </div>
              </div>
              
              {/* Food Name */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Food Name</h4>
                <div className="bg-gray-50 rounded-xl p-4 text-gray-700 shadow-sm font-medium">
                  {primaryFood?.name || 'Unknown food'}
                </div>
              </div>
              
              {/* Analyzed Items (if available) */}
              {analysisResult.items && analysisResult.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Analyzed Items</h4>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-2 px-3 text-left font-semibold text-gray-700">Item</th>
                          <th className="py-2 px-3 text-left font-semibold text-gray-700">Portion</th>
                          <th className="py-2 px-3 text-right font-semibold text-gray-700">Calories</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.items.map((item: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-2 px-3 font-medium text-gray-800">{item.name}</td>
                            <td className="py-2 px-3 text-gray-600">{item.portion || '-'}</td>
                            <td className="py-2 px-3 text-right font-medium text-gray-800">{item.calories}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100">
                          <td colSpan={2} className="py-2 px-3 font-bold text-gray-800">Total</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-800">{analysisResult.totalCalories}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Description if available */}
              {analysisResult.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                  <div className="bg-gray-50 rounded-xl p-4 text-gray-700 shadow-sm">
                    {analysisResult.description}
                  </div>
                </div>
              )}
              
              {/* AI Badge */}
              <div className="flex justify-end mt-2 mb-2">
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                  AI analyzed
                </span>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              disabled={isUploading && !isCompleted}
            >
              Cancel
            </button>
            
            {selectedImage && !isUploading && !isAnalyzing && (
              <button
                onClick={handleUploadAndAnalyze}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Analyze and Add
              </button>
            )}
            
            {isCompleted && (
              <button
                onClick={handleDone}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodImageUploader; 