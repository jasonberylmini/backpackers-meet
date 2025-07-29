import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time notification listener
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for new notifications
      socket.on('newNotification', (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        toast.success(`New ${newNotification.type} notification!`);
      });

      // Listen for notification updates
      socket.on('notificationUpdated', (updatedNotification) => {
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === updatedNotification._id 
              ? updatedNotification 
              : notification
          )
        );
      });

      // Listen for notification deletion
      socket.on('notificationDeleted', (deletedId) => {
        setNotifications(prev => 
          prev.filter(notification => notification._id !== deletedId)
        );
      });

      return () => {
        socket.off('newNotification');
        socket.off('notificationUpdated');
        socket.off('notificationDeleted');
      };
    }
  }, [socket, isConnected]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('/api/notifications', { headers });
      setNotifications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setLoading(false);
      toast.error('Failed to load notifications');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`/api/notifications/${notificationId}/read`, {}, { headers });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put('/api/notifications/mark-all-read', {}, { headers });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`/api/notifications/${notificationId}`, { headers });
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete('/api/notifications/clear-all', { headers });
      
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      toast.error('Failed to clear all notifications');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      trip: '🧳',
      message: '💬',
      expense: '💰',
      review: '⭐',
      system: '🔔',
      kyc: '📋',
      invitation: '📨'
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type) => {
    const colors = {
      trip: '#3b82f6',
      message: '#10b981',
      expense: '#f59e0b',
      review: '#8b5cf6',
      system: '#6b7280',
      kyc: '#ef4444',
      invitation: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'trip':
        if (notification.tripId) {
          navigate(`/trips/${notification.tripId}`);
        } else {
          navigate('/trips/browse');
        }
        break;
      case 'message':
        if (notification.chatId) {
          navigate(`/chat/${notification.chatId}`);
        } else {
          navigate('/social');
        }
        break;
      case 'expense':
        navigate('/expenses');
        break;
      case 'kyc':
        navigate('/profile');
        break;
      default:
        // For system notifications, just mark as read
        break;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="notifications-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      {/* Header */}
      <header className="notifications-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Notifications</h1>
            <p>Stay updated with your travel activities</p>
          </div>
          <div className="header-actions">
            <div className="connection-status">
              <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span className="status-text">
                {isConnected ? 'Live Updates' : 'Offline'}
              </span>
            </div>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                className="clear-all-btn"
                onClick={clearAllNotifications}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="notifications-filters">
        <div className="filters-content">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </div>
      </section>

      {/* Notifications List */}
      <section className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p>
              {filter === 'all' 
                ? "You're all caught up! No notifications yet."
                : filter === 'unread'
                ? "No unread notifications"
                : "No read notifications"
              }
            </p>
          </div>
        ) : (
          <div className="notifications-grid">
            {filteredNotifications.map(notification => (
              <div 
                key={notification._id} 
                className={`notification-card ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  <span 
                    className="icon"
                    style={{ backgroundColor: getNotificationColor(notification.type) }}
                  >
                    {getNotificationIcon(notification.type)}
                  </span>
                  {!notification.read && <div className="unread-dot"></div>}
                </div>
                
                <div className="notification-content">
                  <div className="notification-header">
                    <h4>{notification.title}</h4>
                    <span className="notification-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className="notification-message">
                    {notification.message}
                  </p>
                  
                  {notification.data && (
                    <div className="notification-data">
                      {notification.data.tripName && (
                        <span className="data-item">
                          🧳 {notification.data.tripName}
                        </span>
                      )}
                      {notification.data.amount && (
                        <span className="data-item">
                          💰 ₹{notification.data.amount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="notification-actions">
                  {!notification.read && (
                    <button 
                      className="mark-read-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification._id);
                      }}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
} 