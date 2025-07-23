import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import toast from 'react-hot-toast';
import '../pages/AdminDashboard.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [userReviews, setUserReviews] = useState({}); // { userId: [reviews] }
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const USERS_PER_PAGE = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReviews, setModalReviews] = useState([]);
  const [modalUser, setModalUser] = useState(null);

  const fetchUsers = async () => {
    console.log('fetchUsers called');
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/users', { headers });
      console.log('API response:', res.data);
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users.');
      setLoading(false);
      console.error('API error:', err);
    }
  };

  useEffect(() => {
    console.log('useEffect for fetchUsers running');
    fetchUsers();
  }, []);

  // Fetch reviews for visible users (robust, avoids infinite loop)
  useEffect(() => {
    if (!users.length) return;
    setReviewsLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const fetchReviews = async (userId) => {
      try {
        const res = await axios.get(`/api/reviews/user/${userId}`, { headers });
        setUserReviews(prev => ({ ...prev, [userId]: res.data }));
      } catch (err) {
        console.error(err);
      }
    };
    // Only fetch for paged users not already loaded
    const toFetch = paged.filter(u => !userReviews[u._id]);
    if (toFetch.length === 0) {
      setReviewsLoading(false);
      return;
    }
    Promise.all(toFetch.map(u => fetchReviews(u._id))).then(() => setReviewsLoading(false));
    // eslint-disable-next-line
  }, [users, page]);

  useEffect(() => {
    console.log('Users:', users);
    console.log('UserReviews:', userReviews);
  }, [users, userReviews]);

  // Filtering
  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter
      ? (statusFilter === 'banned' ? u.isBanned : !u.isBanned)
      : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const pageCount = Math.ceil(filtered.length / USERS_PER_PAGE);
  const paged = filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  // Ban/Unban
  const handleBanToggle = async (userId, isBanned) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/ban/${userId}`, { isBanned: !isBanned }, { headers });
      toast.success(!isBanned ? 'User banned!' : 'User unbanned!');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status.');
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
              <h1 className="admin-section-title">Users</h1>
            </div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by name or email"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc', minWidth: 200 }}
              />
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
                <option value="">All Roles</option>
                <option value="traveler">Traveler</option>
                <option value="admin">Admin</option>
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div className="admin-dashboard-table-wrapper">
              {loading || reviewsLoading ? (
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Reviews</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="admin-dashboard-table-skeleton-row">
                        <td colSpan={5}><span className="admin-dashboard-table-skeleton" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : error ? (
                <div className="admin-dashboard-table-error">
                  {error} <button onClick={fetchUsers}>Retry</button>
                </div>
              ) : (
                <>
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Reviews</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(u => {
                        const reviews = userReviews[u._id] || [];
                        const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : '-';
                        const positive = reviews.filter(r => r.rating >= 4);
                        const negative = reviews.filter(r => r.rating <= 2);
                        return (
                          <tr key={u._id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>{u.isBanned ? 'Banned' : 'Active'}</td>
                            <td>
                              <div style={{ fontSize: 13 }}>
                                <span style={{ color: '#4ade80', fontWeight: 600 }}>+{positive.length}</span> / <span style={{ color: '#ef4444', fontWeight: 600 }}>-{negative.length}</span><br />
                                <span>Avg: <b>{avgRating}</b></span>
                                {reviews.length > 0 && (
                                  <>
                                    <br />
                                    <span style={{ color: '#bbb' }}>Recent: {reviews[0].feedback.slice(0, 40)}{reviews[0].feedback.length > 40 ? '...' : ''}</span>
                                  </>
                                )}
                              </div>
                              <button
                                style={{ marginTop: 4, fontSize: 12, color: '#4e54c8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => {
                                  setModalUser(u);
                                  setModalReviews(reviews);
                                  setModalOpen(true);
                                }}
                                disabled={reviews.length === 0}
                              >View All</button>
                            </td>
                            <td>
                              <button
                                style={{
                                  background: u.isBanned ? '#4e54c8' : '#d32f2f',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  padding: '0.3rem 1rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background 0.18s',
                                }}
                                onClick={() => handleBanToggle(u._id, u.isBanned)}
                              >
                                {u.isBanned ? 'Unban' : 'Ban'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Modal for viewing all reviews */}
                  {modalOpen && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      background: 'rgba(0,0,0,0.35)',
                      zIndex: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        maxWidth: 480,
                        width: '90vw',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(34,48,91,0.13)',
                        padding: 28,
                        position: 'relative',
                      }}>
                        <button
                          onClick={() => setModalOpen(false)}
                          style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }}
                          aria-label="Close"
                        >×</button>
                        <h2 style={{ marginBottom: 12, color: '#4e54c8', fontSize: 22 }}>Reviews for {modalUser?.name}</h2>
                        {modalReviews.length === 0 ? (
                          <div style={{ color: '#bbb', textAlign: 'center' }}>No reviews yet.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0 }}>
                            {modalReviews.map((r, i) => (
                              <li key={r._id || i} style={{ marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
                                <div style={{ fontWeight: 600, color: r.rating >= 4 ? '#4ade80' : r.rating <= 2 ? '#ef4444' : '#888' }}>{r.rating}★</div>
                                <div style={{ color: '#222', margin: '4px 0 6px 0' }}>{r.feedback}</div>
                                {r.tags && r.tags.length > 0 && (
                                  <div style={{ fontSize: 13, color: '#4e54c8' }}>Tags: {r.tags.join(', ')}</div>
                                )}
                                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>By: {r.reviewer?.name || 'Unknown'}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Pagination controls */}
                  {pageCount > 1 && (
                    <div className="admin-dashboard-table-pagination">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                      <span>Page {page} of {pageCount}</span>
                      <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 