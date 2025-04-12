import * as dbProvider from './db-provider';

// Notification type
export type NotificationType = {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected';
  fromUserId: string;
  userId: string;
  fromUserName: string;
  message: string;
  read: boolean;
  createdAt: any;
};

/**
 * Gets all notifications for a user
 */
export const getUserNotifications = async (userId: string): Promise<NotificationType[]> => {
  try {
    if (!userId) {
      console.warn('getUserNotifications called with empty userId');
      return [];
    }
    
    // Use the array-style filter which will be properly transformed by db-provider
    const notifications = await dbProvider.queryDocuments('notifications', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    
    // Sort by created_at descending
    return notifications
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .map(notification => ({
        id: notification.id,
        ...notification
      })) as NotificationType[];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

/**
 * Marks a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await dbProvider.updateDocument('notifications', notificationId, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Marks all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      console.warn('markAllNotificationsAsRead called with empty userId');
      return;
    }
    
    // Get all unread notifications for the user
    const notifications = await dbProvider.queryDocuments('notifications', [
      { field: 'userId', operator: '==', value: userId },
      { field: 'read', operator: '==', value: false }
    ]);
    
    // Update each notification
    const updatePromises = notifications.map(notification => 
      dbProvider.updateDocument('notifications', notification.id, { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Deletes a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await dbProvider.deleteDocument('notifications', notificationId);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * For real-time notifications, we'll need to set up a subscription approach
 * This is a mock implementation until we implement real-time with Supabase
 */
export const onNotificationsChanged = (userId: string, callback: (notifications: NotificationType[]) => void) => {
  // Initially load notifications
  getUserNotifications(userId).then(callback);
  
  // With Supabase, you'd use their real-time subscription
  // For now, we'll poll every 30 seconds as a fallback
  const intervalId = setInterval(async () => {
    const notifications = await getUserNotifications(userId);
    callback(notifications);
  }, 30000);
  
  // Return a function to unsubscribe
  return () => {
    clearInterval(intervalId);
  };
}; 