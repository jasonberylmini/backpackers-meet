import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

export default function AdminTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/trips', { headers });
      setTrips(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load trips.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDelete = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/trips/${tripId}`, { headers });
      fetchTrips();
    } catch (err) {
      alert('Failed to delete trip.');
    }
  };

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar />
        <main className="admin-dashboard-content">
          <div className="admin-dashboard-content-card">
            <div className="admin-users-header-row">
              <div className="admin-logged-in-as">Logged in as Admin: <span>{JSON.parse(localStorage.getItem('user'))?.name}</span></div>
              <h1 className="admin-section-title">Trips</h1>
            </div>
            <div className="admin-dashboard-table-wrapper">
              {loading ? (
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>Destination</th>
                      <th>Date</th>
                      <th>Budget</th>
                      <th>Trip Type</th>
                      <th>Creator</th>
                      <th>Total Members</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="admin-dashboard-table-skeleton-row">
                        <td colSpan={7}><span className="admin-dashboard-table-skeleton" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : error ? (
                <div className="admin-dashboard-table-error">
                  {error} <button onClick={fetchTrips}>Retry</button>
                </div>
              ) : trips.length === 0 ? (
                <div style={{ color: '#888', fontSize: '1.1rem', padding: '2rem 0' }}>No trips found.</div>
              ) : (
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>Destination</th>
                      <th>Date</th>
                      <th>Budget</th>
                      <th>Trip Type</th>
                      <th>Creator</th>
                      <th>Total Members</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(trip => (
                      <tr key={trip._id}>
                        <td>{trip.destination}</td>
                        <td>{trip.date ? new Date(trip.date).toLocaleDateString() : '-'}</td>
                        <td>{trip.budget ? `$${trip.budget}` : '-'}</td>
                        <td>{trip.tripType || '-'}</td>
                        <td>{trip.creator?.name || '-'}</td>
                        <td>{trip.members ? trip.members.length : 0}</td>
                        <td>
                          <button
                            style={{
                              background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.3rem 1rem', fontWeight: 600, cursor: 'pointer'
                            }}
                            onClick={() => handleDelete(trip._id)}
                          >Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 