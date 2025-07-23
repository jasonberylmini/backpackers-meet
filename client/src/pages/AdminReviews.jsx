import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [type, setType] = useState('');
  const [rating, setRating] = useState('');
  const [flagged, setFlagged] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReview, setModalReview] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = { page, limit };
      if (type) params.type = type;
      if (rating) params.rating = rating;
      if (flagged) params.flagged = flagged;
      if (search) params.search = search;
      const res = await axios.get('/api/reviews/all', { headers, params });
      setReviews(res.data.reviews);
      setTotal(res.data.total);
      setLoading(false);
    } catch (err) {
      setError('Failed to load reviews.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line
  }, [page, type, rating, flagged, search]);

  // Statistics
  const positive = reviews.filter(r => r.rating >= 4);
  const negative = reviews.filter(r => r.rating <= 2);
  const flaggedCount = reviews.filter(r => r.flagged).length;

  // Actions
  const handleFlag = async (reviewId, flag) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    await axios.put(`/api/reviews/${reviewId}/${flag ? 'flag' : 'unflag'}`, {}, { headers });
    fetchReviews();
  };
  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    await axios.delete(`/api/reviews/${reviewId}`, { headers });
    fetchReviews();
  };

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar />
        <main className="admin-dashboard-content">
          <div className="admin-dashboard-content-card">
            <h1 className="admin-section-title">Review Moderation</h1>
            <div style={{ marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search feedback/tags" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc', minWidth: 200 }} />
              <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
                <option value="">All Types</option>
                <option value="user">User</option>
                <option value="trip">Trip</option>
              </select>
              <select value={rating} onChange={e => { setRating(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
                <option value="">All Ratings</option>
                <option value="5">5★</option>
                <option value="4">4★</option>
                <option value="3">3★</option>
                <option value="2">2★</option>
                <option value="1">1★</option>
              </select>
              <select value={flagged} onChange={e => { setFlagged(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
                <option value="">All</option>
                <option value="true">Flagged</option>
                <option value="false">Not Flagged</option>
              </select>
            </div>
            <div style={{ marginBottom: 18, fontSize: 15 }}>
              <b>Total:</b> {total} &nbsp;|&nbsp; <span style={{ color: '#4ade80' }}>+{positive.length}</span> / <span style={{ color: '#ef4444' }}>-{negative.length}</span> &nbsp;|&nbsp; <span style={{ color: '#f59e42' }}>Flagged: {flaggedCount}</span>
            </div>
            <div className="admin-dashboard-table-wrapper">
              {loading ? (
                <div style={{ textAlign: 'center', color: '#bbb', padding: 40 }}>Loading reviews...</div>
              ) : error ? (
                <div className="admin-dashboard-table-error">{error} <button onClick={fetchReviews}>Retry</button></div>
              ) : (
                <>
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Reviewer</th>
                        <th>Reviewee</th>
                        <th>Rating</th>
                        <th>Feedback</th>
                        <th>Tags</th>
                        <th>Flagged</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map(r => (
                        <tr key={r._id} style={r.flagged ? { background: '#fff7e6' } : {}}>
                          <td>{r.reviewType}</td>
                          <td>{r.reviewer?.name || 'Unknown'}</td>
                          <td>{r.reviewType === 'user' ? r.reviewedUser?.name : r.tripId?.destination || 'Unknown'}</td>
                          <td style={{ color: r.rating >= 4 ? '#4ade80' : r.rating <= 2 ? '#ef4444' : '#888', fontWeight: 600 }}>{r.rating}★</td>
                          <td>
                            <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#4e54c8' }} onClick={() => { setModalReview(r); setModalOpen(true); }}>{r.feedback.slice(0, 40)}{r.feedback.length > 40 ? '...' : ''}</span>
                          </td>
                          <td>{r.tags && r.tags.length > 0 ? r.tags.join(', ') : '-'}</td>
                          <td>{r.flagged ? 'Yes' : 'No'}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button style={{ fontSize: 12, color: r.flagged ? '#4e54c8' : '#f59e42', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginRight: 8 }} onClick={() => handleFlag(r._id, !r.flagged)}>{r.flagged ? 'Unflag' : 'Flag'}</button>
                            <button style={{ fontSize: 12, color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleDelete(r._id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination controls */}
                  {total > limit && (
                    <div className="admin-dashboard-table-pagination">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                      <span>Page {page} of {Math.ceil(total / limit)}</span>
                      <button onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page === Math.ceil(total / limit)}>Next</button>
                    </div>
                  )}
                  {/* Modal for review details */}
                  {modalOpen && modalReview && (
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
                        <h2 style={{ marginBottom: 12, color: '#4e54c8', fontSize: 22 }}>Review Details</h2>
                        <div style={{ marginBottom: 8 }}><b>Type:</b> {modalReview.reviewType}</div>
                        <div style={{ marginBottom: 8 }}><b>Reviewer:</b> {modalReview.reviewer?.name || 'Unknown'} ({modalReview.reviewer?.email || '-'})</div>
                        <div style={{ marginBottom: 8 }}><b>Reviewee:</b> {modalReview.reviewType === 'user' ? modalReview.reviewedUser?.name : modalReview.tripId?.destination || 'Unknown'}</div>
                        <div style={{ marginBottom: 8 }}><b>Rating:</b> <span style={{ color: modalReview.rating >= 4 ? '#4ade80' : modalReview.rating <= 2 ? '#ef4444' : '#888', fontWeight: 600 }}>{modalReview.rating}★</span></div>
                        <div style={{ marginBottom: 8 }}><b>Feedback:</b> {modalReview.feedback}</div>
                        <div style={{ marginBottom: 8 }}><b>Tags:</b> {modalReview.tags && modalReview.tags.length > 0 ? modalReview.tags.join(', ') : '-'}</div>
                        <div style={{ marginBottom: 8 }}><b>Flagged:</b> {modalReview.flagged ? 'Yes' : 'No'}</div>
                        <div style={{ marginBottom: 8 }}><b>Date:</b> {new Date(modalReview.createdAt).toLocaleString()}</div>
                      </div>
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