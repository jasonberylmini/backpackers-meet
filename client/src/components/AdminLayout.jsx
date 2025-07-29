import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import '../pages/AdminDashboard.css';

export default function AdminLayout({ children }) {
  useEffect(() => {
    // Add admin class to body to help with CSS targeting
    document.body.classList.add('admin-page');
    
    return () => {
      // Remove the class when component unmounts
      document.body.classList.remove('admin-page');
    };
  }, []);

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar />
        <main className="admin-dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
} 