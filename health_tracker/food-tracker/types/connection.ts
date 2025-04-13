// Connection and notification related types

/**
 * The possible states of a connection between users
 */
export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

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
  id: string;
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
  role: 'requester' | 'receiver';
  user?: User;
}

/**
 * Tracking data for connections
 */
export interface ConnectionTrackingData {
  userId?: string;
  connectedUserId?: string;
  startDate?: Date;
  endDate?: Date;
  foodEntries?: any[];
  totalCalories: number;
  mealCounts: Record<string, number>;
  topFoods: Array<{ name: string; count: number }>;
}

/**
 * Type of notifications in the system
 */
export enum NotificationType {
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  MEAL_REMINDER = 'meal_reminder'
}

/**
 * Notification structure
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data?: any; // Additional data specific to the notification type
  createdAt: Date;
} 