import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">

      {/* Welcome Section */}
      <section className="dashboard-welcome">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user.name}! 👋</h1>
            <p className="text-lg text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="dashboard-stats">
        <div className="stats-grid">
          <div className="stat-card stat-card-blue">
            <div className="stat-icon">🧳</div>
            <div>
              <h3 className="stat-number">{stats?.totalTrips || 0}</h3>
              <p className="stat-label">Total Trips</p>
            </div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon">✅</div>
            <div>
              <h3 className="stat-number">{stats?.completedTrips || 0}</h3>
              <p className="stat-label">Completed</p>
            </div>
          </div>
          <div className="stat-card stat-card-purple">
            <div className="stat-icon">📅</div>
            <div>
              <h3 className="stat-number">{stats?.upcomingTrips || 0}</h3>
              <p className="stat-label">Upcoming</p>
            </div>
          </div>
          <div className="stat-card stat-card-yellow">
            <div className="stat-icon">💰</div>
            <div>
              <h3 className="stat-number">₹{stats?.totalExpenses || 0}</h3>
              <p className="stat-label">Total Spent</p>
            </div>
          </div>
          <div className="stat-card stat-card-pink">
            <div className="stat-icon">⭐</div>
            <div>
              <h3 className="stat-number">{stats?.totalReviews || 0}</h3>
              <p className="stat-label">Reviews Given</p>
            </div>
          </div>
          <div className="stat-card stat-card-orange">
            <div className="stat-icon">
              {stats?.verificationStatus === 'verified' ? '✅' : '⏳'}
            </div>
            <div>
              <h3 className="stat-number">{stats?.verificationStatus === 'verified' ? 'Verified' : 'Pending'}</h3>
              <p className="stat-label">KYC Status</p>
            </div>
          </div>
        </div>
      </section>



      {/* Recent Trips */}
      <section className="recent-trips-section">
        <div className="section-header">
          <h2 className="section-title">Recent Trips</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/trips/browse')}
          >
            View All
          </button>
        </div>
        {recentTrips.length > 0 ? (
          <div className="trips-grid">
            {recentTrips.slice(0, 3).map(trip => (
              <div key={trip._id} className="trip-card">
                <div className="trip-image-container">
                  <img 
                    src={trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=200&fit=crop'} 
                    alt={trip.destination}
                    className="trip-image"
                  />
                </div>
                <div className="trip-content">
                  <h3 className="trip-title">{trip.destination}</h3>
                  <p className="trip-date">
                    {new Date(trip.startDate || trip.date).toLocaleDateString()}
                  </p>
                  <p className="trip-members">
                    {trip.members?.length || 0} members
                  </p>
                  <div className="trip-status-container">
                    <span className={`trip-status trip-status-${trip.status || 'upcoming'}`}>
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
            <h3 className="empty-title">No trips yet</h3>
            <p className="empty-description">Start your journey by creating your first trip!</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/trips/create')}
            >
              Create Trip
            </button>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="recent-activity-section">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/activity')}
          >
            View All
          </button>
        </div>
        {recentActivity.length > 0 ? (
          <div className="activity-card">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'trip' && '🧳'}
                  {activity.type === 'review' && '⭐'}
                  {activity.type === 'expense' && '💰'}
                  {activity.type === 'message' && '💬'}
                </div>
                <div className="activity-content">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-timestamp">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">No recent activity</h3>
            <p className="empty-description">Your activity will appear here as you use the platform</p>
          </div>
        )}
      </section>

      {/* Verification Reminder */}
      {stats?.verificationStatus !== 'verified' && (
        <section className="verification-section">
          <div className="verification-card">
            <div className="verification-content">
              <div className="verification-icon">
                📋
              </div>
              <div className="verification-text">
                <h3 className="verification-title">Complete Your Verification</h3>
                <p className="verification-description">Verify your account to unlock all features and build trust with other travelers.</p>
                <button 
                  className="btn btn-success"
                  onClick={() => navigate('/kyc')}
                >
                  Start Verification
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
} 