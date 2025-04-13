/**
 * ConnectionService
 * This service handles all connection-related operations between users
 */

import { format } from 'date-fns';
import { FoodEntry } from '../types/food';
import { 
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  getCurrentUser,
  generateId,
  Condition
} from './db-provider';

export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export enum NotificationType {
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  MEAL_REMINDER = 'meal_reminder'
}

export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionWithRole extends Connection {
  role: 'requester' | 'receiver';
  user?: User;
}

export interface ConnectionTrackingData {
  userId: string;
  connectedUserId: string;
  startDate: Date;
  endDate: Date;
  foodEntries: FoodEntry[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
}

/**
 * Find a user by email
 * @param email The email to search for
 * @returns The user if found, otherwise null
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const conditions: Condition[] = [
      { field: 'email', operator: '==', value: email }
    ];
    
    const users = await queryDocuments('users', conditions) as User[];
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Create a connection request
 * @param userId The user ID of the requester
 * @param connectedUserEmail The email of the user to connect with
 * @returns The created connection if successful, otherwise null
 */
export const createConnectionRequest = async (
  userId: string,
  connectedUserEmail: string
): Promise<Connection | null> => {
  try {
    const connectedUser = await findUserByEmail(connectedUserEmail);
    
    if (!connectedUser) {
      throw new Error('User not found');
    }
    
    // Check if connection already exists
    const existingConnectionConditions: Condition[] = [
      { field: 'userId', operator: '==', value: userId },
      { field: 'connectedUserId', operator: '==', value: connectedUser.id },
    ];
    
    const existingConnections = await queryDocuments('connections', existingConnectionConditions) as Connection[];
    
    if (existingConnections.length > 0) {
      throw new Error('Connection already exists');
    }
    
    // Check if reverse connection exists
    const reverseConnectionConditions: Condition[] = [
      { field: 'userId', operator: '==', value: connectedUser.id },
      { field: 'connectedUserId', operator: '==', value: userId },
    ];
    
    const reverseConnections = await queryDocuments('connections', reverseConnectionConditions) as Connection[];
    
    if (reverseConnections.length > 0) {
      throw new Error('Reverse connection already exists');
    }
    
    // Create connection
    const now = new Date();
    const connectionId = generateId();
    
    const connection: Connection = {
      id: connectionId,
      userId: userId,
      connectedUserId: connectedUser.id,
      status: ConnectionStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };
    
    await createDocument('connections', connectionId, connection);
    
    // Create notification for the connected user
    const currentUser = await getDocument('users', userId) as User;
    
    if (currentUser) {
      await createNotification({
        userId: connectedUser.id,
        type: NotificationType.CONNECTION_REQUEST,
        message: `${currentUser.name} sent you a connection request`,
        data: {
          connectionId: connectionId,
          userId: userId
        }
      });
    }
    
    return connection;
  } catch (error) {
    console.error('Error creating connection request:', error);
    return null;
  }
};

/**
 * Get user connections
 * @param userId The user ID
 * @returns An array of connections with user data
 */
export const getUserConnections = async (userId: string): Promise<ConnectionWithRole[]> => {
  try {
    // Get sent connections
    const sentConnectionsConditions: Condition[] = [
      { field: 'userId', operator: '==', value: userId }
    ];
    
    const sentConnections = await queryDocuments('connections', sentConnectionsConditions) as Connection[];
    
    // Get received connections
    const receivedConnectionsConditions: Condition[] = [
      { field: 'connectedUserId', operator: '==', value: userId }
    ];
    
    const receivedConnections = await queryDocuments('connections', receivedConnectionsConditions) as Connection[];
    
    // Process sent connections
    const sentConnectionsWithRole: ConnectionWithRole[] = await Promise.all(
      sentConnections.map(async (connection) => {
        const connectedUser = await getDocument('users', connection.connectedUserId) as User;
        
        return {
          ...connection,
          role: 'requester',
          user: connectedUser || undefined
        };
      })
    );
    
    // Process received connections
    const receivedConnectionsWithRole: ConnectionWithRole[] = await Promise.all(
      receivedConnections.map(async (connection) => {
        const connectedUser = await getDocument('users', connection.userId) as User;
        
        return {
          ...connection,
          role: 'receiver',
          user: connectedUser || undefined
        };
      })
    );
    
    // Combine and sort by creation date (newest first)
    return [...sentConnectionsWithRole, ...receivedConnectionsWithRole]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error getting user connections:', error);
    return [];
  }
};

/**
 * Accept a connection request
 * @param connectionId The connection ID to accept
 * @returns True if successful, otherwise false
 */
export const acceptConnection = async (connectionId: string): Promise<boolean> => {
  try {
    const connection = await getDocument('connections', connectionId) as Connection;
    
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new Error('Connection is not pending');
    }
    
    // Update connection
    const updatedConnection: Partial<Connection> = {
      status: ConnectionStatus.ACCEPTED,
      updatedAt: new Date()
    };
    
    await updateDocument('connections', connectionId, updatedConnection);
    
    // Create notification for the connected user
    const currentUser = await getDocument('users', connection.connectedUserId) as User;
    
    if (currentUser) {
      await createNotification({
        userId: connection.userId,
        type: NotificationType.CONNECTION_ACCEPTED,
        message: `${currentUser.name} accepted your connection request`,
        data: {
          connectionId: connectionId,
          userId: connection.connectedUserId
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error accepting connection:', error);
    return false;
  }
};

/**
 * Reject a connection request
 * @param connectionId The connection ID to reject
 * @returns True if successful, otherwise false
 */
export const rejectConnection = async (connectionId: string): Promise<boolean> => {
  try {
    const connection = await getDocument('connections', connectionId) as Connection;
    
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new Error('Connection is not pending');
    }
    
    // Update connection
    const updatedConnection: Partial<Connection> = {
      status: ConnectionStatus.REJECTED,
      updatedAt: new Date()
    };
    
    await updateDocument('connections', connectionId, updatedConnection);
    
    return true;
  } catch (error) {
    console.error('Error rejecting connection:', error);
    return false;
  }
};

/**
 * Delete a connection
 * @param connectionId The connection ID to delete
 * @returns True if successful, otherwise false
 */
export const deleteConnection = async (connectionId: string): Promise<boolean> => {
  try {
    await deleteDocument('connections', connectionId);
    return true;
  } catch (error) {
    console.error('Error deleting connection:', error);
    return false;
  }
};

/**
 * Get connection tracking data
 * @param userId The user ID
 * @param connectedUserId The connected user ID
 * @param startDate The start date
 * @param endDate The end date
 * @returns The connection tracking data
 */
export const getConnectionTrackingData = async (
  userId: string,
  connectedUserId: string,
  startDate: Date,
  endDate: Date
): Promise<ConnectionTrackingData | null> => {
  try {
    // Check if connection exists and is accepted
    const connectionConditions: Condition[] = [
      { 
        field: 'userId', 
        operator: '==', 
        value: userId 
      },
      { 
        field: 'connectedUserId', 
        operator: '==', 
        value: connectedUserId 
      },
      { 
        field: 'status', 
        operator: '==', 
        value: ConnectionStatus.ACCEPTED 
      }
    ];
    
    const connections = await queryDocuments('connections', connectionConditions) as Connection[];
    
    if (connections.length === 0) {
      // Check reverse connection
      const reverseConnectionConditions: Condition[] = [
        { 
          field: 'userId', 
          operator: '==', 
          value: connectedUserId 
        },
        { 
          field: 'connectedUserId', 
          operator: '==', 
          value: userId 
        },
        { 
          field: 'status', 
          operator: '==', 
          value: ConnectionStatus.ACCEPTED 
        }
      ];
      
      const reverseConnections = await queryDocuments('connections', reverseConnectionConditions) as Connection[];
      
      if (reverseConnections.length === 0) {
        throw new Error('Connection not found or not accepted');
      }
    }
    
    // Get food entries for connected user within date range
    const foodEntryConditions: Condition[] = [
      { field: 'userId', operator: '==', value: connectedUserId },
      { field: 'date', operator: '>=', value: startDate },
      { field: 'date', operator: '<=', value: endDate }
    ];
    
    const foodEntries = await queryDocuments('foodEntries', foodEntryConditions) as FoodEntry[];
    
    return {
      userId,
      connectedUserId,
      startDate,
      endDate,
      foodEntries
    };
  } catch (error) {
    console.error('Error getting connection tracking data:', error);
    return null;
  }
};

/**
 * Create a notification
 * @param notification The notification to create
 * @returns The created notification if successful, otherwise null
 */
export const createNotification = async (
  notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Promise<Notification | null> => {
  try {
    const now = new Date();
    const notificationId = generateId();
    
    const newNotification: Notification = {
      id: notificationId,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      read: false,
      data: notification.data,
      createdAt: now
    };
    
    await createDocument('notifications', notificationId, newNotification);
    
    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Get user notifications
 * @param userId The user ID
 * @returns An array of notifications
 */
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const conditions: Condition[] = [
      { field: 'userId', operator: '==', value: userId }
    ];
    
    const notifications = await queryDocuments('notifications', conditions) as Notification[];
    
    // Sort by creation date (newest first)
    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param notificationId The notification ID to mark as read
 * @returns True if successful, otherwise false
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    await updateDocument('notifications', notificationId, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 * @param userId The user ID
 * @returns True if successful, otherwise false
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const conditions: Condition[] = [
      { field: 'userId', operator: '==', value: userId },
      { field: 'read', operator: '==', value: false }
    ];
    
    const unreadNotifications = await queryDocuments('notifications', conditions) as Notification[];
    
    await Promise.all(
      unreadNotifications.map(notification => 
        updateDocument('notifications', notification.id, { read: true })
      )
    );
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};