import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

export default function AdminKYC() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingKYC = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/users', { headers });
      setUsers(res.data.filter(u => u.verificationStatus === 'pending'));
      setLoading(false);
    } catch (err) {
      setError('Failed to load users.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const handleVerify = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${userId}/verify`, { verificationStatus: 'verified' }, { headers });
      fetchPendingKYC();
    } catch (err) {
      alert('Failed to verify user.');
    }
  };

  const handleReject = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${userId}/verify`, { verificationStatus: 'rejected' }, { headers });
      fetchPendingKYC();
    } catch (err) {
      alert('Failed to reject user.');
    }
  };

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="Pending KYC" />
        <main className="admin-dashboard-content">
          <h2 style={{ marginBottom: '1.5rem', color: '#4e54c8', fontWeight: 700 }}>Pending KYC Users</h2>
          <div className="admin-dashboard-table-wrapper">
            {loading ? (
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Gender</th>
                    <th>Preferences</th>
                    <th>ID Document</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="admin-dashboard-table-skeleton-row">
                      <td colSpan={6}><span className="admin-dashboard-table-skeleton" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : error ? (
              <div className="admin-dashboard-table-error">
                {error} <button onClick={fetchPendingKYC}>Retry</button>
              </div>
            ) : users.length === 0 ? (
              <div style={{ color: '#888', fontSize: '1.1rem', padding: '2rem 0' }}>No users pending KYC.</div>
            ) : (
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Gender</th>
                    <th>Preferences</th>
                    <th>ID Document</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.gender || '-'}</td>
                      <td>{u.preferences ? u.preferences.join(', ') : '-'}</td>
                      <td>
                        {u.idDocument ? (
                          <a href={u.idDocument} target="_blank" rel="noopener noreferrer">
                            <img src={u.idDocument} alt="ID Document" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #cfd8fc' }} />
                          </a>
                        ) : (
                          <span style={{ color: '#aaa' }}>No file</span>
                        )}
                      </td>
                      <td>
                        <button
                          style={{
                            background: '#4caf50', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.3rem 1rem', fontWeight: 600, cursor: 'pointer', marginRight: 8
                          }}
                          onClick={() => handleVerify(u._id)}
                        >Verify</button>
                        <button
                          style={{
                            background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.3rem 1rem', fontWeight: 600, cursor: 'pointer'
                          }}
                          onClick={() => handleReject(u._id)}
                        >Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 