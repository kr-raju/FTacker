'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../auth-provider'
import Header from '../../components/Header'
import AccountSwitcher from '../../components/AccountSwitcher'
import { 
  Connection,
  ConnectionWithRole,
  getUserConnections,
  createConnectionRequest,
  acceptConnection,
  rejectConnection,
  deleteConnection,
  findUserByEmail
} from '../../services/connectionService'

type ConnectionUI = {
  id: string | undefined;
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  lastUpdate: string;
  role: 'sender' | 'receiver';
};

export default function ConnectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connections, setConnections] = useState<ConnectionUI[]>([]);
  const [viewTab, setViewTab] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [error, setError] = useState('');
  const [connectionEmail, setConnectionEmail] = useState('');
  const [connectionError, setConnectionError] = useState('');

  // Load user and connections on mount
  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/auth/login');
        return;
      }
      
      try {
        // Load connections
        loadConnections(user);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, user]);

  const loadConnections = async (currentUser: any) => {
    try {
      if (!currentUser?.id) return;
      
      const connectionsData = await getUserConnections(currentUser.id);
      
      // Map connections to UI format
      const mappedConnections = connectionsData.map(conn => {
        const isSender = conn.userId === currentUser.id;
        const connectedUser = conn.user || { name: '', email: '' };
        
        return {
          id: conn.id,
          name: connectedUser.name || connectedUser.email || 'Unknown User',
          email: connectedUser.email || '',
          status: conn.status,
          lastUpdate: conn.createdAt ? new Date(conn.createdAt).toISOString() 
            : new Date().toISOString(),
          role: isSender ? 'sender' as const : 'receiver' as const
        };
      });
      
      setConnections(mappedConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
      setError('Failed to load connections');
    }
  };

  const handleAddConnection = async () => {
    // Validate inputs
    if (!connectionEmail.trim()) {
      setConnectionError('Email is required');
      return;
    }
    
    // Check if this is a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(connectionEmail)) {
      setConnectionError('Please enter a valid email address');
      return;
    }
    
    try {
      if (!user?.id) return;
      
      // Find the user with the given email
      const targetUser = await findUserByEmail(connectionEmail);
      
      if (!targetUser) {
        setConnectionError('User not found. Make sure they have an account.');
        return;
      }
      
      // Create connection request
      await createConnectionRequest(user.id, connectionEmail);
      
      // Refresh connections
      await loadConnections(user);
      
      // Reset form and close modal
      setConnectionEmail('');
      setConnectionError('');
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Error adding connection:', error);
      setConnectionError(error.message || 'Failed to add connection. Please try again.');
    }
  };

  const handleRemoveConnection = async (id: string | undefined) => {
    if (!id) {
      console.error('Cannot remove connection: ID is undefined');
      return;
    }
    
    try {
      if (!user) return;
      
      // Remove connection
      await deleteConnection(id);
      
      // Update local state
      setConnections(connections.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error removing connection:', error);
    }
  };
  
  const handleAcceptConnection = async (id: string | undefined) => {
    if (!id) {
      console.error('Cannot accept connection: ID is undefined');
      return;
    }
    
    try {
      if (!user) return;
      
      // Accept the connection
      await acceptConnection(id);
      
      // Update local state
      setConnections(connections.map(c => 
        c.id === id ? { ...c, status: 'accepted' } : c
      ));
    } catch (error) {
      console.error('Error accepting connection:', error);
    }
  };
  
  const handleRejectConnection = async (id: string | undefined) => {
    if (!id) {
      console.error('Cannot reject connection: ID is undefined');
      return;
    }
    
    try {
      if (!user) return;
      
      // Reject the connection
      await rejectConnection(id);
      
      // Update local state
      setConnections(connections.map(c => 
        c.id === id ? { ...c, status: 'rejected' } : c
      ));
    } catch (error) {
      console.error('Error rejecting connection:', error);
    }
  };

  const handleViewTracking = (id: string | undefined) => {
    if (!id) {
      console.error('Cannot view tracking: ID is undefined');
      return;
    }
    router.push(`/connections/${id}`);
  };
  
  const formatLastUpdate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));
      
      if (diffMins < 60) {
        return `${diffMins} min ago`;
      } else if (diffMins < 1440) {
        return `${Math.round(diffMins / 60)} hrs ago`;
      } else {
        return `${Math.round(diffMins / 1440)} days ago`;
      }
    } catch (error) {
      return 'Recently';
    }
  };
  
  // Filter connections based on selected tab
  const filteredConnections = viewTab === 'all' 
    ? connections 
    : connections.filter(c => c.status === viewTab);
    
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onSignOut={async () => {
          await router.push('/auth/login');
        }}
        notifications={[]}
        showNotifications={false}
        setShowNotifications={() => {}}
        onMarkNotificationAsRead={async () => {}}
        onAcceptConnection={handleAcceptConnection}
        onRejectConnection={handleRejectConnection}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add Connection
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setViewTab('all')}
                className={`${
                  viewTab === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                All
              </button>
              <button
                onClick={() => setViewTab('pending')}
                className={`${
                  viewTab === 'pending'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Pending
              </button>
              <button
                onClick={() => setViewTab('accepted')}
                className={`${
                  viewTab === 'accepted'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Connected
              </button>
              <button
                onClick={() => setViewTab('rejected')}
                className={`${
                  viewTab === 'rejected'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Rejected
              </button>
            </nav>
          </div>
        </div>

        {/* Connections List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredConnections.length === 0 ? (
              <li className="px-4 py-6 text-center text-gray-500">
                No connections found
              </li>
            ) : (
              filteredConnections.map((connection) => (
                <li key={connection.id || 'unknown'} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-gray-500">{connection.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Last update: {formatLastUpdate(connection.lastUpdate)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {connection.status === 'pending' && (
                        <>
                          {connection.role === 'receiver' ? (
                            <>
                              <button
                                onClick={() => handleAcceptConnection(connection.id)}
                                className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectConnection(connection.id)}
                                className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRemoveConnection(connection.id)}
                              className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                            >
                              Cancel Request
                            </button>
                          )}
                        </>
                      )}
                      {connection.status === 'accepted' && (
                        <>
                          <button
                            onClick={() => handleViewTracking(connection.id)}
                            className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded"
                          >
                            View Tracking
                          </button>
                          <button
                            onClick={() => handleRemoveConnection(connection.id)}
                            className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </>
                      )}
                      {connection.status === 'rejected' && (
                        <button
                          onClick={() => handleRemoveConnection(connection.id)}
                          className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Connection</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {connectionError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {connectionError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={connectionEmail}
                  onChange={(e) => setConnectionEmail(e.target.value)}
                  placeholder="Enter their email address"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConnection}
                className="btn-primary"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      <AccountSwitcher />
    </div>
  );
} 