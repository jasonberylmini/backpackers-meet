import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const accent = '#a78bfa';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Server error');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #232336 0%, #3b2f63 50%, #232336 100%)',
      }}
    >
      <div
        className="signup-card-dark"
        style={{
          border: `2px solid ${accent}`,
          borderRadius: 18,
          boxShadow: `0 4px 32px 0 ${accent}22`,
          maxWidth: 400,
          width: '100%',
          padding: 32,
          background: 'rgba(30,32,40,0.98)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 48, color: accent, display: 'inline-block', marginBottom: 8 }}>📧</span>
        </div>
        <h2 className="signup-title" style={{ color: accent, textAlign: 'center', marginBottom: 8 }}>Forgot Password</h2>
        <div style={{ height: 2, background: accent, opacity: 0.2, margin: '0 auto 18px auto', width: 60, borderRadius: 2 }} />
        <p className="signup-desc" style={{ textAlign: 'center', color: '#bbb', marginBottom: 24 }}>Enter your email to receive a password reset link.</p>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label style={{ color: accent }}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ borderColor: accent, color: '#fff', background: '#232336' }}
            />
          </div>
          <button
            className="signup-btn-dark"
            type="submit"
            style={{ background: accent, color: '#232336', fontWeight: 600, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        {message && <div style={{ color: accent, marginTop: 16, textAlign: 'center', fontWeight: 500 }}>{message}</div>}
        {error && <div style={{ color: '#ef4444', marginTop: 16, textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/login" style={{ color: accent, textDecoration: 'underline', fontSize: 15 }}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 