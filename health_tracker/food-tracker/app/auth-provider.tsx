'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as dbProvider from '../services/db-provider';
import { getClient } from '../services/supabase';

// Define AuthContext
type AuthContextType = {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper function to refresh Supabase session
  const refreshSupabaseSession = async () => {
    try {
      const activeProvider = dbProvider.getActiveProvider();
      if (activeProvider === 'supabase') {
        // Check if there's an active session
        const supabaseClient = getClient() as any;
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
          // Set up auth state change listener
          const { data: authListener } = supabaseClient.auth.onAuthStateChange(
            async (event: string, session: any) => {
              const currentUser = session?.user || null;
              setUser(currentUser);
              setLoading(false);
            }
          );
          return authListener;
        }
      }
    } catch (error) {
      console.error('Error refreshing Supabase session:', error);
    }
    return null;
  };

  // Check auth state on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Get the current user from the provider
        const currentUser = await dbProvider.getCurrentUser();
        setUser(currentUser);
        
        // If we're using Supabase, set up auth state change listener
        const unsubscribe = await refreshSupabaseSession();
        
        setLoading(false);
        
        // Clean up function
        return () => {
          if (unsubscribe) {
            unsubscribe.subscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Auth provider error:', error);
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await dbProvider.loginUser(email, password);
      setUser(userData.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await dbProvider.registerUser(email, password);
      setUser(userData.user);
      router.push('/profile/setup');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await dbProvider.signOut();
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Provide the auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 