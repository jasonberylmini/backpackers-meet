import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Login successful! Redirecting...');
      setTimeout(() => {
        if (data.user.role === 'admin') {
                  navigate('/admin/dashboard');
      } else {
        navigate('/social');
        }
      }, 1000);
      return;
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="signup-bg-dark">
      <div className="signup-card-dark">
        <div className="signup-tabs">
          <span className="signup-tab active">Log In</span>
          <Link to="/register" className="signup-tab">Sign Up</Link>
        </div>
        <h2 className="signup-title">Log In</h2>
        <p className="signup-desc">Enter your credentials to access your account</p>
        <form onSubmit={handleSubmit} className="signup-form">
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
            />
          </div>
          <button className="signup-btn-dark" type="submit">Log in</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/forgot-password" style={{ color: '#a78bfa', textDecoration: 'underline', fontSize: 15 }}>Forgot password?</Link>
        </div>
      </div>
    </div>
  );
} 