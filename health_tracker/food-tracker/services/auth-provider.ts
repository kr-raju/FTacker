/**
 * Auth Provider
 * 
 * This module provides a common interface for authentication functions
 * that can be implemented by different providers (Firebase, Supabase, etc.)
 */

// User model
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get the current authenticated user
export const getCurrentUser = async (): Promise<User | null> => {
  // Access the active auth implementation
  return window.__ACTIVE_AUTH_PROVIDER.getCurrentUser();
};

// Check if a user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  return !!(await getCurrentUser());
};

// Register a new user
export const registerUser = async (email: string, password: string): Promise<User> => {
  return window.__ACTIVE_AUTH_PROVIDER.registerUser(email, password);
};

// Login with email and password
export const loginUser = async (email: string, password: string): Promise<User> => {
  return window.__ACTIVE_AUTH_PROVIDER.loginUser(email, password);
};

// Logout the current user
export const logoutUser = async (): Promise<void> => {
  return window.__ACTIVE_AUTH_PROVIDER.logoutUser();
};

// Check if the auth state has changed
export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  return window.__ACTIVE_AUTH_PROVIDER.onAuthStateChanged(callback);
};

// Define the interface for the window global to access the active provider
declare global {
  interface Window {
    __ACTIVE_AUTH_PROVIDER: {
      getCurrentUser: () => Promise<User | null>;
      registerUser: (email: string, password: string) => Promise<User>;
      loginUser: (email: string, password: string) => Promise<User>;
      logoutUser: () => Promise<void>;
      onAuthStateChanged: (callback: (user: User | null) => void) => (() => void);
    };
  }
} 