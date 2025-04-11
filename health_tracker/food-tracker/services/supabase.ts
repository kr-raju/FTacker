/**
 * Supabase service
 * This file provides Supabase services for authentication and database access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, DB_TABLES } from './dbConfig';

// Initialize Supabase client
let supabase: SupabaseClient;

try {
  supabase = createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.apiKey,
    {
      auth: {
        persistSession: true
      }
    }
  );
  console.log('Supabase client initialized');
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  throw error;
}

// Authentication functions
export const registerUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    
    if (data?.user) {
      // Create a user profile in the users table
      const { error: profileError } = await supabase
        .from(DB_TABLES.USERS)
        .insert({
          id: data.user.id,
          email: data.user.email,
          display_name: email.split('@')[0], // Default display name
          created_at: new Date().toISOString(),
          settings: {
            measurement_unit: 'metric',
            calorie_goal: 2000,
            water_goal: 2000 // ml
          }
        });
      
      if (profileError) throw profileError;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return supabase.auth.getUser().then(({ data }) => data.user);
};

export const onUserStateChanged = (callback: (user: any | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  
  // Return the unsubscribe function
  return data.subscription.unsubscribe;
};

// Get user profile data
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('User not found');
    
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Storage functions
export const uploadFile = async (bucket: string, path: string, file: File | string) => {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const getFileUrl = async (bucket: string, path: string) => {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
};

// Helper functions
export const formatSupabaseResponse = (item: any) => {
  // Convert Supabase camelCase to snake_case
  const formatted: any = { ...item };
  
  // Convert created_at and updated_at to Date objects
  if (formatted.created_at) formatted.createdAt = new Date(formatted.created_at);
  if (formatted.updated_at) formatted.updatedAt = new Date(formatted.updated_at);
  
  // Other common conversions
  if (formatted.user_id) formatted.userId = formatted.user_id;
  if (formatted.display_name) formatted.displayName = formatted.display_name;
  if (formatted.food_entry_id) formatted.foodEntryId = formatted.food_entry_id;
  if (formatted.image_url) formatted.imageUrl = formatted.image_url;
  if (formatted.thumbnail_url) formatted.thumbnailUrl = formatted.thumbnail_url;
  if (formatted.water_intake) formatted.waterIntake = formatted.water_intake;
  if (formatted.last_updated) formatted.lastUpdated = new Date(formatted.last_updated);
  if (formatted.is_from_image) formatted.isFromImage = formatted.is_from_image;
  
  return formatted;
};

export { supabase }; 