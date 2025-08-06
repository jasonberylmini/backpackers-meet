import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isConnected } = useSocket();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchDashboardData();
      refreshUserData(); // Refresh user data from server
    }
  }, [navigate]);

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, tripsRes] = await Promise.all([
        axios.get('/api/users/dashboard/stats', { headers }),
        axios.get('/api/users/dashboard/trips', { headers })
      ]);

      setStats(statsRes.data);
      setRecentTrips(tripsRes.data);
      
      // Update user object in localStorage with fresh verification status
      if (statsRes.data.verificationStatus) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, verificationStatus: statsRes.data.verificationStatus };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
      // Set default data for demo, but use actual user verification status
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setStats({
        totalTrips: 0,
        completedTrips: 0,
        upcomingTrips: 0,
        totalExpenses: 0,
        totalReviews: 0,
        verificationStatus: userData.verificationStatus || 'pending'
      });
      setRecentTrips([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const getCurrencySymbol = (currency = 'INR') => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹'
    };
    // If it's a custom currency, return the currency code itself
    if (currency && !symbols[currency]) {
      return currency;
    }
    return symbols[currency] || '₹';
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=200&fit=crop';
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If it's a relative path starting with /uploads, construct the full URL
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:5000${imagePath}`;
    }
    
    // If it's just a filename, assume it's in uploads
    if (!imagePath.includes('/')) {
      return `http://localhost:5000/uploads/${imagePath}`;
    }
    
    return imagePath;
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
      {/* Profile Navigation Button */}
      <div className="profile-nav-section">
        <button 
          className="profile-nav-btn"
          onClick={() => navigate('/profile')}
        >
          👤 View My Profile
        </button>
      </div>

      {/* KYC Verification Reminder - Only for unverified users */}
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
              <h3 className="stat-number">
                {stats?.totalExpensesUSD ? 
                  `${getCurrencySymbol('USD')}${stats.totalExpensesUSD.toFixed(2)} USD` : 
                  `${getCurrencySymbol()}${stats?.totalExpenses || 0}`
                }
              </h3>
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

      {/* Recent Trips Section */}
      <section className="recent-trips-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
               {recentTrips.slice(0, 6).map(trip => (
                 <div 
                   key={trip._id} 
                   className="trip-card"
                   onClick={() => navigate(`/trips/${trip._id}`)}
                   style={{ cursor: 'pointer' }}
                 >
                                     <div className="trip-image-container">
                     <img 
                       src={getImageUrl(trip.images?.[0])} 
                       alt={trip.destination}
                       className="trip-image"
                       onError={(e) => {
                         e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=200&fit=crop';
                       }}
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
        </div>
      </section>
    </div>
  );
} 