'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../auth-provider'
import * as connectionService from '../../services/connectionService'
import { ConnectionWithRole, ConnectionStatus } from '../../services/connectionService'

// Define connection status values as constants
const CONNECTION_STATUS = {
  Pending: 'pending',
  Accepted: 'accepted',
  Rejected: 'rejected'
} as const;

export default function Connections() {
  const { user } = useAuth()
  const [connections, setConnections] = useState<ConnectionWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      loadConnections()
    }
  }, [user])

  const loadConnections = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const userConnections = await connectionService.getUserConnections(user.id)
      setConnections(userConnections)
      setError('')
    } catch (err: any) {
      setError('Failed to load connections: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptConnection = async (connectionId?: string) => {
    if (!connectionId) {
      setError('Connection ID is missing')
      return
    }
    
    try {
      setLoading(true)
      const success = await connectionService.acceptConnection(connectionId)
      
      if (success) {
        await loadConnections()
      } else {
        setError('Failed to accept connection')
      }
    } catch (err: any) {
      setError('Error accepting connection: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectConnection = async (connectionId?: string) => {
    if (!connectionId) {
      setError('Connection ID is missing')
      return
    }
    
    try {
      setLoading(true)
      const success = await connectionService.rejectConnection(connectionId)
      
      if (success) {
        await loadConnections()
      } else {
        setError('Failed to reject connection')
      }
    } catch (err: any) {
      setError('Error rejecting connection: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConnection = async (connectionId?: string) => {
    if (!connectionId) {
      setError('Connection ID is missing')
      return
    }
    
    try {
      setLoading(true)
      const success = await connectionService.deleteConnection(connectionId)
      
      if (success) {
        await loadConnections()
      } else {
        setError('Failed to delete connection')
      }
    } catch (err: any) {
      setError('Error deleting connection: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="p-4">Please log in to view your connections</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Your Connections</h2>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
      
      {loading && <div className="text-gray-500">Loading connections...</div>}
      
      {connections.length === 0 && !loading ? (
        <div className="text-gray-500">You don't have any connections yet.</div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div key={connection.id || 'unknown'} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{connection.user?.name || connection.user?.email || 'Unknown user'}</p>
                  <p className="text-sm text-gray-500">
                    Status: <span className={`capitalize ${
                      connection.status === CONNECTION_STATUS.Accepted ? 'text-green-600' :
                      connection.status === CONNECTION_STATUS.Rejected ? 'text-red-600' :
                      'text-amber-600'
                    }`}>{connection.status}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {connection.role === 'sender' ? 'You sent this request' : 'Request received'}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {connection.status === CONNECTION_STATUS.Pending && connection.role === 'receiver' && (
                    <>
                      <button
                        onClick={() => handleAcceptConnection(connection.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                        disabled={loading}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectConnection(connection.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
                        disabled={loading}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {(connection.status === CONNECTION_STATUS.Accepted || 
                    connection.status === CONNECTION_STATUS.Rejected ||
                    (connection.status === CONNECTION_STATUS.Pending && connection.role === 'sender')) && (
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 