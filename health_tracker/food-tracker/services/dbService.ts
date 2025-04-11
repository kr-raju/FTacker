/**
 * Unified Database Service
 * This file provides a unified interface for database operations,
 * abstracting away the differences between Firebase and Supabase.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  Timestamp, 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  WhereFilterOp 
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential } from 'firebase/auth';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DB_PROVIDER, FIREBASE_CONFIG, SUPABASE_CONFIG, DB_TABLES } from './dbConfig';

// Initialize Firebase
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);

// Initialize Supabase
const supabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.apiKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem(key);
          }
          return null;
        },
        setItem: (key, value) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
          }
        },
        removeItem: (key) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
          }
        }
      }
    }
  }
);

// Initialize Supabase admin client with service role
const supabaseAdmin = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Export a unified database interface
export const dbProvider = DB_PROVIDER;

// Export the database instance (typed as any to allow both Firebase and Supabase)
export const db = DB_PROVIDER === 'firebase' ? firebaseDb : supabaseClient;

// Auth services
export const auth = {
  signIn: async (email: string, password: string): Promise<any> => {
    if (DB_PROVIDER === 'firebase') {
      return await signInWithEmailAndPassword(firebaseAuth, email, password);
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Ensure we have a session
      if (!data.session) {
        throw new Error('No session created after login');
      }
      
      return data;
    }
  },
  
  signUp: async (email: string, password: string): Promise<any> => {
    if (DB_PROVIDER === 'firebase') {
      return await createUserWithEmailAndPassword(firebaseAuth, email, password);
    } else {
      // First, sign up the user
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            email: email
          }
        }
      });
      
      if (authError) throw authError;
      
      // Return the auth data without trying to create the profile yet
      // The profile will be created after email verification
      return authData;
    }
  },
  
  signOut: async (): Promise<void> => {
    if (DB_PROVIDER === 'firebase') {
      await firebaseSignOut(firebaseAuth);
    } else {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    }
  },
  
  getCurrentUser: async (): Promise<any> => {
    if (DB_PROVIDER === 'firebase') {
      return firebaseAuth.currentUser;
    } else {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    }
  },

  // Add new method to check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    if (DB_PROVIDER === 'supabase') {
      const { data: { session } } = await supabaseClient.auth.getSession();
      return !!session;
    } else {
      return !!getAuth().currentUser;
    }
  },

  // Update the createUserProfile method to use the admin client
  createUserProfile: async (userId: string, email: string): Promise<any> => {
    if (DB_PROVIDER === 'firebase') return null; // Not needed for Firebase
    
    const { data, error } = await supabaseAdmin
      .from(DB_TABLES.USERS)
      .insert({
        id: userId,
        user_id: userId,
        email: email,
        display_name: email.split('@')[0], // Default display name
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
    
    return data;
  }
};

/**
 * Get the active database provider
 * @returns 'firebase' or 'supabase'
 */
export const getProvider = (): 'firebase' | 'supabase' => DB_PROVIDER;

/**
 * Helper function to translate camelCase field names to snake_case for Supabase
 * @param fieldName camelCase field name
 * @returns snake_case field name if using Supabase, original name if using Firebase
 */
export const translateFieldName = (fieldName: string): string => {
  if (DB_PROVIDER === 'firebase') return fieldName;
  
  // Convert camelCase to snake_case
  return fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
};

/**
 * Get a server timestamp
 * @returns A timestamp object for the current database provider
 */
export const serverTimestamp = (): any => {
  if (DB_PROVIDER === 'firebase') {
    return Timestamp.now();
  } else {
    return new Date().toISOString();
  }
};

/**
 * Format a timestamp from the database to a JavaScript Date
 * @param timestamp The timestamp from the database
 * @returns JavaScript Date object
 */
export const formatTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  
  if (DB_PROVIDER === 'firebase') {
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  } else {
    return new Date(timestamp);
  }
};

/**
 * Upload a file to storage
 * @param bucket Bucket name (for Supabase)
 * @param filePath Path to store the file
 * @param fileData File data (string or Base64)
 * @returns The upload result
 */
export const uploadFile = async (
  bucket: string, 
  filePath: string, 
  fileData: string
): Promise<any> => {
  if (DB_PROVIDER === 'firebase') {
    const storageRef = ref(firebaseStorage, filePath);
    return await uploadString(storageRef, fileData, 'data_url');
  } else {
    const { data, error } = await supabaseClient
      .storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (error) throw error;
    return data;
  }
};

/**
 * Get a file URL from storage
 * @param bucket Bucket name (for Supabase)
 * @param filePath Path to the file
 * @returns The file URL
 */
export const getFileUrl = async (bucket: string, filePath: string): Promise<string> => {
  if (DB_PROVIDER === 'firebase') {
    const storageRef = ref(firebaseStorage, filePath);
    return await getDownloadURL(storageRef);
  } else {
    const { data } = supabaseClient
      .storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  }
};

// Generic database operations (can be expanded as needed)
export const getTables = () => DB_TABLES;

// Type for collection return object
type CollectionHelpers = {
  add?: (data: any) => Promise<any>;
  doc?: (id?: string) => any;
  insert?: (data: any) => any;
  select?: (columns?: string) => any;
  update?: (data: any) => any;
  delete?: () => any;
  where?: (field: string, operator: string, value: any) => any;
  eq?: (field: string, value: any) => any;
  get?: () => Promise<any>;
  single?: () => any;
  limit?: (n: number) => any;
  orderBy?: (field: string, direction?: 'asc' | 'desc') => any;
  order?: (field: string, options?: any) => any;
};

// Helper functions for database operations
export const getCollection = (collectionName: string): CollectionHelpers => {
  if (DB_PROVIDER === 'firebase') {
    // For Firebase, we'd use the collection method
    return {
      add: (data: any) => addDoc(collection(firebaseDb, collectionName), data),
      doc: (id?: string) => id ? doc(firebaseDb, collectionName, id) : doc(collection(firebaseDb, collectionName)),
      where: (field: string, operator: string, value: any) => query(collection(firebaseDb, collectionName), where(field, operator as WhereFilterOp, value)),
      get: () => getDocs(collection(firebaseDb, collectionName)),
      limit: (n: number) => query(collection(firebaseDb, collectionName), limit(n)),
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => query(collection(firebaseDb, collectionName), orderBy(field, direction))
    };
  } else {
    // For Supabase, we'd use the from method
    // Using type assertion to handle Supabase methods
    const supabaseTable = supabaseClient.from(collectionName);
    
    return {
      insert: (data: any) => supabaseTable.insert(data),
      select: (columns: string = '*') => supabaseTable.select(columns),
      update: (data: any) => supabaseTable.update(data),
      delete: () => supabaseTable.delete(),
      // Use type assertion for methods not recognized by TypeScript
      eq: (field: string, value: any) => (supabaseTable as any).eq(field, value),
      single: () => (supabaseTable as any).single(),
      limit: (n: number) => (supabaseTable as any).limit(n),
      order: (field: string, direction: 'asc' | 'desc' = 'asc') => 
        (supabaseTable as any).order(field, { ascending: direction === 'asc' })
    };
  }
}; 