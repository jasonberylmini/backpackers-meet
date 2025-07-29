import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import '../pages/AdminDashboard.css';

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
  }, [page, type, rating, flagged, search]);

  // Statistics
  const positive = reviews.filter(r => r.rating >= 4);
  const negative = reviews.filter(r => r.rating <= 2);
  const flaggedCount = reviews.filter(r => r.flagged).length;

  // Actions
  const handleFlag = async (reviewId, flag) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/reviews/${reviewId}/${flag ? 'flag' : 'unflag'}`, {}, { headers });
      toast.success(flag ? 'Review flagged!' : 'Review unflagged!');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to update review flag status.');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/reviews/${reviewId}`, { headers });
      toast.success('Review deleted!');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to delete review.');
    }
  };

  const openReviewModal = (review) => {
    setModalReview(review);
    setModalOpen(true);
  };

  const closeReviewModal = () => {
    setModalOpen(false);
    setModalReview(null);
  };

  const columns = [
    { key: 'reviewer', label: 'Reviewer', sortable: true, render: r => r.reviewer?.name || 'Unknown' },
    { key: 'target', label: 'Target', sortable: true, render: r => r.targetUser?.name || r.targetTrip?.destination || 'Unknown' },
    { key: 'rating', label: 'Rating', sortable: true, render: r => `${r.rating}★` },
    { key: 'feedback', label: 'Feedback', sortable: false, render: r => r.feedback?.substring(0, 50) + (r.feedback?.length > 50 ? '...' : '') },
    { key: 'flagged', label: 'Status', sortable: true, render: r => r.flagged ? '🚩 Flagged' : '✅ Active' },
    { key: 'createdAt', label: 'Date', sortable: true, render: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  const actions = (review) => (
    <>
      <button onClick={() => openReviewModal(review)} style={{ marginRight: 8 }}>View</button>
      <button 
        onClick={() => handleFlag(review._id, !review.flagged)} 
        style={{ 
          marginRight: 8, 
          backgroundColor: review.flagged ? '#28a745' : '#ffc107', 
          color: 'white', 
          border: 'none', 
          padding: '4px 8px', 
          borderRadius: 4 
        }}
      >
        {review.flagged ? 'Unflag' : 'Flag'}
      </button>
      <button 
        onClick={() => handleDelete(review._id)} 
        style={{ 
          backgroundColor: '#d32f2f', 
          color: 'white', 
          border: 'none', 
          padding: '4px 8px', 
          borderRadius: 4 
        }}
      >
        Delete
      </button>
    </>
  );

  const pageCount = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <h1>Review Moderation</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search feedback/tags" 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9', minWidth: 200 }}
        />
        <select 
          value={type} 
          onChange={e => { setType(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}
        >
          <option value="">All Types</option>
          <option value="user">User</option>
          <option value="trip">Trip</option>
        </select>
        <select 
          value={rating} 
          onChange={e => { setRating(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}
        >
          <option value="">All Ratings</option>
          <option value="5">5★</option>
          <option value="4">4★</option>
          <option value="3">3★</option>
          <option value="2">2★</option>
          <option value="1">1★</option>
        </select>
        <select 
          value={flagged} 
          onChange={e => { setFlagged(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}
        >
          <option value="">All</option>
          <option value="true">Flagged</option>
          <option value="false">Not Flagged</option>
        </select>
      </div>
      <div style={{ marginBottom: 24, fontSize: 15, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
        <b>Total:</b> {total} &nbsp;|&nbsp; 
        <span style={{ color: '#28a745' }}>+{positive.length}</span> / 
        <span style={{ color: '#d32f2f' }}>-{negative.length}</span> &nbsp;|&nbsp; 
        <span style={{ color: '#ffc107' }}>🚩 Flagged: {flaggedCount}</span>
      </div>
      <AdminTable
        columns={columns}
        data={reviews}
        loading={loading}
        error={error}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onSort={() => {}}
        sortKey={''}
        sortDirection={'asc'}
        actions={actions}
        emptyMessage="No reviews found."
      />
      <AdminModal open={modalOpen} onClose={closeReviewModal} title={`Review Details - ${modalReview?.reviewer?.name}`}>
        {modalReview && (
          <div>
            <div><b>Reviewer:</b> {modalReview.reviewer?.name} ({modalReview.reviewer?.email})</div>
            <div><b>Target:</b> {modalReview.targetUser?.name || modalReview.targetTrip?.destination}</div>
            <div><b>Rating:</b> {modalReview.rating}★</div>
            <div><b>Feedback:</b> {modalReview.feedback}</div>
            {modalReview.tags && modalReview.tags.length > 0 && (
              <div><b>Tags:</b> {modalReview.tags.join(', ')}</div>
            )}
            <div><b>Status:</b> {modalReview.flagged ? '🚩 Flagged' : '✅ Active'}</div>
            <div><b>Date:</b> {new Date(modalReview.createdAt).toLocaleString()}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button 
                onClick={() => handleFlag(modalReview._id, !modalReview.flagged)} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: modalReview.flagged ? '#28a745' : '#ffc107', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4 
                }}
              >
                {modalReview.flagged ? 'Unflag Review' : 'Flag Review'}
              </button>
              <button 
                onClick={() => handleDelete(modalReview._id)} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#d32f2f', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4 
                }}
              >
                Delete Review
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 