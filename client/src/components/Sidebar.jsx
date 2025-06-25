import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/trips', label: 'Trips' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/logs', label: 'Logs' }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-title">Admin Panel</div>
      <nav className="admin-sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `admin-sidebar-link${isActive ? ' active' : ''}`
            }
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
  );
} 