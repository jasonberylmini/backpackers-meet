import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import SidebarNavigation from './SidebarNavigation';

export default function UserLayout({ children }) {
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(2); // Example message count
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Add body class for sidebar layout
    document.body.classList.add('user-layout');
    
    fetchNotificationCount();
    
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



  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleMessageClick = () => {
    navigate('/messages');
  };



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
                         {messageCount}
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
                         {notificationCount}
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