import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/kyc', label: 'Pending KYC' },
  { to: '/admin/trips', label: 'Trips' },
  { to: '/admin/reviews', label: 'Reviews' }, // Added Reviews link
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/logs', label: 'Logs' }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Close sidebar when a link is clicked (on mobile)
  const handleLinkClick = () => {
    setOpen(false);
  };

  // Hamburger icon for mobile
  const Hamburger = (
    <button
      className="admin-sidebar-hamburger"
      aria-label="Open sidebar"
      onClick={() => setOpen(true)}
    >
      <span>&#9776;</span>
    </button>
  );

  // Close icon for mobile
  const CloseIcon = (
    <button
      className="admin-sidebar-close"
      aria-label="Close sidebar"
      onClick={() => setOpen(false)}
    >
      <span>&times;</span>
    </button>
  );

  return (
    <>
      {/* Hamburger only visible on mobile */}
      {Hamburger}
      {/* Overlay for mobile drawer */}
      {open && <div className="admin-sidebar-overlay" onClick={() => setOpen(false)}></div>}
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        {/* Close icon only on mobile */}
        {open && CloseIcon}
        <div className="admin-sidebar-title">Admin Panel</div>
        <nav className="admin-sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `admin-sidebar-link${isActive ? ' active' : ''}`
              }
              onClick={handleLinkClick}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="admin-sidebar-logout"
        >
          Logout
        </button>
      </aside>
    </>
  );
} 