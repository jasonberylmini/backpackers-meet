import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import logo from '../../assets/logo.png';

export default function SidebarNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Update body class based on sidebar state
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useSocket();

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/trips/browse', label: 'Discover Trips', icon: '🧳' },
    { path: '/trips/create', label: 'Create Trip', icon: '➕' },
    { path: '/expenses', label: 'Expenses', icon: '💰' },
    { path: '/social', label: 'Social Feed', icon: '💬' },
    { path: '/profile', label: 'Profile', icon: '👤' },
    { path: '/kyc', label: 'KYC Verification', icon: '📋' }
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (path === '/trips/browse') {
      return location.pathname === '/trips/browse';
    }
    if (path === '/trips/create') {
      return location.pathname === '/trips/create';
    }
    if (path.startsWith('/trips/') && path !== '/trips/browse' && path !== '/trips/create') {
      return location.pathname.startsWith('/trips/') && !location.pathname.includes('/browse') && !location.pathname.includes('/create');
    }
    return location.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className={`sidebar-navigation ${isCollapsed ? 'collapsed' : ''}`}>

      {/* Toggle Button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Logo/Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <img src={logo} alt="RideTribe Logo" className="brand-logo" />
        </div>
        {!isCollapsed && <span className="brand-text">RideTribe</span>}
      </div>

      {/* Connection Status */}
      <div className="sidebar-status">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
        {!isCollapsed && (
          <span className="status-text">{isConnected ? 'Connected' : 'Offline'}</span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <button
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
} 