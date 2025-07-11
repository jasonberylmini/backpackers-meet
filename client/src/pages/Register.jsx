import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="signup-bg-dark">
      <div className="signup-card-dark">
        <div className="signup-tabs">
          <Link to="/login" className="signup-tab">Log In</Link>
          <span className="signup-tab active">Sign Up</span>
        </div>
        <h2 className="signup-title">Create Account</h2>
        <p className="signup-desc">Join Backpackr to connect with travelers around the world</p>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="signup-field">
            <label>Password</label>
            <span style={{ position: 'relative', display: 'flex', width: '100%', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                style={{ paddingRight: '2.2rem', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.3rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: 0,
                  color: '#888'
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </span>
            <div className="signup-password-hint">Password must be at least 6 characters long</div>
          </div>
          <button className="signup-btn-dark" type="submit">Create account</button>
        </form>
        {error && <p className="signup-error">{error}</p>}
        {success && <p className="signup-success">{success}</p>}
      </div>
    </div>
  );
} 