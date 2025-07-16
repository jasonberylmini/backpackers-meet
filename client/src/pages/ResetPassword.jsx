import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const accent = '#a78bfa'; // purple accent

const ResetPassword = () => {
  const query = useQuery();
  const token = query.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(null); // null = loading, true = valid, false = invalid

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Invalid or missing token.');
      return;
    }
    // Validate token with backend
    fetch('/api/users/validate-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError(data.message || 'This reset link has expired or is invalid.');
        }
      })
      .catch(() => {
        setTokenValid(false);
        setError('Server error. Please try again later.');
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Server error');
    }
  };

  if (tokenValid === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #232336 0%, #3b2f63 50%, #232336 100%)' }}>
        <div className="signup-card-dark" style={{ border: `2px solid ${accent}`, borderRadius: 18, boxShadow: `0 4px 32px 0 ${accent}22`, maxWidth: 400, width: '100%', padding: 32, background: 'rgba(30,32,40,0.98)', textAlign: 'center' }}>
          <span style={{ fontSize: 32, color: accent }}>⏳</span>
          <div style={{ color: '#bbb', marginTop: 16 }}>Checking link...</div>
        </div>
      </div>
    );
  }

  if (!token || tokenValid === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #232336 0%, #3b2f63 50%, #232336 100%)' }}>
        <div className="signup-card-dark" style={{ border: `2px solid #ef4444`, borderRadius: 18, boxShadow: `0 4px 32px 0 #ef444422`, maxWidth: 400, width: '100%', padding: 32, background: 'rgba(30,32,40,0.98)', textAlign: 'center' }}>
          <span style={{ fontSize: 48, color: '#ef4444', display: 'inline-block', marginBottom: 8 }}>⛔</span>
          <h2 className="signup-title" style={{ color: '#ef4444', textAlign: 'center', marginBottom: 8 }}>Link Expired</h2>
          <div style={{ height: 2, background: '#ef4444', opacity: 0.2, margin: '0 auto 18px auto', width: 60, borderRadius: 2 }} />
          <p className="signup-desc" style={{ textAlign: 'center', color: '#bbb', marginBottom: 24 }}>{error || 'This reset link has expired or is invalid.'}</p>
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <Link to="/login" style={{ color: accent, textDecoration: 'underline', fontSize: 15 }}>Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

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
          <span style={{ fontSize: 48, color: accent, display: 'inline-block', marginBottom: 8 }}>🔒</span>
        </div>
        <h2 className="signup-title" style={{ color: accent, textAlign: 'center', marginBottom: 8 }}>Reset Password</h2>
        <div style={{ height: 2, background: accent, opacity: 0.2, margin: '0 auto 18px auto', width: 60, borderRadius: 2 }} />
        <p className="signup-desc" style={{ textAlign: 'center', color: '#bbb', marginBottom: 24 }}>Enter your new password below</p>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label style={{ color: accent }}>New password</label>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ borderColor: accent, color: '#fff', background: '#232336' }}
            />
          </div>
          <div className="signup-field">
            <label style={{ color: accent }}>Confirm new password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={{ borderColor: accent, color: '#fff', background: '#232336' }}
            />
          </div>
          <button
            className="signup-btn-dark"
            type="submit"
            style={{ background: accent, color: '#232336', fontWeight: 600, marginTop: 8 }}
          >
            Reset Password
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

export default ResetPassword; 