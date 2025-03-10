import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  updateDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';

// User type
type User = {
  id: string;
  email: string;
  name?: string;
  [key: string]: any;
};

// Connection types
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type Connection = {
  id?: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  receiverId: string;
  receiverEmail: string;
  receiverName: string;
  status: ConnectionStatus;
  createdAt: any;
  updatedAt: any;
  lastMeal?: string;
  caloriesTracked?: number;
};

// Connection types with role
export type ConnectionWithRole = Connection & {
  role: 'sender' | 'receiver';
};

// Connection tracking data type
export type ConnectionTrackingData = {
  connection: Connection;
  user: {
    id: string;
    email: string;
    displayName?: string;
    userInfo?: {
      age: number;
      sex: string;
      weight: number;
      height: number;
    };
    waterIntake?: number;
  };
  entries: Array<{
    id: string;
    userId: string;
    date: any;
    name: string;
    time: string;
    calories: number;
    items: string[];
    completed: boolean;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  } | null;
};

/**
 * Finds a user by email using Firestore
 */
export const findUserByEmail = async (email: string): Promise<User> => {
  try {
    console.log('=== Starting user lookup process ===');
    console.log('Looking up user with email:', email);
    
    // Step 1: Check Firestore Database first
    console.log('Checking Firestore Database...');
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      
      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        console.log('❌ User not found in Firestore');
        throw new Error('User not found');
      }
      
      const userDoc = snapshot.docs[0];
      console.log('✅ Found user document in Firestore:', userDoc.id);
      
      // Step 2: Verify user exists in Authentication (optional check)
      try {
        const auth = getAuth();
        await fetchSignInMethodsForEmail(auth, email);
      } catch (authError) {
        console.warn('⚠️ Warning: Could not verify user in Authentication, but proceeding as user exists in Firestore');
      }
      
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
      
    } catch (firestoreError: any) {
      console.error('❌ Firestore Database Error:', firestoreError);
      if (firestoreError?.code === 'unavailable') {
        throw new Error('Firestore Database is not initialized. Please create a database in Firebase Console.');
      }
      if (firestoreError?.code === 'permission-denied') {
        throw new Error('Permission denied accessing Firestore. Please check your security rules.');
      }
      if (firestoreError?.code === 'failed-precondition') {
        throw new Error('This query requires an index. Please create the necessary index in Firebase Console.');
      }
      throw firestoreError;
    }
  } catch (error) {
    console.error('❌ Error in findUserByEmail:', error);
    throw error;
  }
};

/**
 * Creates a new connection request between users
 */
export const createConnectionRequest = async (
  senderId: string,
  senderEmail: string,
  senderName: string,
  receiverEmail: string
) => {
  try {
    // Find the receiver by email
    const receiver = await findUserByEmail(receiverEmail);
    
    // Check if connection already exists
    const existingConnectionQuery = query(
      collection(db, 'connections'),
      where('senderId', '==', senderId),
      where('receiverId', '==', receiver.id)
    );
    
    const existingSnapshot = await getDocs(existingConnectionQuery);
    if (!existingSnapshot.empty) {
      throw new Error('Connection request already exists');
    }
    
    // Create a new document in the connections collection
    const connectionRef = doc(collection(db, 'connections'));
    
    const connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'> = {
      senderId,
      senderEmail,
      senderName,
      receiverId: receiver.id,
      receiverEmail: receiver.email,
      receiverName: receiver.name || receiverEmail.split('@')[0],
      status: 'pending'
    };
    
    await setDoc(connectionRef, {
      ...connection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Create a notification for the receiver
    await createConnectionNotification(
      receiver.id,
      senderId,
      senderName,
      'connection_request'
    );
    
    return { id: connectionRef.id, ...connection };
  } catch (error) {
    console.error('Error creating connection request:', error);
    throw error;
  }
};

/**
 * Gets all connections for a user (both sent and received)
 */
export const getUserConnections = async (userId: string): Promise<ConnectionWithRole[]> => {
  try {
    console.log('=== Getting user connections ===');
    console.log('User ID:', userId);
    
    // Query for connections where user is sender
    const sentQuery = query(
      collection(db, 'connections'),
      where('senderId', '==', userId)
    );
    
    // Query for connections where user is receiver
    const receivedQuery = query(
      collection(db, 'connections'),
      where('receiverId', '==', userId)
    );
    
    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(sentQuery),
      getDocs(receivedQuery)
    ]);
    
    const sent = sentSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      role: 'sender'
    } as ConnectionWithRole));
    
    const received = receivedSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      role: 'receiver'
    } as ConnectionWithRole));
    
    console.log('Found connections:', {
      sent: sent.length,
      received: received.length
    });
    
    return [...sent, ...received];
  } catch (error) {
    console.error('Error getting user connections:', error);
    throw error;
  }
};

