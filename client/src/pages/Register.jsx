import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
        <p className="signup-desc">Join RideTribe to connect with travelers around the world</p>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label>Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="signup-field">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="signup-field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
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