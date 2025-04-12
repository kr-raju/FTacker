import * as dbProvider from './db-provider';
import { FoodAnalysisResult, FoodImageData } from '../types/ai';
import { FoodEntry } from './foodService';
import { analyzeFoodImage } from './ai/geminiService';

// Create an MD5 hash function for simple similarity matching
// This is a basic implementation - for production, use a proper hashing library
const generateImageHash = (imageBase64: string): string => {
  // Simple hash function for demo purposes
  // In production, use a proper hashing function or image fingerprinting
  return btoa(imageBase64.substring(0, 100)).substring(0, 16);
};

/**
 * Find similar food images in our database
 * @param userId The user ID
 * @param imageHash Hash of the image to find
 * @returns Matching food image data if found
 */
export const findSimilarFoodImage = async (userId: string, imageHash: string): Promise<FoodImageData & { id: string } | null> => {
  try {
    // Query for images with the same hash and belonging to the user
    const images = await dbProvider.queryDocuments('food_images', [
      { field: 'hash', operator: '==', value: imageHash },
      { field: 'userId', operator: '==', value: userId }
    ]);
    
    if (!images || images.length === 0) {
      return null;
    }
    
    // Get the first matching image
    const data = images[0];
    
    if (!data.id) {
      return null;
    }
    
    return {
      id: data.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      analysisResult: data.analysisResult,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      foodEntryId: data.foodEntryId,
      hash: data.hash
    } as FoodImageData & { id: string };
  } catch (error) {
    console.error('Error finding similar food image:', error);
    return null;
  }
};

/**
 * Upload and analyze a food image
 * @param userId User ID
 * @param imageBase64 Base64 encoded image data
 * @returns Analysis result and image URLs
 */
export const uploadAndAnalyzeFoodImage = async (
  userId: string,
  imageBase64: string
): Promise<{
  analysisResult: FoodAnalysisResult;
  imageUrl: string;
  thumbnailUrl: string;
  imageData: FoodImageData & { id: string };
}> => {
  try {
    // Generate image hash for comparing similar images
    const imageHash = await generateImageHash(imageBase64);
    
    // Check if we already have a similar image
    const existingImage = await findSimilarFoodImage(userId, imageHash);
    
    if (existingImage && existingImage.id) {
      console.log('Found existing analysis for similar image');
      return {
        analysisResult: existingImage.analysisResult,
        imageUrl: existingImage.imageUrl,
        thumbnailUrl: existingImage.thumbnailUrl || existingImage.imageUrl,
        imageData: existingImage
      };
    }
    
    // Upload image to storage
    const timestamp = new Date().getTime();
    const imagePath = `${userId}/${timestamp}.jpg`;
    
    console.log(`Uploading image to path: ${imagePath} in bucket: food-images`);
    
    // Upload the image using our provider interface
    try {
      const { url: imageUrl } = await dbProvider.uploadBase64File('food-images', imagePath, imageBase64);
      
      // For simplicity, we'll use the same image as thumbnail
      // In production, you'd generate a smaller thumbnail
      const thumbnailUrl = imageUrl;
      
      // Analyze the image using Gemini
      // Remove the base64 prefix if present
      const base64Data = imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64;
        
      const analysisResult = await analyzeFoodImage(base64Data);
      
      // Store the image data and analysis in the database
      const foodImageData: FoodImageData = {
        userId,
        imageUrl,
        thumbnailUrl,
        analysisResult,
        hash: imageHash,
        createdAt: new Date()
      };
      
      // Create a document in our database
      const imageDoc = await dbProvider.createDocument('food_images', foodImageData);
      
      return {
        analysisResult,
        imageUrl,
        thumbnailUrl,
        imageData: {
          ...foodImageData,
          id: imageDoc.id
        }
      };
    } catch (uploadError: any) {
      console.error('Storage upload error:', uploadError);
      throw {
        message: `Failed to upload image: ${uploadError.message || 'Unknown storage error'}`,
        original: uploadError
      };
    }
  } catch (error: any) {
    console.error('Error uploading and analyzing food image:', error);
    
    // Provide a more helpful error message
    if (error.statusCode === '500' && error.code === 'DatabaseError') {
      throw {
        message: 'There was a problem saving your image to storage. Please try again or contact support.',
        original: error
      };
    }
    
    throw error;
  }
};