/**
 * Listens for changes to a user's connections in real-time
 */
export const onConnectionsChanged = (userId: string, callback: (connections: Connection[]) => void) => {
  // Query for connections where user is sender
  const sentQuery = query(
    collection(db, 'connections'),
    where('senderId', '==', userId)
  );
  
  // Query for connections where user is receiver
  const receivedQuery = query(
    collection(db, 'connections'),
    where('receiverId', '==', userId)
  );
  
  // Set up listeners
  const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
    const sentConnections = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Connection[];
    
    // Get received connections from other listener
    callback(sentConnections);
  });
  
  const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
    const receivedConnections = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Connection[];
    
    // Get sent connections from other listener
    callback(receivedConnections);
  });
  
  // Return a function to unsubscribe from both listeners
  return () => {
    unsubscribeSent();
    unsubscribeReceived();
  };
};

/**
 * Updates a connection's status (accept/reject/cancel)
 */
export const updateConnectionStatus = async (connectionId: string, status: ConnectionStatus, userId: string) => {
  try {
    console.log('=== Starting connection status update ===');
    console.log('Connection ID:', connectionId);
    console.log('New Status:', status);
    console.log('User ID:', userId);
    
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      console.error('❌ Connection not found');
      throw new Error('Connection not found');
    }
    
    const connectionData = connectionDoc.data() as Connection;
    console.log('Connection data:', connectionData);
    
    // Determine user's role in the connection
    const userRole = connectionData.senderId === userId ? 'sender' : 
                    connectionData.receiverId === userId ? 'receiver' : null;
    
    if (!userRole) {
      console.error('❌ User is not part of this connection');
      throw new Error('Unauthorized to update this connection');
    }
    
    console.log('User role:', userRole);
    
    // Validate the action based on user's role
    if (userRole === 'sender' && status !== 'cancelled') {
      console.error('❌ Sender can only cancel connections');
      throw new Error('Sender can only cancel connection requests');
    }
    
    if (userRole === 'receiver' && !['accepted', 'rejected'].includes(status)) {
      console.error('❌ Receiver can only accept or reject connections');
      throw new Error('Receiver can only accept or reject connection requests');
    }
    
    if (connectionData.status !== 'pending' && status !== 'cancelled') {
      console.error('❌ Can only update pending connections');
      throw new Error('Can only update pending connections');
    }
    
    console.log('✅ Authorization check passed');
    
    // Update the connection
    await updateDoc(connectionRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Connection status updated to:', status);
    
    // Create a notification for the other user
    if (status !== 'cancelled') {
      const notificationType = status === 'accepted' 
        ? 'connection_accepted' 
        : 'connection_rejected';
      
      await createConnectionNotification(
        connectionData.senderId,  // Send to the sender
        userId,                   // From the receiver who acted
        connectionData.receiverName,
        notificationType
      );
      
      console.log('✅ Notification sent');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating connection status:', error);
    throw error;
  }
};

/**
 * Removes a connection between users
 */
export const removeConnection = async (connectionId: string, userId: string) => {
  try {
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      throw new Error('Connection not found');
    }
    
    const connectionData = connectionDoc.data() as Connection;
    
    // Check if user is part of this connection
    if (connectionData.senderId !== userId && connectionData.receiverId !== userId) {
      throw new Error('Unauthorized to remove this connection');
    }
    
    // Delete the connection
    await deleteDoc(connectionRef);
    
    return true;
  } catch (error) {
    console.error('Error removing connection:', error);
    throw error;
  }
};

/**
 * Helper function to create a notification for a connection action
 */
