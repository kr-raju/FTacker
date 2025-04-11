/**
 * Database configuration module
 * This module contains the configuration for the database providers
 */

// Define the supported database providers
export type DbProvider = 'firebase' | 'supabase';

// Active database provider (read from environment variable if available)
export const DB_PROVIDER: DbProvider = 
  (typeof process !== 'undefined' && 
   process.env.NEXT_PUBLIC_DEFAULT_DB_PROVIDER === 'supabase') 
    ? 'supabase' 
    : 'firebase';

// Collection/table names
export const DB_TABLES = {
  USERS: 'users',
  FOOD_ENTRIES: 'food_entries',
  FOOD_IMAGES: 'food_images',
  FOOD_DATABASE: 'food_database',
  SETTINGS: 'settings'
};

// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id"
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://molnaeajazgwowvzenlb.supabase.co',
  apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbG5hZWFqYXpnd293dnplbmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMzM5OTcsImV4cCI6MjA1ODgwOTk5N30.16G-FSJt-hVbDJVD02fSwHMAtHSWvIKxmjPHPh5JPmI',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbG5hZWFqYXpnd293dnplbmxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzIzMzk5NywiZXhwIjoyMDU4ODA5OTk3fQ.16G-FSJt-hVbDJVD02fSwHMAtHSWvIKxmjPHPh5JPmI',
  bucket: 'food-images'
};

/**
 * Get the active database provider
 * @returns The active database provider
 */
export const getActiveProvider = (): DbProvider => DB_PROVIDER;

// Enable development console logs to see which provider is actually being used
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log(`Database Provider: ${DB_PROVIDER}`);
  console.log(`Using Supabase: ${DB_PROVIDER === 'supabase'}`);
  console.log(`NEXT_PUBLIC_DEFAULT_DB_PROVIDER: ${process.env.NEXT_PUBLIC_DEFAULT_DB_PROVIDER}`);
}

// Feature flags
export const FEATURES = {
  MOCK_DB: process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true',
  AI_ENABLED: true // Set to false to disable AI features
}; 