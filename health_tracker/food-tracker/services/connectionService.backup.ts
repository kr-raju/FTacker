/**
 * Connection Service
 * Handles connection and notification-related operations
 */

import { format } from 'date-fns';
import { 
  createDocument, 
  getDocument, 
  updateDocument, 
  deleteDocument, 
  queryDocuments,
  generateId
} from './db-provider';

import {
  Connection,
  ConnectionStatus,
  ConnectionTrackingData,
  ConnectionWithRole,
  Notification,
  NotificationType,
  User
} from '../types/connection';

// Redefining ConnectionStatus here since we're not importing it anymore
export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

/**
 * User type definition
 */
export type User = {
  id?: string;
  userId?: string;
  email: string;
  name: string;
  profileComplete?: boolean;
  trackingPreferences?: {
    shareWithConnections: boolean;
    shareFoodEntries: boolean;
    shareCalorieGoals: boolean;
  };
  createdAt: Date;
};

/**
 * Connection type definition
 */
export type Connection = {
  id?: string;
  userId: string;
  connectedUserId: string;
  connectedUserEmail?: string; // Make this optional to maintain compatibility
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt?: Date;
};

/**
 * Connection with role (requester or receiver)
 */
export type ConnectionWithRole = Connection & {
  role: 'requester' | 'receiver';
  user?: User;
};

/**
 * Connection tracking data
 */
export type ConnectionTrackingData = {
  userId: string;
  connectedUserId: string;
  startDate: Date;
  endDate: Date;
  foodEntries: any[];
};

/**
 * Notification type definition
 */
export type Notification = {
  id?: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
  updatedAt?: Date;
};

/**
 * Find a user by email
 * @param email Email to search for
 * @returns User object, or null if not found
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const users = await queryDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);
    
    if (users.length === 0) {
      return null;
    }
    
    return users[0] as User;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Create a connection request from one user to another
 * @param userId ID of the requesting user
 * @param connectedUserEmail Email of the user to connect with
 * @returns Created connection, or null if error
 */
