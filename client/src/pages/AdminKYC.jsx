import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import toast from 'react-hot-toast';
import '../pages/AdminDashboard.css';

const BACKEND_URL = "http://localhost:5000"; // Change this if your backend runs elsewhere

// Helper to ensure correct URL
const getImageUrl = (path) => {
  if (!path) return '';
  // Remove any leading slashes and convert backslashes to forward slashes
  const cleanPath = path.replace(/\\/g, '/').replace(/\//g, '/').replace(/^\/+|^\/+/, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

export default function AdminKYC() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalImage, setModalImage] = useState(null); // For modal

  const fetchPendingKYC = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/users/admin/unverified', { headers });
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  // Verify user (KYC approve)
  const handleVerify = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`/api/admin/verify/${userId}`, { status: 'verified' }, { headers });
      toast.success('User verified!');
      fetchPendingKYC();
    } catch (err) {
      toast.error('Failed to verify user.');
    }
  };

  // Ban user (KYC reject)
  const handleReject = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/ban/${userId}`, { isBanned: true }, { headers });
      toast.success('User banned!');
      fetchPendingKYC();
    } catch (err) {
      toast.error('Failed to ban user.');
    }
  };

  // Modal component
  const ImageModal = ({ src, onClose }) => (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{ position: 'relative', background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <img src={src} alt="ID Document" style={{ maxWidth: '80vw', maxHeight: '70vh', display: 'block', marginBottom: 16 }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="Pending KYC" />
        <main className="admin-dashboard-content">
          <div className="admin-dashboard-content-card">
            <div className="admin-users-header-row">
              <div className="admin-logged-in-as">Logged in as Admin: <span>{JSON.parse(localStorage.getItem('user'))?.name}</span></div>
              <h1 className="admin-section-title">Pending KYC</h1>
            </div>
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
                        <td>{u.preferences ? (Array.isArray(u.preferences) ? u.preferences.join(', ') : u.preferences) : '-'}</td>
                        <td>
                          {u.idDocument ? (
                            <img
                              src={getImageUrl(u.idDocument)}
                              alt="ID Document"
                              style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #cfd8fc', cursor: 'pointer' }}
                              onClick={() => setModalImage(getImageUrl(u.idDocument))}
                              title="Click to preview"
                            />
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
          </div>
        </main>
        {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
      </div>
    </div>
  );
} 