const createConnectionNotification = async (
  userId: string,             // User receiving the notification
  fromUserId: string,         // User who performed the action
  fromUserName: string,
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected'
) => {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    
    // Create message based on notification type
    let message = '';
    switch (type) {
      case 'connection_request':
        message = `${fromUserName} sent you a connection request`;
        break;
      case 'connection_accepted':
        message = `${fromUserName} accepted your connection request`;
        break;
      case 'connection_rejected':
        message = `${fromUserName} rejected your connection request`;
        break;
    }
    
    // Create the notification
    await setDoc(notificationRef, {
      userId,
      fromUserId,
      fromUserName,
      type,
      message,
      read: false,
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Accepts a connection request
 */
export const acceptConnection = async (connectionId: string, userId: string) => {
  try {
    console.log('=== Starting connection acceptance process ===');
    console.log('Connection ID:', connectionId);
    console.log('User ID:', userId);
    
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      console.error('❌ Connection not found');
      throw new Error('Connection not found');
    }
    
    const connection = connectionDoc.data() as Connection;
    console.log('Connection data:', connection);
    
    // Verify that the user accepting is the receiver
    if (connection.receiverId !== userId) {
      console.error('❌ Unauthorized: User is not the receiver of this connection');
      console.error('Expected receiver:', connection.receiverId);
      console.error('Actual user:', userId);
      throw new Error('Unauthorized to accept this connection');
    }
    
    console.log('✅ Authorization check passed');
    
    // Update connection status
    await updateDoc(connectionRef, {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Connection status updated to accepted');
    
    // Create notification for the sender
    await createConnectionNotification(
      connection.senderId,
      userId,
      connection.receiverName,
      'connection_accepted'
    );
    
    console.log('✅ Notification sent to sender');
    return true;
  } catch (error) {
    console.error('❌ Error accepting connection:', error);
    throw error;
  }
};

/**
 * Rejects a connection request
 */
export const rejectConnection = async (connectionId: string) => {
  try {
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      throw new Error('Connection not found');
    }
    
    const connection = connectionDoc.data() as Connection;
    
    // Update connection status
    await updateDoc(connectionRef, {
      status: 'rejected',
      updatedAt: serverTimestamp()
    });
    
    // Create notification for the sender
    await createConnectionNotification(
      connection.senderId,
      connection.receiverId,
      connection.receiverName,
      'connection_rejected'
    );
    
    return true;
  } catch (error) {
    console.error('Error rejecting connection:', error);
    throw error;
  }
};

/**
 * Get tracking data for a connection
 */
export const getConnectionTracking = async (connectionId: string, userId: string): Promise<ConnectionTrackingData> => {
  try {
    console.log('=== Getting connection tracking data ===');
    console.log('Connection ID:', connectionId);
    console.log('User ID:', userId);
    
    // Get the connection document
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      console.error('❌ Connection not found');
      throw new Error('Connection not found');
    }
    
    const connection = connectionDoc.data() as Connection;
    console.log('Connection data:', connection);
    
    // Verify the user is part of this connection
    if (connection.senderId !== userId && connection.receiverId !== userId) {
      console.error('❌ User is not part of this connection');
      throw new Error('Unauthorized to view this connection');
    }
    
    // Get the target user's ID (the one whose data we want to view)
    const targetUserId = connection.senderId === userId ? connection.receiverId : connection.senderId;
    console.log('Target user ID:', targetUserId);
    
    // Get user profile data
    const userRef = doc(db, 'users', targetUserId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('❌ Target user not found');
      throw new Error('Target user not found');
    }
    
    const userData = userDoc.data();
    console.log('Target user data:', userData);
    
    // Get today's food entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const entriesQuery = query(
      collection(db, 'food_entries'),
      where('userId', '==', targetUserId),
      where('date', '>=', today),
      where('date', '<', tomorrow),
      orderBy('date', 'asc')
    );
    
    const entriesSnapshot = await getDocs(entriesQuery);
    const entries = entriesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        date: data.date,
        name: data.name || 'Unnamed Meal',
        time: data.time || 'No time specified',
        calories: data.calories || 0,
        items: data.items || [], // Ensure items is always an array
        completed: data.completed || false,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0
      };
    });
    
    console.log('Food entries:', entries);
    
    // Get user's daily goals
    const goalsRef = doc(db, 'daily_goals', targetUserId);
    const goalsDoc = await getDoc(goalsRef);
    const goalsData = goalsDoc.exists() ? goalsDoc.data() : null;
    
    // Validate goals data
    const goals = goalsData ? {
      calories: goalsData.calories || 2000,
      protein: goalsData.protein || 50,
      carbs: goalsData.carbs || 250,
      fat: goalsData.fat || 70,
      water: goalsData.water || 2000
    } : null;
    
    console.log('Daily goals:', goals);
    
    return {
      connection,
      user: {
        id: targetUserId,
        email: userData.email,
        displayName: userData.displayName,
        userInfo: userData.userInfo || {
          age: 0,
          sex: 'Not specified',
          weight: 0,
          height: 0
        },
        waterIntake: userData.waterIntake || 0
      },
      entries,
      goals
    };
  } catch (error) {
    console.error('❌ Error getting connection tracking:', error);
    throw error;
  }
}; 