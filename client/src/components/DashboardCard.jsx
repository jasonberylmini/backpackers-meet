import React from 'react';

export default function DashboardCard({ title, value, icon, loading, error }) {
  return (
    <div className="admin-dashboard-card">
      <div className="admin-dashboard-card-icon">{icon}</div>
      <div className="admin-dashboard-card-value">
        {loading ? (
          <span className="admin-dashboard-card-skeleton" />
        ) : error ? (
          <span className="admin-dashboard-card-error">{error}</span>
        ) : (
          value
        )}
      </div>
      <div className="admin-dashboard-card-title">{title}</div>
    </div>
  );
} 