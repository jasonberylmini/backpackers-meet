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
    <div className="min-h-screen bg-gray-50 p-6">

      {/* Welcome Section */}
      <section className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
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
      <section className="mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🧳</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.totalTrips || 0}</h3>
              <p className="text-gray-600">Total Trips</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">✅</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.completedTrips || 0}</h3>
              <p className="text-gray-600">Completed</p>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📅</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.upcomingTrips || 0}</h3>
              <p className="text-gray-600">Upcoming</p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">💰</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats?.totalExpenses || 0}</h3>
              <p className="text-gray-600">Total Spent</p>
            </div>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">⭐</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.totalReviews || 0}</h3>
              <p className="text-gray-600">Reviews Given</p>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">
              {stats?.verificationStatus === 'verified' ? '✅' : '⏳'}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.verificationStatus === 'verified' ? 'Verified' : 'Pending'}</h3>
              <p className="text-gray-600">KYC Status</p>
            </div>
          </div>
        </div>
      </section>



      {/* Recent Trips */}
      <section className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Trips</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/trips')}
          >
            View All
          </button>
        </div>
        {recentTrips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentTrips.slice(0, 3).map(trip => (
              <div key={trip._id} className="card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=200&fit=crop'} 
                    alt={trip.destination}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{trip.destination}</h3>
                  <p className="text-gray-600 mb-2">
                    {new Date(trip.startDate || trip.date).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 mb-3">
                    {trip.members?.length || 0} members
                  </p>
                  <div className="flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (trip.status || 'upcoming') === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                      (trip.status || 'upcoming') === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trip.status || 'Upcoming'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-6 text-gray-400">🧳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">Start your journey by creating your first trip!</p>
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
      <section className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/activity')}
          >
            View All
          </button>
        </div>
        {recentActivity.length > 0 ? (
          <div className="card p-6">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 py-4 border-b border-gray-100 last:border-b-0">
                <div className="text-2xl">
                  {activity.type === 'trip' && '🧳'}
                  {activity.type === 'review' && '⭐'}
                  {activity.type === 'expense' && '💰'}
                  {activity.type === 'message' && '💬'}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 mb-1">{activity.description}</p>
                  <span className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-6 text-gray-400">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No recent activity</h3>
            <p className="text-gray-600">Your activity will appear here as you use the platform</p>
          </div>
        )}
      </section>

      {/* Verification Reminder */}
      {stats?.verificationStatus !== 'verified' && (
        <section className="mb-16">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center space-x-6">
              <div className="bg-amber-500 text-white text-2xl w-16 h-16 rounded-xl flex items-center justify-center">
                📋
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-900 mb-2">Complete Your Verification</h3>
                <p className="text-amber-800 mb-4">Verify your account to unlock all features and build trust with other travelers.</p>
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