import { 
  uploadFile, 
  getFileUrl, 
  serverTimestamp, 
  formatTimestamp, 
  getProvider,
  db,
  translateFieldName
} from './dbService';
import { DB_TABLES, SUPABASE_CONFIG } from './dbConfig';
import { FoodAnalysisResult, FoodImageData } from '../types/ai';
import { FoodEntry } from './foodService';
import { analyzeFoodImage } from './ai/geminiService';
import { collection, query, where, getDocs, limit, doc, getDoc, setDoc } from 'firebase/firestore';

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
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_IMAGES)
        .select('*')
        .eq('hash', imageHash)
        .limit(1);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Convert snake_case to camelCase
      const imageData = data[0];
      return {
        id: imageData.id,
        userId: imageData.user_id,
        imageUrl: imageData.image_url,
        thumbnailUrl: imageData.thumbnail_url,
        analysisResult: imageData.analysis_result,
        createdAt: new Date(imageData.created_at),
        foodEntryId: imageData.food_entry_id,
        hash: imageData.hash
      } as FoodImageData;
    } else {
      // Firebase implementation
      const q = query(
        collection(db as any, DB_TABLES.FOOD_IMAGES),
        where('hash', '==', imageHash),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        analysisResult: data.analysisResult,
        createdAt: formatTimestamp(data.createdAt),
        foodEntryId: data.foodEntryId,
        hash: data.hash
      } as FoodImageData;
    }
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
    
    // Upload image to storage
    const timestamp = new Date().getTime();
    const filePath = `${userId}/${timestamp}.jpg`;
    
    // Remove the base64 prefix if present
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;
    
    // Upload the image
    await uploadFile(SUPABASE_CONFIG.bucket, filePath, base64Data);
    
    // Get the image URL
    const imageUrl = await getFileUrl(SUPABASE_CONFIG.bucket, filePath);
    
    // For simplicity, we'll use the same image as thumbnail
    // In production, you'd generate a smaller thumbnail
    const thumbnailUrl = imageUrl;
    
    // Analyze the image using Gemini
    const base64ForAnalysis = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;
    const analysisResult = await analyzeFoodImage(base64ForAnalysis);
    
    // Store the image data and analysis in database
    const foodImageData: FoodImageData = {
      userId,
      imageUrl,
      thumbnailUrl,
      analysisResult,
      hash: imageHash,
      createdAt: new Date()
    };
    
    let imageId;
    
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_IMAGES)
        .insert({
          user_id: userId,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          analysis_result: analysisResult,
          hash: imageHash,
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) throw error;
      imageId = data[0].id;
    } else {
      // Firebase implementation
      const docRef = await (db as any).collection(DB_TABLES.FOOD_IMAGES).add({
        userId,
        imageUrl,
        thumbnailUrl,
        analysisResult,
        hash: imageHash,
        createdAt: serverTimestamp()
      });
      
      imageId = docRef.id;
    }
    
    return {
      analysisResult,
      imageUrl,
      thumbnailUrl,
      imageData: {
        ...foodImageData,
        id: imageId
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
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_IMAGES)
        .select('*')
        .eq('id', imageId)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        return null;
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        imageUrl: data.image_url,
        thumbnailUrl: data.thumbnail_url,
        analysisResult: data.analysis_result,
        createdAt: new Date(data.created_at),
        foodEntryId: data.food_entry_id,
        hash: data.hash
      } as FoodImageData;
    } else {
      // Firebase implementation
      const docRef = doc(db as any, DB_TABLES.FOOD_IMAGES, imageId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        analysisResult: data.analysisResult,
        createdAt: formatTimestamp(data.createdAt),
        foodEntryId: data.foodEntryId,
        hash: data.hash
      } as FoodImageData;
    }
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
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const { error } = await (db as any)
        .from(DB_TABLES.FOOD_IMAGES)
        .update({
          food_entry_id: foodEntryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId);
        
      if (error) throw error;
    } else {
      // Firebase implementation
      await (db as any).collection(DB_TABLES.FOOD_IMAGES).doc(imageId).update({
        foodEntryId,
        updatedAt: serverTimestamp()
      });
    }
    
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
    
    let entryId;
    
    if (getProvider() === 'supabase') {
      // Supabase implementation
      const { data, error } = await (db as any)
        .from(DB_TABLES.FOOD_ENTRIES)
        .insert({
          user_id: userId,
          name: analysisResult.description,
          calories: analysisResult.totalCalories,
          date: now.toISOString(),
          time: timeString,
          type: analysisResult.mealType,
          completed: true,
          description: `${analysisResult.items.map(item => item.name).join(', ')}`,
          water_intake: analysisResult.waterIntake,
          items: analysisResult.items.map(item => item.name),
          count: 1,
          last_updated: now.toISOString(),
          image_id: imageId,
          is_from_image: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select();
        
      if (error) throw error;
      entryId = data[0].id;
    } else {
      // Firebase implementation
      const entryRef = doc(collection(db as any, DB_TABLES.FOOD_ENTRIES));
      
      // Convert Date objects to Firestore Timestamps
      await setDoc(entryRef, {
        ...entryWithImage,
        date: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isFromImage: true
      });
      
      entryId = entryRef.id;
    }
    
    // If we have an image ID, link it to this entry
    if (imageId) {
      await linkFoodImageToEntry(imageId, entryId);
    }
    
    return {
      ...entryWithImage,
      id: entryId,
      imageId
    } as FoodEntry & { id: string, imageId?: string };
  } catch (error) {
    console.error('Error adding food entry from image:', error);
    throw error;
  }
}; 