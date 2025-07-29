import React from 'react';

export default function AdminModal({ open, onClose, title, children, actions }) {
  if (!open) return null;
  return (
    <div className="admin-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="admin-modal" style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(80,80,160,0.18)',
        minWidth: 320,
        maxWidth: 480,
        width: '100%',
        padding: 24,
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            color: '#888'
          }}
          aria-label="Close"
        >
          &times;
        </button>
        {title && <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20 }}>{title}</h2>}
        <div style={{ marginBottom: 24 }}>{children}</div>
        {actions && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>{actions}</div>
        )}
      </div>
    </div>
  );
} 