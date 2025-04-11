import { useState, useRef, ChangeEvent } from 'react';
import { uploadAndAnalyzeFoodImage, addFoodEntryFromImage } from '../services/foodImageService';
import { FoodAnalysisResult } from '../types/ai';
import { auth } from '../services/dbService';
import { MealType } from '../services/foodService';

// Define the component props
interface FoodImageUploaderProps {
  userId: string;
  onSuccess: (entryId: string) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
  mealType?: MealType;
}

const FoodImageUploader: React.FC<FoodImageUploaderProps> = ({ 
  userId, 
  onSuccess, 
  onError, 
  onCancel,
  mealType 
}) => {
  // State variables
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<FoodAnalysisResult | null>(null);
  
  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError(new Error('Please select an image file'));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError(new Error('Image size should be less than 5MB'));
      return;
    }
    
    setSelectedImage(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle camera capture
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
  
  // Handle upload and analysis
  const handleUploadAndAnalyze = async () => {
    if (!selectedImage || !previewUrl) {
      onError(new Error('Please select an image first'));
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // If we're still uploading, increment progress
          if (prev < 90) return prev + 10;
          clearInterval(progressInterval);
          return prev;
        });
      }, 300);
      
      // Convert image to base64
      setIsAnalyzing(true);
      
      // Upload and analyze the image
      const result = await uploadAndAnalyzeFoodImage(userId, previewUrl);
      
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      // Set the analysis results
      setAnalysisResults(result.analysisResult);
      setIsAnalyzing(false);
      
      // If mealType is provided, update the analysis result
      let finalAnalysisResult = result.analysisResult;
      if (mealType && mealType !== finalAnalysisResult.mealType) {
        finalAnalysisResult = {
          ...finalAnalysisResult,
          mealType
        };
      }
      
      // Add food entry from image
      const entry = await addFoodEntryFromImage(
        userId,
        finalAnalysisResult,
        result.imageData.id
      );
      
      // Call the success callback
      onSuccess(entry.id);
      
    } catch (error) {
      console.error('Error uploading and analyzing image:', error);
      onError(error instanceof Error ? error : new Error('Failed to process image'));
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setAnalysisResults(null);
    onCancel();
  };
  
  return (
    <div className="food-image-uploader p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Upload Food Image</h3>
      
      {/* Image Preview */}
      {previewUrl ? (
        <div className="image-preview mb-4">
          <img 
            src={previewUrl} 
            alt="Food preview" 
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      ) : (
        <div className="image-placeholder bg-gray-100 h-48 rounded-lg flex items-center justify-center mb-4">
          <p className="text-gray-500">Select or capture an image</p>
        </div>
      )}
      
      {/* Upload Progress */}
      {isUploading && (
        <div className="upload-progress mb-4">
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isAnalyzing ? 'Analyzing image...' : 'Uploading...'}
          </p>
        </div>
      )}
      
      {/* Analysis Results */}
      {analysisResults && !isUploading && (
        <div className="analysis-results mb-4 p-2 bg-green-50 rounded border border-green-200">
          <h4 className="font-medium text-green-800">Analysis Results:</h4>
          <p className="text-sm text-green-700">{analysisResults.description}</p>
          <p className="text-sm text-green-700">
            Calories: {analysisResults.totalCalories} | Items: {analysisResults.items.length}
          </p>
        </div>
      )}
      
      {/* Controls */}
      <div className="controls flex flex-col space-y-2">
        {!isUploading ? (
          <>
            {!previewUrl ? (
              <>
                <button 
                  onClick={handleCameraCapture}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  📷 Take Photo
                </button>
                <button 
                  onClick={handleGallerySelect}
                  className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  🖼️ Choose from Gallery
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleUploadAndAnalyze}
                  className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  📤 Upload & Analyze
                </button>
                <button 
                  onClick={handleGallerySelect}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  🔄 Change Image
                </button>
              </>
            )}
            <button 
              onClick={handleCancel}
              className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
            >
              ❌ Cancel
            </button>
          </>
        ) : (
          <button 
            onClick={handleCancel}
            className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
          >
            ⚠️ Cancel Upload
          </button>
        )}
      </div>
      
      {/* Hidden File Input */}
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept="image/*"
      />
    </div>
  );
};

export default FoodImageUploader; 