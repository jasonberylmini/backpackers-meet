import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import DashboardCard from '../components/DashboardCard';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isConnected, getSummaryStats, getLiveData } = useAdminRealtime();

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/stats', { headers });
      setStats(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard statistics.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Get real-time summary stats
  const realtimeStats = getSummaryStats();
  const liveData = getLiveData();

  if (loading) {
    return (
      <AdminLayout>
        <h1>Admin Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 120, backgroundColor: '#f8f9fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#666' }}>Loading...</div>
            </div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <h1>Admin Dashboard</h1>
        <div style={{ color: '#d32f2f', padding: 20, textAlign: 'center' }}>
          {error} <button onClick={fetchStats}>Retry</button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1>Admin Dashboard</h1>
      
      {/* Connection Status */}
      <div style={{ 
        marginBottom: 24, 
        padding: 12, 
        backgroundColor: isConnected ? '#e8f5e8' : '#fde2e1', 
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', 
          backgroundColor: isConnected ? '#28a745' : '#dc3545'
        }} />
        <span style={{ fontSize: 14, color: isConnected ? '#28a745' : '#dc3545' }}>
          {isConnected ? '🟢 Real-time updates active' : '🔴 Real-time updates disconnected'}
        </span>
      </div>

      {/* Main Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
        <DashboardCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon="👥"
          color="#1976d2"
          trend={stats?.newUsersToday || 0}
          trendLabel="new today"
        />
        <DashboardCard
          title="Total Trips"
          value={stats?.totalTrips || 0}
          icon="🧳"
          color="#388e3c"
          trend={liveData.trips?.length || 0}
          trendLabel="new live"
          trendColor="#ff9800"
        />
        <DashboardCard
          title="Active Reviews"
          value={stats?.totalReviews || 0}
          icon="⭐"
          color="#f57c00"
          trend={liveData.reviews?.length || 0}
          trendLabel="new live"
          trendColor="#ff9800"
        />
        <DashboardCard
          title="Pending KYC"
          value={stats?.pendingKYC || 0}
          icon="📋"
          color="#7b1fa2"
          trend={liveData.kyc?.length || 0}
          trendLabel="new requests"
          trendColor="#dc3545"
        />
        <DashboardCard
          title="Flagged Content"
          value={stats?.totalFlags || 0}
          icon="🚩"
          color="#d32f2f"
          trend={liveData.flags?.length || 0}
          trendLabel="new flags"
          trendColor="#dc3545"
        />
        <DashboardCard
          title="Admin Actions"
          value={stats?.totalLogs || 0}
          icon="📝"
          color="#666"
          trend={liveData.logs?.length || 0}
          trendLabel="new logs"
          trendColor="#ff9800"
        />
      </div>

      {/* Admin Dashboard Overview */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 24, color: '#4e54c8', fontSize: '1.8rem' }}>Admin Dashboard Overview</h2>
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: 12, 
          border: '1px solid #e1e5e9',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>
              {/* Reorganized Admin Guide */}
              <div style={{ 
                padding: 0,
                backgroundColor: 'transparent'
              }}>
                
                {/* Today's Activity Summary - First */}
                <div style={{ 
                  padding: 20, 
                  backgroundColor: '#f3e5f5', 
                  borderRadius: 12,
                  border: '2px solid #ce93d8',
                  marginBottom: 20,
                  boxShadow: '0 2px 8px rgba(123, 31, 162, 0.1)'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#7b1fa2', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📊 Today's Activity Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, border: '1px solid #ce93d8' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1976d2' }}>{stats?.newUsersToday || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>New Users</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, border: '1px solid #ce93d8' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#388e3c' }}>{stats?.newTripsToday || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>New Trips</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, border: '1px solid #ce93d8' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#f57c00' }}>{stats?.newReviewsToday || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>New Reviews</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, border: '1px solid #ce93d8' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#d32f2f' }}>{stats?.newFlagsToday || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>New Flags</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, border: '1px solid #ce93d8' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#666' }}>{stats?.newLogsToday || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Admin Actions</div>
                    </div>
                  </div>
                </div>

                {/* Priority Actions - Second */}
                <div style={{ 
                  padding: 24, 
                  backgroundColor: '#fff3e0', 
                  borderRadius: 12,
                  border: '2px solid #ffcc02',
                  marginBottom: 20,
                  boxShadow: '0 2px 8px rgba(255, 204, 2, 0.2)'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f57c00', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚡ Priority Actions - Start Here
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div style={{ 
                      padding: 12, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #ffcc02'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#d32f2f' }}>🚨 Urgent</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#d32f2f' }}>{stats?.pendingKYC || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>KYC Reviews Pending</div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #ffcc02'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#d32f2f' }}>🚩 Attention</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#d32f2f' }}>{stats?.totalFlags || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Flagged Items</div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #ffcc02'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1976d2' }}>👥 New</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1976d2' }}>{stats?.newUsersToday || 0}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>Users Today</div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #ffcc02'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isConnected ? '#28a745' : '#dc3545' }}>🔗 Status</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: isConnected ? '#28a745' : '#dc3545' }}>
                        {isConnected ? '🟢 Online' : '🔴 Offline'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>System Status</div>
                    </div>
                  </div>
                </div>

                {/* Navigation Guide - Third */}
                <div style={{ 
                  padding: 24, 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: 12,
                  border: '2px solid #bbdefb',
                  marginBottom: 20,
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1976d2', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🧭 Navigation Guide - Where to Go
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>👥 Users</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Manage accounts, view profiles, ban/unban users, monitor activity
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#7b1fa2', marginBottom: 8 }}>📋 Pending KYC</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Review identity documents, verify users, approve/reject applications
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#388e3c', marginBottom: 8 }}>🧳 Trips</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Monitor trip creation, manage bookings, view trip details
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f57c00', marginBottom: 8 }}>⭐ Reviews</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Moderate user reviews, manage ratings, handle complaints
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#d32f2f', marginBottom: 8 }}>🚩 Reports</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        View flagged content, handle user reports, investigate issues
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 8 }}>📝 Logs</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Track admin actions, view system events, audit trails
                      </div>
                    </div>
                  </div>
                </div>

                {/* Best Practices - Fourth */}
                <div style={{ 
                  padding: 24, 
                  backgroundColor: '#e8f5e8', 
                  borderRadius: 12,
                  border: '2px solid #a5d6a7',
                  boxShadow: '0 2px 8px rgba(56, 142, 60, 0.1)'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#388e3c', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📋 Best Practices - Do This Daily
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #a5d6a7'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#d32f2f', marginBottom: 8 }}>⏰ Within 24 Hours</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Review KYC documents, respond to urgent flags, handle critical reports
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #a5d6a7'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f57c00', marginBottom: 8 }}>📅 Daily Tasks</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Check flagged content, monitor user reports, review new registrations
                      </div>
                    </div>
                    <div style={{ 
                      padding: 16, 
                      backgroundColor: '#fff', 
                      borderRadius: 8,
                      border: '1px solid #a5d6a7'
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>📊 Weekly Review</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        Review admin logs, analyze trends, update moderation policies
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </div>
    </AdminLayout>
  );
} 