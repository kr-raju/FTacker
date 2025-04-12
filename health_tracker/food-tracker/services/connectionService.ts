/**
 * ConnectionService
 * This service handles all connection-related operations between users
 */

import { format } from 'date-fns';
import * as dbProvider from './db-provider';

// Define allowed connection statuses
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

// Define notification types
export type NotificationType = 'connection_request' | 'connection_accepted' | 'meal_reminder';

// Interface for User objects
export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

// Interface for Connection objects
export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: ConnectionStatus;
  createdAt: string;
}

// Connection with additional role information
export interface ConnectionWithRole extends Connection {
  user: User;
  role: 'sender' | 'receiver';
}

// Data structure for tracking connections
export interface ConnectionTrackingData {
  days: number;
  totalEntries: number;
  averageCalories: number;
  streakDays: number;
}

// Notification object structure
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

/**
 * Finds a user by email
 * @param email Email to search for
 * @returns User object if found, null if not found
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const users = await dbProvider.queryDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);
    
    return users.length > 0 ? users[0] as User : null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Creates a connection request between users
 * @param currentUserId ID of the user making the request
 * @param userToConnectId ID of the user to connect with
 * @returns ID of the created connection or null if failed
 */
export const createConnectionRequest = async (
  currentUserId: string,
  userToConnectId: string
): Promise<string | null> => {
  try {
    // Check if connection already exists
    const existingConnections = await dbProvider.queryDocuments('connections', [
      { field: 'userId', operator: '==', value: currentUserId },
      { field: 'connectedUserId', operator: '==', value: userToConnectId }
    ]);

    if (existingConnections.length > 0) {
      console.log('Connection already exists');
      return null;
    }

    // Create connection
    const connectionData = {
      userId: currentUserId,
      connectedUserId: userToConnectId,
      status: 'pending' as ConnectionStatus,
      createdAt: new Date().toISOString()
    };

    const connectionId = await dbProvider.createDocument('connections', connectionData);

    // Create notification for the user being connected to
    const currentUser = await dbProvider.getDocument('users', currentUserId);
    if (currentUser) {
      await createNotification(
        userToConnectId,
        'connection_request',
        `${currentUser.name} sent you a connection request`,
        { connectionId, userId: currentUserId }
      );
    }

    return connectionId;
  } catch (error) {
    console.error('Error creating connection request:', error);
    return null;
  }
};

/**
 * Gets all connections for a user
 * @param userId ID of the user to get connections for
 * @returns Array of connections with user details
 */
export const getUserConnections = async (userId: string): Promise<ConnectionWithRole[]> => {
  try {
    // Get connections where user is the requester
    const requestedConnections = await dbProvider.queryDocuments('connections', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    // Get connections where user is the receiver
    const receivedConnections = await dbProvider.queryDocuments('connections', [
      { field: 'connectedUserId', operator: '==', value: userId }
    ]);

    // Process and combine the connections
    const processRequested = await Promise.all(
      requestedConnections.map(async connection => {
        const connectedUser = await dbProvider.getDocument('users', connection.connectedUserId);
        return {
          ...connection,
          user: connectedUser,
          role: 'sender' as const
        };
      })
    );

    const processReceived = await Promise.all(
      receivedConnections.map(async connection => {
        const connectedUser = await dbProvider.getDocument('users', connection.userId);
        return {
          ...connection,
          user: connectedUser,
          role: 'receiver' as const
        };
      })
    );

    return [...processRequested, ...processReceived];
  } catch (error) {
    console.error('Error getting user connections:', error);
    return [];
  }
};

/**
 * Accepts a connection request
 * @param connectionId ID of the connection to accept
 * @returns True if successful, false otherwise
 */
export const acceptConnection = async (connectionId: string): Promise<boolean> => {
  try {
    const connection = await dbProvider.getDocument('connections', connectionId);
    if (!connection) return false;

    await dbProvider.updateDocument('connections', connectionId, { status: 'accepted' });

    // Create notification for the requester
    const user = await dbProvider.getDocument('users', connection.connectedUserId);
    if (user) {
      await createNotification(
        connection.userId,
        'connection_accepted',
        `${user.name} accepted your connection request`,
        { connectionId }
      );
    }

    return true;
  } catch (error) {
    console.error('Error accepting connection:', error);
    return false;
  }
};

/**
 * Rejects a connection request
 * @param connectionId ID of the connection to reject
 * @returns True if successful, false otherwise
 */
export const rejectConnection = async (connectionId: string): Promise<boolean> => {
  try {
    await dbProvider.updateDocument('connections', connectionId, { status: 'rejected' });
    return true;
  } catch (error) {
    console.error('Error rejecting connection:', error);
    return false;
  }
};

/**
 * Deletes a connection
 * @param connectionId ID of the connection to delete
 * @returns True if successful, false otherwise
 */
export const deleteConnection = async (connectionId: string): Promise<boolean> => {
  try {
    await dbProvider.deleteDocument('connections', connectionId);
    return true;
  } catch (error) {
    console.error('Error deleting connection:', error);
    return false;
  }
};

/**
 * Gets tracking data for a user's connections
 * @param userId ID of the user to get tracking data for
 * @returns Connection tracking data object
 */
export const getConnectionTrackingData = async (userId: string): Promise<ConnectionTrackingData> => {
  try {
    // Calculate the date for 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Get accepted connections
    const connections = await dbProvider.queryDocuments('connections', [
      { field: 'userId', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'accepted' }
    ]);

    // Add connections where user is the receiver
    const receiverConnections = await dbProvider.queryDocuments('connections', [
      { field: 'connectedUserId', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'accepted' }
    ]);

    const allConnections = [...connections, ...receiverConnections];

    // Default return if no connections
    if (allConnections.length === 0) {
      return {
        days: 0,
        totalEntries: 0,
        averageCalories: 0,
        streakDays: 0
      };
    }

    // For simplicity, just return mock data for now
    // In a real implementation, you'd query food entries for all connections
    return {
      days: 30,
      totalEntries: 45,
      averageCalories: 1850,
      streakDays: 7
    };
  } catch (error) {
    console.error('Error getting connection tracking data:', error);
    return {
      days: 0,
      totalEntries: 0,
      averageCalories: 0,
      streakDays: 0
    };
  }
};

/**
 * Creates a notification for a user
 * @param userId ID of the user to create notification for
 * @param type Type of notification
 * @param message Notification message
 * @param data Optional additional data
 * @returns ID of created notification or null if failed
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
  data?: any
): Promise<string | null> => {
  try {
    const notification = {
      userId,
      type,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      data
    };

    return await dbProvider.createDocument('notifications', notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Gets all notifications for a user
 * @param userId ID of the user to get notifications for
 * @returns Array of notifications
 */
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    // Get notifications
    const notifications = await dbProvider.queryDocuments(
      'notifications', 
      [{ field: 'userId', operator: '==', value: userId }]
    );
    
    // Sort by createdAt in descending order (newest first)
    return (notifications as Notification[]).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Marks a notification as read
 * @param notificationId ID of the notification to mark as read
 * @returns True if successful, false otherwise
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    await dbProvider.updateDocument('notifications', notificationId, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Marks all notifications for a user as read
 * @param userId ID of the user to mark notifications as read for
 * @returns True if successful, false otherwise
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const notifications = await getUserNotifications(userId);
    
    // Update each notification
    await Promise.all(
      notifications
        .filter(notification => !notification.read)
        .map(notification => {
          if (notification.id) {
            return dbProvider.updateDocument('notifications', notification.id, { read: true });
          }
          return Promise.resolve();
        })
    );
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};