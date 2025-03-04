/**
 * Mock Firebase implementation for development
 * This file provides mock implementations of Firebase services
 * to allow development without connecting to a real Firebase instance
 */

// Mock app for firebase
const app = {
  name: 'mock-firebase-app'
};

// Mock user for authentication
const mockUser = {
  uid: 'mock-user-id',
  email: 'mock@example.com',
  displayName: 'Mock User',
  emailVerified: true,
};

// Mock auth service
const auth = {
  currentUser: mockUser,
  onAuthStateChanged: (callback: (user: any) => void) => {
    // Immediately call with mock user
    callback(mockUser);
    // Return unsubscribe function
    return () => {};
  }
};

// Mock firestore database
const db = {
  collection: (collectionName: string) => ({
    doc: (docId: string) => ({
      get: async () => ({
        exists: true,
        data: () => {
          // Return different mock data based on collection and doc
          if (collectionName === 'users' && docId === mockUser.uid) {
            return {
              name: 'Mock User',
              email: 'mock@example.com',
              profile: {
                age: 30,
                weight: 70,
                height: 175,
                sex: 'male'
              }
            };
          }
          if (collectionName === 'food_entries') {
            return {
              items: [
                { name: 'Apple', calories: 95, date: new Date().toISOString() },
                { name: 'Chicken Salad', calories: 350, date: new Date().toISOString() }
              ]
            };
          }
          // Default empty object
          return {};
        },
      }),
      set: async (data: any) => {
        console.log(`Mock set data in ${collectionName}/${docId}:`, data);
        return {};
      },
      update: async (data: any) => {
        console.log(`Mock update data in ${collectionName}/${docId}:`, data);
        return {};
      },
      delete: async () => {
        console.log(`Mock delete document ${collectionName}/${docId}`);
        return {};
      }
    }),
    add: async (data: any) => {
      const mockId = 'mock-doc-' + Math.random().toString(36).substring(2, 9);
      console.log(`Mock add data to ${collectionName} with ID ${mockId}:`, data);
      return { id: mockId };
    },
    where: () => ({
      get: async () => ({
        docs: [
          {
            id: 'mock-doc-1',
            data: () => ({ name: 'Mock Document 1' }),
          },
          {
            id: 'mock-doc-2',
            data: () => ({ name: 'Mock Document 2' }),
          }
        ]
      })
    })
  })
};

// Authentication functions
const registerUser = async (email: string, password: string) => {
  console.log('Mock registration:', email);
  return mockUser;
};

const loginUser = async (email: string, password: string) => {
  console.log('Mock login:', email);
  return mockUser;
};

const signOut = async () => {
  console.log('Mock sign out');
  return;
};

const getCurrentUser = () => {
  return mockUser;
};

const onUserStateChanged = (callback: (user: any) => void) => {
  return auth.onAuthStateChanged(callback);
};

// Export all mock implementations
export { 
  app,
  auth, 
  db, 
  registerUser, 
  loginUser, 
  signOut, 
  getCurrentUser, 
  onUserStateChanged 
}; 