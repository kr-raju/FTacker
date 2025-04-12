// Connection and notification related types

/**
 * The possible states of a connection between users
 */
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Basic user information
 */
export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

/**
 * Represents a connection between two users
 */
export interface Connection {
  id?: string;
  userId: string;
  connectedUserId: string;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Connection with additional user role information
 */
export interface ConnectionWithRole extends Connection {
  user?: User;
  role: 'sender' | 'receiver';
}

/**
 * Tracking data for connections
 */
export interface ConnectionTrackingData {
  userId: string;
  connectedUserId: string;
  startDate: Date;
  endDate: Date;
  foodEntries: any[]; // Could be refined to specific food entry type
}

/**
 * Type of notifications in the system
 */
export type NotificationType = 'connection_request' | 'connection_accepted' | 'meal_reminder';

/**
 * Notification structure
 */
export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data?: any; // Additional data specific to the notification type
  createdAt: Date;
} 