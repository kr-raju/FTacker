/**
 * Firebase service
 * This file provides Firebase services for authentication and database access
 */

// Import Firebase modules
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  Firestore
} from 'firebase/firestore';

// Import mock implementations
import * as mockFirebase from './firebase-mock';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Check if we should use mock implementation
const useMockFirebase = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_FIREBASE === 'true';

// Set up auth and db
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (!useMockFirebase) {
    // Initialize Firebase with real configuration
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Using real Firebase services");
  } else {
    // Use mock implementations
    app = mockFirebase.app as FirebaseApp;
    auth = mockFirebase.auth as Auth;
    db = mockFirebase.db as Firestore;
    console.log("Using mock Firebase services");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw error;
}

// Authentication functions
export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create a user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: userCredential.user.email,
      displayName: email.split('@')[0], // Default display name
      createdAt: serverTimestamp(),
      settings: {
        measurementUnit: 'metric',
        calorieGoal: 2000,
        waterGoal: 2000 // ml
      }
    });
    
    return userCredential.user;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onUserStateChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get user profile data
export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Export auth and db
export { auth, db };
export default app; 