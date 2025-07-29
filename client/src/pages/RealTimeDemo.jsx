import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import TripChat from '../components/TripChat';
import PersonalChat from '../components/PersonalChat';
import RealTimeExpense from '../components/RealTimeExpense';
import toast, { Toaster } from 'react-hot-toast';

const RealTimeDemo = () => {
  const { isConnected, socket } = useSocket();
  const [activeTab, setActiveTab] = useState('trip-chat');
  const [currentUser, setCurrentUser] = useState(null);
  const [tripId, setTripId] = useState('demo-trip-123');
  const [otherUserId, setOtherUserId] = useState('demo-user-456');

  useEffect(() => {
    // Get current user from localStorage or set demo user
    const token = localStorage.getItem('token');
    if (token) {
      // Decode token to get user info (simplified)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({
          userId: payload.userId,
          name: payload.name || 'Demo User'
        });
      } catch (error) {
        setCurrentUser({
          userId: 'demo-user-123',
          name: 'Demo User'
        });
      }
    } else {
      setCurrentUser({
        userId: 'demo-user-123',
        name: 'Demo User'
      });
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      toast.success('Connected to real-time server!', {
        duration: 3000,
        position: 'top-right',
      });
    } else {
      toast.error('Disconnected from real-time server', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [isConnected]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Toaster />
      
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
          🚀 Real-Time Features Demo
        </h1>
        <p style={{ margin: '0', color: '#6c757d' }}>
          Test live chat, expense tracking, and real-time notifications
        </p>
        <div style={{ marginTop: '10px' }}>
          <span style={{ 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '12px',
            backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
            color: isConnected ? '#155724' : '#721c24'
          }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '1px solid #e1e5e9',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setActiveTab('trip-chat')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'trip-chat' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'trip-chat' ? '#ffffff' : '#6c757d',
            border: '1px solid #e1e5e9',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          💬 Trip Chat
        </button>
        <button
          onClick={() => setActiveTab('personal-chat')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'personal-chat' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'personal-chat' ? '#ffffff' : '#6c757d',
            border: '1px solid #e1e5e9',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          👤 Personal Chat
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'expenses' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'expenses' ? '#ffffff' : '#6c757d',
            border: '1px solid #e1e5e9',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          💰 Expenses
        </button>
      </div>

      {/* Demo Controls */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e1e5e9'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Demo Settings</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Trip ID:</label>
            <input
              type="text"
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Other User ID:</label>
            <input
              type="text"
              value={otherUserId}
              onChange={(e) => setOtherUserId(e.target.value)}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Current User:</label>
            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '500' }}>
              {currentUser.name} ({currentUser.userId})
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'trip-chat' && (
          <TripChat
            tripId={tripId}
            tripName="Demo Trip to Paris"
            user={currentUser}
          />
        )}

        {activeTab === 'personal-chat' && (
          <PersonalChat
            otherUserId={otherUserId}
            otherUserName="Demo Friend"
            currentUser={currentUser}
          />
        )}

        {activeTab === 'expenses' && (
          <RealTimeExpense
            tripId={tripId}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#e7f3ff',
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0056b3' }}>How to Test:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0056b3' }}>
          <li>Open multiple browser tabs/windows to simulate different users</li>
          <li>Use different Trip IDs to test different chat rooms</li>
          <li>Add expenses and see real-time updates across all connected clients</li>
          <li>Watch for toast notifications when users join/leave or add expenses</li>
          <li>Test typing indicators and online status</li>
        </ul>
      </div>
    </div>
  );
};

export default RealTimeDemo; 