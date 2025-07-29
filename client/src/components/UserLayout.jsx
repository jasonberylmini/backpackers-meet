import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';

export default function UserLayout({ children }) {
  const [notificationCount, setNotificationCount] = useState(5); // Example count
  const [messageCount, setMessageCount] = useState(2); // Example message count
  const navigate = useNavigate();

  useEffect(() => {
    // Add body class for sidebar layout
    document.body.classList.add('user-layout');
    
    return () => {
      // Clean up body class when component unmounts
      document.body.classList.remove('user-layout');
    };
  }, []);

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