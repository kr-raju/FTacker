/**
 * Database Provider Interface
 * This file provides an abstraction layer for different database providers
 * Currently supports Firebase and Supabase
 */

import * as firebase from './firebase';
import * as supabase from './supabase';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Define the query condition type
export type Condition = {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in';
  value: any;
};

// Define the type for our database providers
export type DatabaseProvider = 'firebase' | 'supabase';

// Get the active provider from environment variable, default to firebase
const activeProvider: DatabaseProvider = 
  (process.env.NEXT_PUBLIC_DEFAULT_DB_PROVIDER as DatabaseProvider) || 'firebase';

console.log(`Using ${activeProvider} as the database provider`);

// Helper functions to convert between camelCase and snake_case
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, p1) => p1.toUpperCase());
};

export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Convert object keys from snake_case to camelCase
export const convertToCamelCase = (obj: Record<string, any>): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToCamelCase(item));
  }

  const camelCaseObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key);
      camelCaseObj[camelKey] = convertToCamelCase(obj[key]);
    }
  }
  return camelCaseObj;
};

// Convert object keys from camelCase to snake_case
export const convertToSnakeCase = (obj: Record<string, any>): any => {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToSnakeCase(item));
  }

  const snakeCaseObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = toSnakeCase(key);
      snakeCaseObj[snakeKey] = convertToSnakeCase(obj[key]);
    }
  }
  return snakeCaseObj;
};

// User type that works for both Firebase and Supabase
export type AppUser = {
  id: string;
  email: string | null;
  displayName?: string | null;
} & (FirebaseUser | SupabaseUser);

// Authentication functions
export const registerUser = async (email: string, password: string): Promise<any> => {
  if (activeProvider === 'supabase') {
    return supabase.registerUser(email, password);
  } else {
    return firebase.registerUser(email, password);
  }
};

export const loginUser = async (email: string, password: string): Promise<any> => {
  return activeProvider === 'firebase'
    ? firebase.loginUser(email, password)
    : supabase.loginUser(email, password);
};

export const signOut = async (): Promise<void> => {
  return activeProvider === 'firebase'
    ? firebase.signOut()
    : supabase.signOut();
};

export const getCurrentUser = (): any => {
  return activeProvider === 'firebase'
    ? firebase.getCurrentUser()
    : supabase.getCurrentUser();
};

export const getUserProfile = async (userId: string): Promise<any> => {
  return activeProvider === 'firebase'
    ? firebase.getUserProfile(userId)
    : supabase.getUserProfile(userId);
};

// Generate a unique ID
export const generateId = (): string => {
  if (activeProvider === 'firebase') {
    // For Firebase, use the doc() function with an empty path to generate a new ID
    const { doc, collection } = require('firebase/firestore');
    const { db } = firebase;
    return doc(collection(db, 'temp')).id;
  } else {
    // For Supabase, use UUID v4
    return crypto.randomUUID();
  }
};

// Database functions
export const createDocument = async (collection: string, data: any): Promise<any> => {
  if (activeProvider === 'firebase') {
    // For Firebase, we use Firestore's collection and addDoc
    const { collection: firestoreCollection, addDoc } = await import('firebase/firestore');
    const { db } = firebase;
    const docRef = await addDoc(firestoreCollection(db, collection), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...data };
  } else {
    // For Supabase, we use the equivalent function
    return supabase.createDocument(collection, data);
  }
};

