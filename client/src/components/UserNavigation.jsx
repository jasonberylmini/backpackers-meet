import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function UserNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useSocket();

  const navigationItems = [
    { path: '/social', label: 'Social Feed', icon: '🏠' },
    { path: '/trips/browse', label: 'Discover Trips', icon: '🧳' },
    { path: '/trips/create', label: 'My Trips', icon: '➕' },
    { path: '/expenses', label: 'Expenses', icon: '��' },
    { path: '/profile', label: 'Profile', icon: '👤' },
    { path: '/kyc', label: 'KYC Verification', icon: '📋' }
  ];

  const isActive = (path) => {
    if (path === '/social') {
      return location.pathname === '/social';
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
    setIsOpen(false);
  };

  return (
    <nav className="user-navigation">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        <span className={`hamburger ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Navigation Menu */}
      <div className={`nav-menu ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>

        <ul className="nav-list">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <button
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="nav-footer">
          <button 
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
          >
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="nav-overlay" onClick={() => setIsOpen(false)}></div>
      )}
    </nav>
  );
} 