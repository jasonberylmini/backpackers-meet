import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
    <div className="signup-bg-dark">
      <div className="signup-card-dark">
        <div className="text-center mb-4">
          <span className="text-5xl text-purple-500 block mb-2">📧</span>
        </div>
        <h2 className="signup-title text-center">Forgot Password</h2>
        <div className="h-0.5 bg-purple-500 opacity-20 mx-auto mb-4 w-16 rounded"></div>
        <p className="signup-desc text-center">Enter your email to receive a password reset link.</p>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            className="signup-btn-dark"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword; 