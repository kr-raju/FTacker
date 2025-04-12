'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Camera, Upload, X } from 'lucide-react'
import * as dbProvider from '../services/db-provider'
import { useAuth } from '../app/auth-provider'
import { uploadAndAnalyzeFoodImage, addFoodEntryFromImage } from '../services/foodImageService'
import { MealType } from '../types/food'

interface PhotoUploaderProps {
  isOpen: boolean
  onClose: () => void
  mealType: string
  onSuccess: () => void
}

export function PhotoUploader({ isOpen, onClose, mealType, onSuccess }: PhotoUploaderProps) {
  const { user } = useAuth()
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview || !user) return

    try {
      setUploading(true)
      
      // Get the user ID
      const userId = user.uid || '';
      
      if (!userId) {
        console.error("No user ID available");
        return;
      }
      
      console.log("Starting image upload with user ID:", userId, "and meal type:", mealType);
      
      // Upload and analyze the image
      setAnalyzing(true);
      
      // Process the image using the foodImageService
      const result = await uploadAndAnalyzeFoodImage(userId, preview);
      
      console.log("Analysis complete:", result.analysisResult);
      console.log("Image URL:", result.imageUrl);
      console.log("Image data:", result.imageData);
      
      // Override meal type if specified
      const mealTypeToUse = mealType as MealType || result.analysisResult.mealType;
      const analysisWithMealType = {
        ...result.analysisResult,
        mealType: mealTypeToUse
      };
      
      // Add a food entry based on the analysis
      console.log("Creating food entry with analysis:", analysisWithMealType);
      const entry = await addFoodEntryFromImage(
        userId,
        analysisWithMealType,
        result.imageData.id
      );
      
      console.log("Food entry created successfully:", entry);
      onSuccess();
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error uploading image:', error)
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setPreview(null)
    setUploading(false)
    setAnalyzing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload {mealType} photo</DialogTitle>
        </DialogHeader>
        
        {!preview ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-6">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button 
              variant="outline" 
              className="w-full h-20 border-dashed"
              onClick={handleCapture}
            >
              <Camera className="mr-2 h-5 w-5" />
              Take a photo
            </Button>
            <span className="text-sm text-gray-500">or</span>
            <Button 
              variant="outline" 
              className="w-full h-20 border-dashed"
              onClick={handleCapture}
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload from gallery
            </Button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="relative aspect-video w-full bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={preview} 
                alt="Food preview" 
                className="w-full h-full object-cover"
              />
              <button 
                className="absolute top-2 right-2 p-1 bg-white rounded-full"
                onClick={handleReset}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={uploading || analyzing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={uploading || analyzing}
              >
                {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Upload & Analyze'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 