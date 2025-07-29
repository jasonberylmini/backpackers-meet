import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import './Dashboard.css';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isConnected } = useSocket();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchDashboardData();
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, tripsRes, activityRes] = await Promise.all([
        axios.get('/api/users/dashboard/stats', { headers }),
        axios.get('/api/users/dashboard/trips', { headers }),
        axios.get('/api/users/dashboard/activity', { headers })
      ]);

      setStats(statsRes.data);
      setRecentTrips(tripsRes.data);
      setRecentActivity(activityRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
      // Set default data for demo
      setStats({
        totalTrips: 0,
        completedTrips: 0,
        upcomingTrips: 0,
        totalExpenses: 0,
        totalReviews: 0,
        verificationStatus: 'pending'
      });
      setRecentTrips([]);
      setRecentActivity([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="user-welcome">
            <h1>Welcome back, {user.name}! 👋</h1>
            <p className="user-subtitle">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="header-actions">
            <div className="connection-status">
              <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span>{isConnected ? 'Connected' : 'Offline'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="dashboard-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🧳</div>
            <div className="stat-content">
              <h3>{stats?.totalTrips || 0}</h3>
              <p>Total Trips</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats?.completedTrips || 0}</h3>
              <p>Completed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h3>{stats?.upcomingTrips || 0}</h3>
              <p>Upcoming</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>₹{stats?.totalExpenses || 0}</h3>
              <p>Total Spent</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3>{stats?.totalReviews || 0}</h3>
              <p>Reviews Given</p>
            </div>
          </div>
          <div className="stat-card verification-status">
            <div className="stat-icon">
              {stats?.verificationStatus === 'verified' ? '✅' : '⏳'}
            </div>
            <div className="stat-content">
              <h3>{stats?.verificationStatus === 'verified' ? 'Verified' : 'Pending'}</h3>
              <p>KYC Status</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button 
            className="action-btn primary"
            onClick={() => navigate('/trips/create')}
          >
            <span className="action-icon">➕</span>
            <span>Create Trip</span>
          </button>
          <button 
            className="action-btn"
            onClick={() => navigate('/trips/browse')}
          >
            <span className="action-icon">🔍</span>
            <span>Find Trips</span>
          </button>
          <button 
            className="action-btn"
            onClick={() => navigate('/profile')}
          >
            <span className="action-icon">👤</span>
            <span>Edit Profile</span>
          </button>
          <button 
            className="action-btn"
            onClick={() => navigate('/expenses')}
          >
            <span className="action-icon">💰</span>
            <span>Track Expenses</span>
          </button>
          <button 
            className="action-btn"
            onClick={() => navigate('/social')}
          >
            <span className="action-icon">💬</span>
            <span>Social Feed</span>
          </button>
          <button 
            className="action-btn"
            onClick={() => navigate('/notifications')}
          >
            <span className="action-icon">🔔</span>
            <span>Notifications</span>
          </button>
        </div>
      </section>

      {/* Recent Trips */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recent Trips</h2>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/trips')}
          >
            View All
          </button>
        </div>
        {recentTrips.length > 0 ? (
          <div className="trips-grid">
            {recentTrips.slice(0, 3).map(trip => (
              <div key={trip._id} className="trip-card">
                <div className="trip-image">
                  <img src={trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=200&fit=crop'} alt={trip.destination} />
                </div>
                <div className="trip-content">
                  <h3>{trip.destination}</h3>
                  <p className="trip-date">
                    {new Date(trip.startDate || trip.date).toLocaleDateString()}
                  </p>
                  <p className="trip-members">
                    {trip.members?.length || 0} members
                  </p>
                  <div className="trip-status">
                    <span className={`status-badge ${trip.status || 'upcoming'}`}>
                      {trip.status || 'Upcoming'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🧳</div>
            <h3>No trips yet</h3>
            <p>Start your journey by creating your first trip!</p>
            <button 
              className="primary-btn"
              onClick={() => navigate('/trips/create')}
            >
              Create Trip
            </button>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/activity')}
          >
            View All
          </button>
        </div>
        {recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'trip' && '🧳'}
                  {activity.type === 'review' && '⭐'}
                  {activity.type === 'expense' && '💰'}
                  {activity.type === 'message' && '💬'}
                </div>
                <div className="activity-content">
                  <p className="activity-text">{activity.description}</p>
                  <span className="activity-time">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No recent activity</h3>
            <p>Your activity will appear here as you use the platform</p>
          </div>
        )}
      </section>

      {/* Verification Reminder */}
      {stats?.verificationStatus !== 'verified' && (
        <section className="dashboard-section">
          <div className="verification-reminder">
            <div className="reminder-icon">📋</div>
            <div className="reminder-content">
              <h3>Complete Your Verification</h3>
              <p>Verify your account to unlock all features and build trust with other travelers.</p>
              <button 
                className="primary-btn"
                onClick={() => navigate('/kyc')}
              >
                Start Verification
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
} 