/**
 * Get a food image by ID
 * @param imageId Food image ID
 * @returns Food image data
 */
export const getFoodImage = async (imageId: string): Promise<FoodImageData | null> => {
  try {
    const data = await dbProvider.getDocument('food_images', imageId);
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      analysisResult: data.analysisResult,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      foodEntryId: data.foodEntryId,
      hash: data.hash
    } as FoodImageData;
  } catch (error) {
    console.error('Error getting food image:', error);
    return null;
  }
};

/**
 * Link a food image to a food entry
 * @param imageId Food image ID
 * @param foodEntryId Food entry ID
 */
export const linkFoodImageToEntry = async (imageId: string, foodEntryId: string): Promise<boolean> => {
  try {
    await dbProvider.updateDocument('food_images', imageId, {
      foodEntryId,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error linking food image to entry:', error);
    return false;
  }
};

/**
 * Add a food entry from image analysis
 * @param userId User ID
 * @param analysisResult Food analysis result
 * @param imageId Optional ID of the stored image
 * @returns Created food entry
 */
export const addFoodEntryFromImage = async (
  userId: string,
  analysisResult: FoodAnalysisResult,
  imageId?: string
): Promise<FoodEntry & { id: string, imageId?: string }> => {
  try {
    // Format the entry data
    const now = new Date();
    // Format date as ISO string to ensure compatibility with the database
    const isoDate = now.toISOString();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    console.log("Creating food entry from image analysis for user:", userId);
    console.log("Analysis result:", analysisResult);
    console.log("Image ID:", imageId);
    
    const entryData = {
      userId: userId,
      user_id: userId, // Include both formats for compatibility
      name: analysisResult.description,
      calories: analysisResult.totalCalories,
      // Store date in ISO format for the database
      date: isoDate,
      time: timeString,
      type: analysisResult.mealType,
      completed: true,
      description: `${analysisResult.items.map(item => item.name).join(', ')}`,
      waterIntake: analysisResult.waterIntake,
      water_intake: analysisResult.waterIntake, // Include both formats
      items: analysisResult.items.map(item => item.name),
      count: 1,
      createdAt: isoDate,
      created_at: isoDate, // Include both formats
      updatedAt: isoDate,
      updated_at: isoDate, // Include both formats
      isFromImage: true,
      is_from_image: true // Include both formats
    };
    
    // Add the image ID if provided
    const entryWithImage = imageId ? { 
      ...entryData, 
      imageId: imageId,
      image_id: imageId // Include both formats
    } : entryData;
    
    console.log("Food entry data to be created:", entryWithImage);
    
    // Create food entry in our database
    const foodEntry = await dbProvider.createDocument('food_entries', entryWithImage);
    console.log("Created food entry:", foodEntry);
    
    // If we have an image ID, link it to this entry
    if (imageId) {
      const linkedResult = await linkFoodImageToEntry(imageId, foodEntry.id);
      console.log("Linked food image to entry:", linkedResult);
    }
    
    // Return a properly formatted entry that can be used by the app
    return {
      ...foodEntry,
      // Ensure date is a JavaScript Date object
      date: now,
      time: timeString,
      // Add both camelCase and snake_case properties for compatibility
      userId: userId,
      user_id: userId,
      imageId: imageId,
      image_id: imageId,
      isFromImage: true,
      is_from_image: true,
      lastUpdated: now
    };
  } catch (error) {
    console.error('Error adding food entry from image:', error);
    throw error;
  }
}; 