import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '../services/firebase'
import { 
  onNotificationsChanged, 
  markAllNotificationsAsRead, 
  markNotificationAsRead,
  deleteNotification
} from '../services/notificationService'

// Notification type definition
type NotificationType = {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected';
  fromUserId: string;
  userId: string;
  fromUserName: string;
  message: string;
  read: boolean;
  createdAt: any;
};

// Header props type
type HeaderProps = {
  user: any;
  onSignOut: () => Promise<void>;
  notifications: NotificationType[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  onMarkNotificationAsRead: (notificationId: string) => Promise<void>;
  onAcceptConnection: (connectionId: string) => Promise<void>;
  onRejectConnection: (connectionId: string) => Promise<void>;
};

export default function Header({
  user,
  onSignOut,
  notifications,
  showNotifications,
  setShowNotifications,
  onMarkNotificationAsRead,
  onAcceptConnection,
  onRejectConnection
}: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Update unread count when notifications change
  useEffect(() => {
    if (!notifications) {
      setUnreadCount(0);
      return;
    }
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowNotifications]);

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    if (showNotifications) setShowNotifications(false);
  };
  
  const toggleNotifications = async () => {
    // Mark all as read when opening
    if (!showNotifications && notifications?.some(n => !n.read)) {
      try {
        await markAllNotificationsAsRead(user.uid);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
    
    setShowNotifications(!showNotifications);
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-primary-600">
                Food Tracker
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/connections"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Connections
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center">
            {/* Notifications */}
            <div className="ml-3 relative">
              <button
                onClick={toggleNotifications}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span className="sr-only">View notifications</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div
                  ref={notificationsRef}
                  className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100"
                >
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 ${
                            !notification.read ? 'bg-gray-50' : ''
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt.seconds * 1000).toLocaleString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <button
                                onClick={() => onMarkNotificationAsRead(notification.id)}
                                className="ml-2 text-xs text-primary-600 hover:text-primary-900"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                          {notification.type === 'connection_request' && (
                            <div className="mt-2 flex space-x-2">
                              <button
                                onClick={() => onAcceptConnection(notification.id)}
                                className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => onRejectConnection(notification.id)}
                                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-4">
                      <button
                        onClick={() => markAllNotificationsAsRead(user.uid)}
                        className="text-sm text-primary-600 hover:text-primary-900"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  onClick={toggleProfileDropdown}
                  className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                    {user?.displayName?.[0] || user?.email?.[0] || '?'}
                  </div>
                </button>
              </div>

              {isProfileDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100"
                >
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Your Profile
                    </Link>
                    <button
                      onClick={onSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 