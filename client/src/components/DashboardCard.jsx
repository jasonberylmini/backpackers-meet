import React from 'react';

export default function DashboardCard({ 
  title, 
  value, 
  icon, 
  color = '#4e54c8', 
  trend = null, 
  trendLabel = '', 
  trendColor = '#28a745',
  loading = false,
  error = null 
}) {
  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9',
        minHeight: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9',
        minHeight: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#d32f2f' }}>Error</div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e1e5e9',
      minHeight: 120,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: color
      }} />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 24 }}>{icon}</div>
        {trend !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            backgroundColor: trendColor + '20',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            color: trendColor
          }}>
            <span>{trend > 0 ? '+' : ''}{trend}</span>
            <span style={{ fontSize: 10 }}>{trendLabel}</span>
          </div>
        )}
      </div>
      
      <div style={{ fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      
      <div style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>
        {title}
      </div>
    </div>
  );
} 