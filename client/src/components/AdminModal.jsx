import React, { useEffect, useRef } from 'react';

export default function AdminModal({ open, onClose, title, children, actions }) {
  const previousOverflow = useRef('');

  useEffect(() => {
    if (!open) return undefined;
    // Lock background scroll
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Close on Escape
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow.current || '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10, 12, 28, 0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="admin-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(2,6,23,0.25)',
          minWidth: 360,
          maxWidth: 960,
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          position: 'relative',
          animation: 'modal-in 120ms ease-out'
        }}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(180deg, #fff 90%, rgba(255,255,255,0))',
          padding: '16px 20px 8px 20px',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #eef1f5'
        }}>
          {title && (
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{title}</h2>
          )}
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e5e7eb',
              width: 36,
              height: 36,
              borderRadius: 8,
              cursor: 'pointer',
              color: '#64748b',
              fontSize: 18
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>{children}</div>
          {actions && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>{actions}</div>
          )}
        </div>
      </div>
      <style>{`@keyframes modal-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}