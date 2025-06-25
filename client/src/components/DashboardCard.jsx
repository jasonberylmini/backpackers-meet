import React from 'react';

export default function DashboardCard({ title, value, icon }) {
  return (
    <div className="admin-dashboard-card">
      <div className="admin-dashboard-card-icon">{icon}</div>
      <div className="admin-dashboard-card-value">{value}</div>
      <div className="admin-dashboard-card-title">{title}</div>
    </div>
  );
} 