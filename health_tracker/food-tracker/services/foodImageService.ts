import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
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
 * @param imageHash Hash of the image to find
 * @returns Matching food image data if found
 */
export const findSimilarFoodImage = async (imageHash: string): Promise<FoodImageData | null> => {
  try {
    const q = query(
      collection(db, 'food_images'),
      where('hash', '==', imageHash)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const data = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      analysisResult: data.analysisResult,
      createdAt: data.createdAt?.toDate(),
      foodEntryId: data.foodEntryId,
      hash: data.hash
    } as FoodImageData;
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
  analysisResult: FoodAnalysisResult,
  imageUrl: string,
  thumbnailUrl: string,
  imageData: FoodImageData
}> => {
  try {
    // Generate hash for image comparison
    const imageHash = generateImageHash(imageBase64);
    
    // Check if we've seen this image before
    const existingImage = await findSimilarFoodImage(imageHash);
    
    if (existingImage) {
      console.log('Found existing analysis for similar image');
      return {
        analysisResult: existingImage.analysisResult,
        imageUrl: existingImage.imageUrl,
        thumbnailUrl: existingImage.thumbnailUrl || existingImage.imageUrl,
        imageData: existingImage
      };
    }
    
    // Upload image to Firebase Storage
    const storage = getStorage();
    const timestamp = new Date().getTime();
    const imageRef = ref(storage, `food_images/${userId}/${timestamp}.jpg`);
    
    // Remove the base64 prefix if present
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;
    
    // Upload the image
    await uploadString(imageRef, base64Data, 'base64');
    
    // Get the image URL
    const imageUrl = await getDownloadURL(imageRef);
    
    // For simplicity, we'll use the same image as thumbnail
    // In production, you'd generate a smaller thumbnail
    const thumbnailUrl = imageUrl;
    
    // Analyze the image using Gemini
    const analysisResult = await analyzeFoodImage(base64Data);
    
    // Store the image data and analysis in Firestore
    const foodImageData: FoodImageData = {
      userId,
      imageUrl,
      thumbnailUrl,
      analysisResult,
      hash: imageHash,
      createdAt: new Date()
    };
    
    const imageDocRef = await addDoc(collection(db, 'food_images'), {
      ...foodImageData,
      createdAt: serverTimestamp()
    });
    
    return {
      analysisResult,
      imageUrl,
      thumbnailUrl,
      imageData: {
        ...foodImageData,
        id: imageDocRef.id
      }
    };
  } catch (error) {
    console.error('Error uploading and analyzing food image:', error);
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
    const imageDoc = await getDoc(doc(db, 'food_images', imageId));
    
    if (!imageDoc.exists()) {
      return null;
    }
    
    const data = imageDoc.data();
    return {
      id: imageDoc.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      analysisResult: data.analysisResult,
      createdAt: data.createdAt?.toDate(),
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
    await updateDoc(doc(db, 'food_images', imageId), {
      foodEntryId,
      updatedAt: serverTimestamp()
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
    // Create the food entry document
    const foodEntryRef = doc(collection(db, 'food_entries'));
    
    // Format the entry data
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const entryData: Omit<FoodEntry, 'id'> = {
      userId,
      name: analysisResult.description,
      calories: analysisResult.totalCalories,
      date: now,
      time: timeString,
      type: analysisResult.mealType,
      completed: true,
      description: `${analysisResult.items.map(item => item.name).join(', ')}`,
      waterIntake: analysisResult.waterIntake,
      items: analysisResult.items.map(item => item.name),
      count: 1,
      lastUpdated: now
    };
    
    // Add the image ID if provided
    const entryWithImage = imageId ? { ...entryData, imageId } : entryData;
    
    // Convert Date objects to Firestore Timestamps
    const firestoreData = {
      ...entryWithImage,
      date: Timestamp.fromDate(now),
      lastUpdated: Timestamp.fromDate(now),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(foodEntryRef, firestoreData);
    
    // If we have an image ID, link it to this entry
    if (imageId) {
      await linkFoodImageToEntry(imageId, foodEntryRef.id);
    }
    
    return {
      id: foodEntryRef.id,
      ...entryData,
      imageId
    };
  } catch (error) {
    console.error('Error adding food entry from image:', error);
    throw error;
  }
}; 