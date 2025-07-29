import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}



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
      <div className="signup-bg-dark">
        <div className="signup-card-dark text-center">
          <span className="text-3xl text-purple-500">⏳</span>
          <div className="text-gray-600 mt-4">Checking link...</div>
        </div>
      </div>
    );
  }

  if (!token || tokenValid === false) {
    return (
      <div className="signup-bg-dark">
        <div className="signup-card-dark text-center">
          <span className="text-5xl text-red-500 block mb-2">⛔</span>
          <h2 className="signup-title text-red-500">Link Expired</h2>
          <div className="h-0.5 bg-red-500 opacity-20 mx-auto mb-4 w-16 rounded"></div>
          <p className="signup-desc">{error || 'This reset link has expired or is invalid.'}</p>
          <div className="mt-4 space-x-4">
            <Link to="/login" className="text-purple-500 underline text-sm">Back to Login</Link>
            <Link to="/forgot-password" className="text-purple-500 underline text-sm">Request new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-bg-dark">
      <div className="signup-card-dark">
        <div className="text-center mb-4">
          <span className="text-5xl text-purple-500 block mb-2">🔒</span>
        </div>
        <h2 className="signup-title text-center">Reset Password</h2>
        <div className="h-0.5 bg-purple-500 opacity-20 mx-auto mb-4 w-16 rounded"></div>
        <p className="signup-desc text-center">Enter your new password below</p>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label>New password</label>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="signup-field">
            <label>Confirm new password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            className="signup-btn-dark"
            type="submit"
          >
            Reset Password
          </button>
        </form>
        {message && <div className="text-purple-600 text-center mt-4 font-medium">{message}</div>}
        {error && <div className="text-red-500 text-center mt-4 font-medium">{error}</div>}
        <div className="text-center mt-4">
          <Link to="/login" className="text-purple-500 underline text-sm">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 