export const getDocument = async (collection: string, id: string): Promise<any> => {
  if (activeProvider === 'firebase') {
    // For Firebase, we use Firestore's collection, doc, and getDoc
    const { collection: firestoreCollection, doc, getDoc } = await import('firebase/firestore');
    const { db } = firebase;
    const docRef = doc(db, collection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } else {
    // For Supabase, we use the equivalent function
    return supabase.getDocument(collection, id);
  }
};

export const setDocument = async (collection: string, id: string, data: any): Promise<any> => {
  if (activeProvider === 'firebase') {
    // For Firebase, we use Firestore's doc and setDoc
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = firebase;
    const docRef = doc(db, collection, id);
    await setDoc(docRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id, ...data };
  } else {
    // For Supabase, we use upsert functionality
    return supabase.setDocument(collection, id, data);
  }
};

export const updateDocument = async (collection: string, id: string, data: any): Promise<any> => {
  if (activeProvider === 'firebase') {
    // For Firebase, we use Firestore's doc and updateDoc
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = firebase;
    const docRef = doc(db, collection, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
    return { id, ...data };
  } else {
    // For Supabase, we use the equivalent function
    return supabase.updateDocument(collection, id, data);
  }
};

export const deleteDocument = async (collection: string, id: string): Promise<boolean> => {
  if (activeProvider === 'firebase') {
    // For Firebase, we use Firestore's doc and deleteDoc
    const { doc, deleteDoc } = await import('firebase/firestore');
    const { db } = firebase;
    const docRef = doc(db, collection, id);
    await deleteDoc(docRef);
    return true;
  } else {
    // For Supabase, we use the equivalent function
    return supabase.deleteDocument(collection, id);
  }
};

export const queryDocuments = async (collection: string, conditions: Condition | Condition[] = []): Promise<any[]> => {
  try {
    if (activeProvider === 'firebase') {
      // Firebase query handling
      const { collection: firestoreCollection, query: firebaseQuery, where, getDocs } = await import('firebase/firestore');
      const db = firebase.db;
      
      // Start with a collection reference
      let q = firebaseQuery(firestoreCollection(db, collection));
      
      // Apply conditions
      if (Array.isArray(conditions)) {
        // Create an array of where clauses
        const whereClauses = conditions.map(condition => 
          where(condition.field, condition.operator as any, condition.value)
        );
        
        // Apply all where clauses to the query
        if (whereClauses.length > 0) {
          q = firebaseQuery(firestoreCollection(db, collection), ...whereClauses);
        }
      } else if (conditions && typeof conditions === 'object') {
        // Single condition object (field-value map)
        const whereClauses = Object.entries(conditions).map(([field, value]) => 
          where(field, "==", value)
        );
        
        // Apply all where clauses to the query
        if (whereClauses.length > 0) {
          q = firebaseQuery(firestoreCollection(db, collection), ...whereClauses);
        }
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));
    } else {
      // Supabase query handling
      let query = supabase.default.from(toSnakeCase(collection)).select('*');
      
      // Apply conditions
      if (Array.isArray(conditions)) {
        for (const condition of conditions) {
          const field = toSnakeCase(condition.field);
          
          switch (condition.operator) {
            case '==':
              query = query.eq(field, condition.value);
              break;
            case '!=':
              query = query.neq(field, condition.value);
              break;
            case '>':
              query = query.gt(field, condition.value);
              break;
            case '>=':
              query = query.gte(field, condition.value);
              break;
            case '<':
              query = query.lt(field, condition.value);
              break;
            case '<=':
              query = query.lte(field, condition.value);
              break;
            case 'array-contains':
              query = query.contains(field, [condition.value]);
              break;
            case 'in':
              query = query.in(field, condition.value);
              break;
            default:
              console.warn(`Unsupported operator: ${condition.operator}`);
              query = query.eq(field, condition.value);
          }
        }
      } else if (conditions) {
        // Single condition object (field-value map)
        Object.entries(conditions).forEach(([field, value]) => {
          query = query.eq(toSnakeCase(field), value);
        });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform snake_case keys to camelCase
      return data ? data.map(item => convertToCamelCase(item)) : [];
    }
  } catch (error) {
    console.error(`Error querying documents in ${collection}:`, error);
    throw error;
  }
};

// File Storage functions
export const uploadFile = async (bucket: string, path: string, file: File | string): Promise<{ path: string, url: string }> => {
  if (activeProvider === 'firebase') {
    // For Firebase Storage
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage();
    const storageRef = ref(storage, `${bucket}/${path}`);
    
    await uploadBytes(storageRef, file instanceof File ? file : new Blob([file]));
    const url = await getDownloadURL(storageRef);
    
    return { path, url };
  } else {
    // For Supabase Storage
    if (typeof file === 'string') {
      return supabase.uploadBase64File(bucket, path, file);
    } else {
      return supabase.uploadFile(bucket, path, file);
    }
  }
};

export const uploadBase64File = async (bucket: string, path: string, base64Data: string): Promise<{ path: string, url: string }> => {
  if (activeProvider === 'firebase') {
    // For Firebase Storage
    const { getStorage, ref, uploadString, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage();
    const storageRef = ref(storage, `${bucket}/${path}`);
    
    // Remove the base64 prefix if present
    const base64WithoutPrefix = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;
    
    await uploadString(storageRef, base64WithoutPrefix, 'base64');
    const url = await getDownloadURL(storageRef);
    
    return { path, url };
  } else {
    // For Supabase Storage
    return supabase.uploadBase64File(bucket, path, base64Data);
  }
};

export const getFileUrl = async (bucket: string, path: string): Promise<string> => {
  if (activeProvider === 'firebase') {
    // For Firebase, we would need to use getDownloadURL which is async
    const { getStorage, ref, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage();
    const storageRef = ref(storage, `${bucket}/${path}`);
    return getDownloadURL(storageRef);
  } else {
    // For Supabase, we can get the URL from the storage client
    return supabase.getFileUrl(bucket, path);
  }
};

export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  if (activeProvider === 'firebase') {
    // For Firebase Storage
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    const storage = getStorage();
    const storageRef = ref(storage, `${bucket}/${path}`);
    
    await deleteObject(storageRef);
    return true;
  } else {
    // For Supabase Storage
    return supabase.deleteFile(bucket, path);
  }
};

// Export the active provider and clients
export const getActiveProvider = (): DatabaseProvider => activeProvider;

export const getClient = () => {
  if (activeProvider === 'firebase') {
    return { db: firebase.db, auth: firebase.auth, app: firebase.default };
  } else {
    // For Supabase, return the supabase client directly
    return supabase.default;
  }
}; 