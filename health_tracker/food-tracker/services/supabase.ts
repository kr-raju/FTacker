/**
 * Supabase service
 * This file provides Supabase services for authentication and database access
 */

// We're assuming @supabase/supabase-js is installed. If not, the user needs to:
// npm install --save @supabase/supabase-js

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { convertToCamelCase, convertToSnakeCase } from './db-provider';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton instance of the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    autoRefreshToken: true, // Automatically refresh tokens
    storageKey: 'supabase-auth', // Storage key name
  }
});

// Authentication
export const registerUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  
  // If successful, also create a user profile
  if (data.user) {
    try {
      // Create user profile in the users table
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (profileError) {
      console.error("Error creating user profile:", profileError);
      // We'll continue even if creating profile fails
    }
  }
  
  return data;
};

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = () => {
  return supabase.auth.getUser().then(({ data, error }) => {
    if (error) return null;
    return data?.user || null;
  });
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return convertToCamelCase(data);
};

// Helper function to get session
const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Database
export const createDocument = async (table: string, data: any) => {
  // First ensure we have a valid session - this is important for RLS policies
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  
  const snakeCaseData = convertToSnakeCase(data);
  
  // Add timestamps if they don't exist
  if (!snakeCaseData.created_at) {
    snakeCaseData.created_at = new Date().toISOString();
  }
  if (!snakeCaseData.updated_at) {
    snakeCaseData.updated_at = new Date().toISOString();
  }
  
  console.log(`Creating document in ${table} with data:`, snakeCaseData);
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(snakeCaseData)
    .select()
    .single();
  
  if (error) {
    console.error(`Error creating document in ${table}:`, error);
    throw error;
  }
  
  return convertToCamelCase(result);
};

export const getDocument = async (table: string, id: string) => {
  // First ensure we have a valid session
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  
  return convertToCamelCase(data);
};

export const setDocument = async (table: string, id: string, data: any) => {
  // First ensure we have a valid session
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  
  const snakeCaseData = convertToSnakeCase(data);
  
  // Add timestamps
  if (!snakeCaseData.created_at) {
    snakeCaseData.created_at = new Date().toISOString();
  }
  snakeCaseData.updated_at = new Date().toISOString();
  
  // Add id to data
  snakeCaseData.id = id;
  
  const { data: result, error } = await supabase
    .from(table)
    .upsert(snakeCaseData)
    .select()
    .single();
  
  if (error) throw error;
  return convertToCamelCase(result);
};

export const updateDocument = async (table: string, id: string, data: any) => {
  // First ensure we have a valid session
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  
  const snakeCaseData = convertToSnakeCase(data);
  
  // Add updated_at timestamp
  snakeCaseData.updated_at = new Date().toISOString();
  
  const { data: result, error } = await supabase
    .from(table)
    .update(snakeCaseData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return convertToCamelCase(result);
};

export const deleteDocument = async (table: string, id: string) => {
  // First ensure we have a valid session
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in.');
  }
  
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

export const queryDocuments = async (collection: string, filters: any = {}): Promise<any[]> => {
  try {
    // First ensure we have a valid session
    const session = await getSession();
    if (!session) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    let query = supabase
      .from(collection)
      .select('*');
    
    // Process the filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;
      
      // Handle date range queries
      if (key.endsWith('_gte') || key.endsWith('_lte')) {
        const operator = key.endsWith('_gte') ? 'gte' : 'lte';
        const fieldName = key.replace(/_gte$|_lte$/, '');
        
        // Format dates properly for Supabase - use proper ISO format without timezone
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          const dateValue = typeof value === 'string' ? new Date(value) : value;
          // Use proper ISO string format without timezone info
          const formattedDate = dateValue.toISOString().split('T')[0];
          query = query.filter(fieldName, operator, formattedDate);
        } else {
          query = query.filter(fieldName, operator, value);
        }
      } 
      // Handle array-based 'in' filters
      else if (Array.isArray(value)) {
        query = query.in(key, value);
      }
      // Handle direct equality
      else {
        query = query.eq(key, value);
      }
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Convert the snake_case keys to camelCase for consistency
    return data ? data.map(item => convertToCamelCase(item)) : [];
  } catch (error) {
    console.error(`Error querying ${collection}:`, error);
    throw error;
  }
}

// File Storage
export const uploadFile = async (bucket: string, path: string, file: File): Promise<{ path: string, url: string }> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return { 
    path: data.path, 
    url: urlData.publicUrl 
  };
};

export const uploadBase64File = async (bucket: string, path: string, base64Data: string): Promise<{ path: string, url: string }> => {
  // Convert base64 to blob
  const base64Response = await fetch(base64Data);
  const blob = await base64Response.blob();
  
  // Supabase expects the path without the bucket name
  // The bucket name is passed separately as the argument to "from()"
  // If the path starts with the bucket name, remove it to avoid duplication
  let cleanPath = path;
  if (path.startsWith(`${bucket}/`)) {
    cleanPath = path.substring(bucket.length + 1);
  }
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(cleanPath, blob, {
      upsert: true,
      contentType: 'image/jpeg' // Use JPEG for food images
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(cleanPath);
  
  return { 
    path: cleanPath, 
    url: urlData.publicUrl 
  };
};

export const getFileUrl = async (bucket: string, path: string): Promise<string> => {
  // Clean the path to ensure it doesn't include the bucket name
  let cleanPath = path;
  if (path.startsWith(`${bucket}/`)) {
    cleanPath = path.substring(bucket.length + 1);
  }
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(cleanPath);
  
  return data.publicUrl;
};

export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  // Clean the path to ensure it doesn't include the bucket name
  let cleanPath = path;
  if (path.startsWith(`${bucket}/`)) {
    cleanPath = path.substring(bucket.length + 1);
  }
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([cleanPath]);
  
  if (error) throw error;
  return true;
};

export const getClient = () => supabase;
export default supabase; 