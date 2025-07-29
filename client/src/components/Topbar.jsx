import React, { useState } from 'react';
import { useAdminRealtime } from '../hooks/useAdminRealtime';

export default function Topbar() {
  const admin = JSON.parse(localStorage.getItem('user')) || { name: 'Admin' };
  const { isConnected, adminNotifications, getNotificationCount, clearAdminNotifications } = useAdminRealtime();
  const [showNotifications, setShowNotifications] = useState(false);

  const totalNotifications = getNotificationCount();

  return (
    <header className="admin-topbar" style={{
      width: '100%', background: '#fff', borderBottom: '1px solid #e1e5e9', padding: '0.75rem 2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, zIndex: 10
    }}>
      <div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', 
            backgroundColor: isConnected ? '#28a745' : '#dc3545'
          }} />
          <span style={{ fontSize: 12, color: '#666' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: 20,
              position: 'relative',
              padding: 8
            }} 
            title="Notifications"
          >
            <span role="img" aria-label="bell">🔔</span>
            {totalNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {totalNotifications > 99 ? '99+' : totalNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 320,
              maxHeight: 400,
              backgroundColor: '#fff',
              border: '1px solid #e1e5e9',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e1e5e9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#333' }}>Notifications</span>
                {adminNotifications.length > 0 && (
                  <button
                    onClick={clearAdminNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      fontSize: 12,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {adminNotifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                    No new notifications
                  </div>
                ) : (
                  adminNotifications.slice(0, 10).map((notification, index) => (
                    <div key={index} style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }} onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 4 }}>
                        {notification.title || 'Admin Notification'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                        {notification.message}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {new Date(notification.timestamp || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {adminNotifications.length > 10 && (
                <div style={{
                  padding: '8px 16px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#666',
                  borderTop: '1px solid #e1e5e9'
                }}>
                  +{adminNotifications.length - 10} more notifications
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Info */}
        <div style={{ fontSize: 15, color: '#222', fontWeight: 500 }}>{admin.name}</div>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
} 