export const createConnectionRequest = async (
  userId: string,
  connectedUserEmail: string
): Promise<Connection | null> => {
  try {
    // Find the user with the provided email
    const connectedUser = await findUserByEmail(connectedUserEmail);
    
    if (!connectedUser || !connectedUser.id) {
      console.error('User not found with email:', connectedUserEmail);
      return null;
    }
    
    // Check if a connection already exists
    const existingConnections = await queryDocuments('connections', [
      { field: 'userId', operator: '==', value: userId },
      { field: 'connectedUserId', operator: '==', value: connectedUser.id }
    ]);
    
    // Also check the reverse connection (if they sent a request to you)
    const reverseConnections = await queryDocuments('connections', [
      { field: 'userId', operator: '==', value: connectedUser.id },
      { field: 'connectedUserId', operator: '==', value: userId }
    ]);
    
    if (existingConnections.length > 0 || reverseConnections.length > 0) {
      console.error('Connection already exists');
      return null;
    }
    
    // Create the connection object
    const connection: Connection = {
      userId,
      connectedUserId: connectedUser.id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Use provider-agnostic createDocument
    const createdConnection = await createDocument('connections', connection);
    
    // Send a notification to the connected user
    const requester = await getDocument('users', userId);
    if (requester) {
      await createNotification(
        connectedUser.id,
        'connection_request',
        `${requester.name} sent you a connection request`,
        `/dashboard?tab=connections`,
        { requesterId: userId }
      );
    }
    
    return createdConnection as Connection;
  } catch (error) {
    console.error('Error creating connection request:', error);
    return null;
  }
};

/**
 * Get all connections for a user
 * @param userId User ID to get connections for
 * @returns Array of connections with role information
 */
export const getUserConnections = async (userId: string): Promise<ConnectionWithRole[]> => {
  try {
    // Get connections where user is the sender
    const sentConnections = await queryDocuments('connections', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    // Get connections where user is the receiver
    const receivedConnections = await queryDocuments('connections', [
      { field: 'connectedUserId', operator: '==', value: userId }
    ]);

    // Process sent connections
    const processedSentConnections = await Promise.all(
      sentConnections.map(async (connection) => {
        // Get connected user details
        const user = await getDocument('users', connection.connectedUserId);
        return {
          ...connection,
          user,
          role: 'sender'
        } as ConnectionWithRole;
      })
    );

    // Process received connections
    const processedReceivedConnections = await Promise.all(
      receivedConnections.map(async (connection) => {
        // Get connected user details
        const user = await getDocument('users', connection.userId);
        return {
          ...connection,
          user,
          role: 'receiver'
        } as ConnectionWithRole;
      })
    );

    // Combine both sets of connections
    return [...processedSentConnections, ...processedReceivedConnections];
  } catch (error) {
    console.error('Error getting user connections:', error);
    return [];
  }
};

/**
 * Accept a connection request
 * @param connectionId ID of the connection to accept
 * @returns Updated connection object, or null if error
 */
export const acceptConnection = async (connectionId: string): Promise<Connection | null> => {
  try {
    // Get the connection to update
    const connection = await getDocument('connections', connectionId);
    
    if (!connection) {
      console.error('Connection not found');
      return null;
    }

    // Update the connection status
    const updatedConnection = await updateDocument('connections', connectionId, {
      status: 'accepted',
      updatedAt: new Date()
    });

    // Send notification to the sender
    const receiver = await getDocument('users', connection.connectedUserId);
    if (receiver) {
      await createNotification(
        connection.userId,
        'connection_accepted',
        `${receiver.name} accepted your connection request`,
        `/dashboard?tab=connections`,
        { receiverId: connection.connectedUserId }
      );
    }

    return updatedConnection as Connection;
  } catch (error) {
    console.error('Error accepting connection:', error);
    return null;
  }
};

/**
 * Reject a connection request
 * @param connectionId ID of the connection to reject
 * @returns Updated connection object, or null if error
 */
export const rejectConnection = async (connectionId: string): Promise<Connection | null> => {
  try {
    // Update the connection status to rejected
    const updatedConnection = await updateDocument('connections', connectionId, {
      status: 'rejected',
      updatedAt: new Date()
    });
    
    return updatedConnection as Connection;
  } catch (error) {
    console.error('Error rejecting connection:', error);
    return null;
  }
};

/**
 * Delete a connection
 * @param connectionId ID of the connection to delete
 * @returns True if successful, false otherwise
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
 * Get tracking data for a user based on their connections
 * @param userId User ID to get tracking data for
 * @param startDate Start date for tracking period
 * @param endDate End date for tracking period
 * @returns Array of connection tracking data objects
 */
export const getConnectionTrackingData = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ConnectionTrackingData[]> => {
  try {
    // Get accepted connections
    const connections = await queryDocuments('connections', [
      { field: 'userId', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'accepted' }
    ]);

    const receivedConnections = await queryDocuments('connections', [
      { field: 'connectedUserId', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'accepted' }
    ]);

    // Combine and deduplicate connections
    const allConnections = [...connections, ...receivedConnections];
    const uniqueConnectionIds = new Set();
    const uniqueConnections = allConnections.filter(connection => {
      const connectionPair = [connection.userId, connection.connectedUserId].sort().join('-');
      if (!uniqueConnectionIds.has(connectionPair)) {
        uniqueConnectionIds.add(connectionPair);
        return true;
      }
      return false;
    });

    // Get tracking data for each connection
    const trackingData = await Promise.all(
      uniqueConnections.map(async connection => {
        const connectedUserId = connection.userId === userId 
          ? connection.connectedUserId 
          : connection.userId;

        // Get food entries for connected user
        const foodEntries = await queryDocuments('foodEntries', [
          { field: 'userId', operator: '==', value: connectedUserId },
          { field: 'date', operator: '>=', value: startDate },
          { field: 'date', operator: '<=', value: endDate }
        ]);

        return {
          userId,
          connectedUserId,
          startDate,
          endDate,
          foodEntries
        } as ConnectionTrackingData;
      })
    );

    return trackingData;
  } catch (error) {
    console.error('Error getting connection tracking data:', error);
    return [];
  }
};

/**
 * Create a notification for a user
 * @param userId User ID to create notification for
 * @param type Type of notification
 * @param message Notification message text
 * @param actionUrl Optional URL for notification action
 * @param data Optional additional data for the notification
 * @returns Created notification, or null if error
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
  actionUrl?: string,
  data?: any
): Promise<Notification | null> => {
  try {
    const notification: Notification = {
      userId,
      type,
      message,
      read: false,
      data: {
        ...data,
        actionUrl
      },
      createdAt: new Date()
    };

    // Use provider-agnostic createDocument
    const createdNotification = await createDocument('notifications', notification);
    return createdNotification as Notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Get all notifications for a user
 * @param userId User ID to get notifications for
 * @returns Array of notifications sorted by creation date
 */
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const notifications = await queryDocuments('notifications', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    // Sort by creation date (newest first)
    return notifications
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date 
          ? a.createdAt 
          : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date 
          ? b.createdAt 
          : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }) as Notification[];
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param notificationId ID of the notification to mark as read
 * @returns Updated notification, or null if error
 */
export const markNotificationAsRead = async (notificationId: string): Promise<Notification | null> => {
  try {
    const updatedNotification = await updateDocument('notifications', notificationId, {
      read: true,
      updatedAt: new Date()
    });
    return updatedNotification as Notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
};

/**
 * Mark all notifications for a user as read
 * @param userId User ID to mark all notifications as read
 * @returns True if successful, false otherwise
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const notifications = await getUserNotifications(userId);
    
    // Update each notification to be marked as read
    await Promise.all(
      notifications
        .filter(notification => !notification.read)
        .map(notification => 
          updateDocument('notifications', notification.id!, {
            read: true,
            updatedAt: new Date()
          })
        )
    );
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};