import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import SidebarNavigation from './SidebarNavigation';
import toast from 'react-hot-toast';

export default function UserLayout({ children }) {
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Add body class for sidebar layout
    document.body.classList.add('user-layout');
    
    fetchNotificationCount();
    fetchMessageCount();
    
    return () => {
      // Clean up body class when component unmounts
      document.body.classList.remove('user-layout');
    };
  }, []);

  // Real-time notification updates
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for new notifications
      socket.on('newNotification', (newNotification) => {
        setNotificationCount(prev => prev + 1);
      });

      // Listen for notification updates (mark as read)
      socket.on('notificationUpdated', (updatedNotification) => {
        if (updatedNotification.read) {
          setNotificationCount(prev => Math.max(0, prev - 1));
        }
      });

      return () => {
        socket.off('newNotification');
        socket.off('notificationUpdated');
      };
    }
  }, [socket, isConnected]);

  // Listen for new messages and clear message count events
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { detail } = event;
      // Only increment count if the message is not from the current user
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (detail.message.sender._id !== currentUser._id) {
        setMessageCount(prev => prev + 1);
        
        // Show toast notification if user is not on messages page
        if (window.location.pathname !== '/messages') {
          const senderName = detail.message.sender.name || detail.message.sender.username;
          const messagePreview = detail.message.text.length > 30 
            ? `${detail.message.text.substring(0, 30)}...` 
            : detail.message.text;
          
          toast.success(`New message from ${senderName}: ${messagePreview}`, {
            icon: '💬',
            duration: 4000,
            onClick: () => {
              navigate('/messages');
            }
          });
        }
      }
    };

    const handleClearMessageCount = () => {
      setMessageCount(0);
    };

    window.addEventListener('newMessage', handleNewMessage);
    window.addEventListener('clearMessageCount', handleClearMessageCount);
    
    return () => {
      window.removeEventListener('newMessage', handleNewMessage);
      window.removeEventListener('clearMessageCount', handleClearMessageCount);
    };
  }, [navigate]);

  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/notifications?read=false', { headers });
      setNotificationCount(response.data.length);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchMessageCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/chat/unread-count', { headers });
      setMessageCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch message count:', error);
    }
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleMessageClick = () => {
    setMessageCount(0); // Clear message count when clicked
    navigate('/messages');
  };

  // Clear message count when user is on messages page
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.pathname === '/messages') {
        setMessageCount(0);
      }
    };

    // Check on mount
    handleRouteChange();

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Refresh counts when user returns to the app (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to the app, refresh counts
        fetchNotificationCount();
        fetchMessageCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="user-layout-container">

      <SidebarNavigation />
                   <main className="user-main-content">
               {/* Top Bar with Icons */}
               <div className="top-bar">
                 <div className="top-bar-icons">
                   {/* Message Icon */}
                   <button
                     className="top-bar-btn message-btn"
                     onClick={handleMessageClick}
                     title="Messages"
                   >
                     <span className="top-bar-icon">💬</span>
                     {messageCount > 0 && (
                       <span 
                         className="top-bar-badge message-badge"
                         style={{ color: 'white !important', WebkitTextFillColor: 'white !important' }}
                       >
                         {messageCount > 99 ? '99+' : messageCount}
                       </span>
                     )}
                   </button>

                   {/* Notification Icon */}
                   <button
                     className="top-bar-btn notification-btn"
                     onClick={handleNotificationClick}
                     title="Notifications"
                   >
                     <span className="top-bar-icon">🔔</span>
                     {notificationCount > 0 && (
                       <span 
                         className="top-bar-badge notification-badge"
                         style={{ color: 'white !important', WebkitTextFillColor: 'white !important' }}
                       >
                         {notificationCount > 99 ? '99+' : notificationCount}
                       </span>
                     )}
                   </button>



                   {/* Account Settings Icon */}
                   <button
                     className="top-bar-btn settings-btn"
                     onClick={() => navigate('/account-settings')}
                     title="Account Settings"
                   >
                     <span className="top-bar-icon">⚙️</span>
                   </button>
                 </div>
               </div>
        {children}
      </main>
    </div>
  );
} 