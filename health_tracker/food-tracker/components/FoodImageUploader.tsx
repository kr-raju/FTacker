import React, { useState, useRef } from 'react';
import { uploadAndAnalyzeFoodImage, addFoodEntryFromImage } from '../services/foodImageService';
import { FoodAnalysisResult } from '../types/ai';

type FoodImageUploaderProps = {
  userId: string;
  onSuccess: (entryId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  mealType?: string;
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
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!selectedImage || !userId) return;
    
    try {
      setIsUploading(true);
      setProgress(10);
      
      // Upload and analyze the image
      setIsAnalyzing(true);
      setProgress(30);
      
      const result = await uploadAndAnalyzeFoodImage(userId, selectedImage);
      
      setProgress(70);
      setAnalysisResult(result.analysisResult);
      
      // Override meal type if specified
      const mealTypeToUse = mealType || result.analysisResult.mealType;
      const analysisWithMealType = {
        ...result.analysisResult,
        mealType: mealTypeToUse as any
      };
      
      // Add a food entry based on the analysis
      const entry = await addFoodEntryFromImage(
        userId,
        analysisWithMealType,
        result.imageData.id
      );
      
      setProgress(100);
      onSuccess(entry.id);
    } catch (error: any) {
      console.error('Error uploading and analyzing image:', error);
      onError(error.message || 'Failed to analyze image');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  // Handle cancellation
  const handleCancel = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    onCancel();
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Analyze Food Photo
      </h3>
      
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
            
            {/* Image caption */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
              Food photo selected
            </div>
            
            {/* Remove button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
              disabled={isUploading || isAnalyzing}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-col space-y-4">
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
        </div>
      )}
      
      {/* Progress indicator */}
      {(isUploading || isAnalyzing) && (
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isUploading ? 'Uploading image...' : 'Analyzing food content...'}
          </p>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
          disabled={isUploading || isAnalyzing}
        >
          Cancel
        </button>
        
        {selectedImage && (
          <button
            onClick={handleUploadAndAnalyze}
            disabled={isUploading || isAnalyzing || !selectedImage}
            className={`px-4 py-2 text-white rounded-lg flex items-center ${
              isUploading || isAnalyzing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading || isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isUploading ? 'Uploading...' : 'Analyzing...'}
              </>
            ) : (
              <>Analyze & Add Meal</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default FoodImageUploader; 