import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';
import '../pages/AdminReviews.css';

// Helper functions
const getReviewStatus = (review) => {
  if (review.flagged) return 'flagged';
  if (review.status === 'pending') return 'pending';
  if (review.status === 'approved') return 'approved';
  if (review.status === 'rejected') return 'rejected';
  return 'active';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'flagged': return '#ff6b6b';
    case 'pending': return '#ffd93d';
    case 'approved': return '#6bcf7f';
    case 'rejected': return '#ff8e8e';
    default: return '#4dabf7';
  }
};

const getRatingColor = (rating) => {
  if (rating >= 4) return '#6bcf7f';
  if (rating >= 3) return '#ffd93d';
  return '#ff6b6b';
};

const formatReviewDate = (date) => {
  const reviewDate = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - reviewDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  return reviewDate.toLocaleDateString();
};

const filterByDateRange = (review, filter) => {
  if (!filter) return true;
  
  const reviewDate = new Date(review.createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  switch (filter) {
    case 'today':
      return reviewDate >= today;
    case 'week':
      return reviewDate >= weekAgo;
    case 'month':
      return reviewDate >= monthAgo;
    case 'upcoming':
      return reviewDate > now;
    case 'past':
      return reviewDate < today;
    default:
      return true;
  }
};

const filterByRating = (review, filter) => {
  if (!filter) return true;
  return review.rating === parseInt(filter);
};

const filterByStatus = (review, filter) => {
  if (!filter) return true;
  const status = getReviewStatus(review);
  return status === filter;
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReview, setModalReview] = useState(null);
  
  // Bulk operations
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  
  // Real-time updates
  const { isConnected, liveReviews } = useAdminRealtime();

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = { page, limit };
      
      if (typeFilter) params.type = typeFilter;
      if (ratingFilter) params.rating = ratingFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      
      const res = await axios.get('/api/reviews/all', { headers, params });
      setReviews(res.data.reviews);
      setLoading(false);
    } catch (err) {
      setError('Failed to load reviews.');
      setLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/review-stats', { headers });
      setReviewStats(res.data);
    } catch (err) {
      console.error('Failed to load review stats:', err);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchReviewStats();
  }, [page, typeFilter, ratingFilter, statusFilter, search]);

  // Real-time updates
  useEffect(() => {
    if (liveReviews.length > 0) {
      setReviews(prev => {
        const newReviews = [...prev];
        liveReviews.forEach(newReview => {
          const existingIndex = newReviews.findIndex(r => r._id === newReview._id);
          if (existingIndex >= 0) {
            newReviews[existingIndex] = newReview;
          } else {
            newReviews.unshift(newReview);
          }
        });
        return newReviews.slice(0, limit);
      });
      fetchReviewStats();
    }
  }, [liveReviews]);

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = !search || 
      review.feedback?.toLowerCase().includes(search.toLowerCase()) ||
      review.reviewer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (review.targetUser?.name || review.tripId?.destination)?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = !typeFilter || review.reviewType === typeFilter;
    const matchesRating = filterByRating(review, ratingFilter);
    const matchesStatus = filterByStatus(review, statusFilter);
    const matchesDate = filterByDateRange(review, dateFilter);
    
    return matchesSearch && matchesType && matchesRating && matchesStatus && matchesDate;
  });

  // Bulk operations
  const handleBulkAction = async () => {
    if (!bulkAction || selectedReviews.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('/api/admin/bulk-reviews', {
        reviewIds: selectedReviews,
        action: bulkAction
      }, { headers });
      
      toast.success(`${selectedReviews.length} reviews ${bulkAction}ed!`);
      setSelectedReviews([]);
      setBulkAction('');
      fetchReviews();
      fetchReviewStats();
    } catch (err) {
      toast.error('Failed to perform bulk action.');
    }
  };

  // Individual actions
  const handleApprove = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/reviews/${reviewId}/approve`, {}, { headers });
      toast.success('Review approved!');
      fetchReviews();
      fetchReviewStats();
    } catch (err) {
      toast.error('Failed to approve review.');
    }
  };

  const handleReject = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/reviews/${reviewId}/reject`, {}, { headers });
      toast.success('Review rejected!');
      fetchReviews();
      fetchReviewStats();
    } catch (err) {
      toast.error('Failed to reject review.');
    }
  };

  const handleFlag = async (reviewId, flag) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/reviews/${reviewId}/${flag ? 'flag' : 'unflag'}`, {}, { headers });
      toast.success(flag ? 'Review flagged!' : 'Review unflagged!');
      fetchReviews();
      fetchReviewStats();
    } catch (err) {
      toast.error('Failed to update review flag status.');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/reviews/${reviewId}`, { headers });
      toast.success('Review deleted!');
      fetchReviews();
      fetchReviewStats();
    } catch (err) {
      toast.error('Failed to delete review.');
    }
  };

  const sendReviewNotification = async (reviewId, message) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/admin/notifications/send', {
        userId: reviews.find(r => r._id === reviewId)?.reviewer?._id,
        title: 'Review Notification',
        message,
        type: 'review'
      }, { headers });
      toast.success('Notification sent!');
    } catch (err) {
      toast.error('Failed to send notification.');
    }
  };

  // Modal functions
  const openReviewModal = (review) => {
    setModalReview(review);
    setModalOpen(true);
  };

  const closeReviewModal = () => {
    setModalOpen(false);
    setModalReview(null);
  };

  // Enhanced columns
  const enhancedColumns = [
    { 
      key: 'reviewer', 
      label: 'Reviewer', 
      sortable: true, 
      render: r => (
        <div className="admin-reviews-table-user">
          <div className="admin-reviews-table-avatar">
            {r.reviewer?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="admin-reviews-table-name">
              {r.reviewer?.name || 'Unknown'}
            </div>
            <div className="admin-reviews-table-email">
              {r.reviewer?.email}
            </div>
          </div>
        </div>
      )
    },
    { 
      key: 'target', 
      label: 'Target', 
      sortable: true, 
      render: r => (
        <div>
          <div className="admin-reviews-table-target">
            {r.targetUser?.name || r.tripId?.destination || 'Unknown'}
          </div>
          <div className="admin-reviews-table-type">
            {r.reviewType === 'trip' ? 'Trip Review' : 'User Review'}
          </div>
        </div>
      )
    },
    { 
      key: 'rating', 
      label: 'Rating', 
      sortable: true, 
      render: r => (
        <div className="admin-reviews-table-rating" style={{ color: getRatingColor(r.rating) }}>
          <span>{r.rating}★</span>
          <div className="admin-reviews-table-rating-text">
            {r.rating >= 4 ? 'Positive' : r.rating >= 3 ? 'Neutral' : 'Negative'}
          </div>
        </div>
      )
    },
    { 
      key: 'feedback', 
      label: 'Feedback', 
      sortable: false, 
      render: r => (
        <div className="admin-reviews-table-feedback">
          <div>
            {r.feedback?.length > 80 ? 
              `${r.feedback.substring(0, 80)}...` : 
              r.feedback
            }
          </div>
          {r.tags && r.tags.length > 0 && (
            <div className="admin-reviews-table-tags">
              {r.tags.slice(0, 2).map(tag => (
                <span key={tag} className="admin-reviews-table-tag">
                  {tag}
                </span>
              ))}
              {r.tags.length > 2 && (
                <span className="admin-reviews-table-tag-more">
                  +{r.tags.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true, 
      render: r => {
        const status = getReviewStatus(r);
        return (
          <div className="admin-reviews-table-status">
            <div 
              className="admin-reviews-table-status-indicator"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span 
              className="admin-reviews-table-status-text"
              style={{ color: getStatusColor(status) }}
            >
              {status}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'createdAt', 
      label: 'Date', 
      sortable: true, 
      render: r => (
        <div>
          <div className="admin-reviews-table-date">
            {formatReviewDate(r.createdAt)}
          </div>
          <div className="admin-reviews-table-date-full">
            {new Date(r.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
  ];

  // Enhanced actions
  const enhancedActions = (review) => (
    <div className="admin-reviews-table-actions">
      <button 
        onClick={() => openReviewModal(review)}
        className="admin-reviews-table-btn view"
      >
        View
      </button>
      {review.status === 'pending' && (
        <>
          <button 
            onClick={() => handleApprove(review._id)}
            className="admin-reviews-table-btn approve"
          >
            Approve
          </button>
          <button 
            onClick={() => handleReject(review._id)}
            className="admin-reviews-table-btn reject"
          >
            Reject
          </button>
        </>
      )}
      <button 
        onClick={() => handleFlag(review._id, !review.flagged)}
        className={`admin-reviews-table-btn ${review.flagged ? 'unflag' : 'flag'}`}
      >
        {review.flagged ? 'Unflag' : 'Flag'}
      </button>
      <button 
        onClick={() => handleDelete(review._id)}
        className="admin-reviews-table-btn delete"
      >
        Delete
      </button>
    </div>
  );

  // Enhanced review modal
  const renderEnhancedReviewModal = (review) => (
    <div className="admin-reviews-modal">
      {/* Left Column - Review Details */}
      <div className="admin-reviews-modal-section">
        <h3>Review Information</h3>
        
        <div className="admin-reviews-modal-section">
          <label className="admin-reviews-modal-label">Rating:</label>
          <div className="admin-reviews-rating" style={{ color: getRatingColor(review.rating) }}>
            <div className="admin-reviews-rating-stars">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`admin-reviews-rating-star ${i < review.rating ? 'filled' : ''}`}>
                  ★
                </span>
              ))}
            </div>
            <span className="admin-reviews-rating-text">
              ({review.rating}/5)
            </span>
          </div>
        </div>

        <div className="admin-reviews-modal-section">
          <label className="admin-reviews-modal-label">Feedback:</label>
          <div className="admin-reviews-modal-content">
            {review.feedback}
          </div>
        </div>

        {review.tags && review.tags.length > 0 && (
          <div className="admin-reviews-modal-section">
            <label className="admin-reviews-modal-label">Tags:</label>
            <div className="admin-reviews-tags">
              {review.tags.map(tag => (
                <span key={tag} className="admin-reviews-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="admin-reviews-modal-section">
          <label className="admin-reviews-modal-label">Status:</label>
          <div className="admin-reviews-status-badge" style={{ backgroundColor: getStatusColor(getReviewStatus(review)) }}>
            <div className="admin-reviews-status-indicator" style={{ backgroundColor: getStatusColor(getReviewStatus(review)) }} />
            {getReviewStatus(review)}
          </div>
        </div>

        <div className="admin-reviews-modal-section">
          <label className="admin-reviews-modal-label">Created:</label>
          <div className="admin-reviews-modal-content">
            {new Date(review.createdAt).toLocaleString()}
          </div>
        </div>

        {review.updatedAt && review.updatedAt !== review.createdAt && (
          <div className="admin-reviews-modal-section">
            <label className="admin-reviews-modal-label">Last Updated:</label>
            <div className="admin-reviews-modal-content">
              {new Date(review.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - User & Target Info */}
      <div className="admin-reviews-modal-section">
        <h3>User & Target Information</h3>
        
        {/* Reviewer Info */}
        <div className="admin-reviews-modal-section">
          <h4>Reviewer</h4>
          <div className="admin-reviews-modal-user-card">
            <div className="admin-reviews-modal-user-info">
              <div className="admin-reviews-modal-avatar reviewer">
                {review.reviewer?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="admin-reviews-modal-user-name">
                  {review.reviewer?.name || 'Unknown'}
                </div>
                <div className="admin-reviews-modal-user-email">
                  {review.reviewer?.email}
                </div>
              </div>
            </div>
            <div className="admin-reviews-modal-user-meta">
              Member since: {review.reviewer?.createdAt ? 
                new Date(review.reviewer.createdAt).toLocaleDateString() : 'Unknown'
              }
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div className="admin-reviews-modal-section">
          <h4>
            {review.reviewType === 'trip' ? 'Trip' : 'User'} Being Reviewed
          </h4>
          <div className="admin-reviews-modal-user-card">
            <div className="admin-reviews-modal-user-info">
              <div className={`admin-reviews-modal-avatar ${review.reviewType === 'trip' ? 'trip' : 'user'}`}>
                {review.reviewType === 'trip' ? 'T' : 'U'}
              </div>
              <div>
                <div className="admin-reviews-modal-user-name">
                  {review.targetUser?.name || review.tripId?.destination || 'Unknown'}
                </div>
                <div className="admin-reviews-modal-user-email">
                  {review.reviewType === 'trip' ? 'Trip' : 'User'}
                </div>
              </div>
            </div>
            {review.reviewType === 'trip' && review.tripId && (
              <div className="admin-reviews-modal-user-meta">
                Created by: {review.tripId.creator?.name || 'Unknown'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="admin-reviews-modal-actions">
          <h4>Actions</h4>
          <div className="admin-reviews-modal-actions-grid">
            {review.status === 'pending' && (
              <>
                <button 
                  onClick={() => handleApprove(review._id)}
                  className="admin-reviews-modal-btn approve"
                >
                  ✓ Approve Review
                </button>
                <button 
                  onClick={() => handleReject(review._id)}
                  className="admin-reviews-modal-btn reject"
                >
                  ✗ Reject Review
                </button>
              </>
            )}
            <button 
              onClick={() => handleFlag(review._id, !review.flagged)}
              className={`admin-reviews-modal-btn ${review.flagged ? 'unflag' : 'flag'}`}
            >
              {review.flagged ? '✓ Unflag Review' : '🚩 Flag Review'}
            </button>
            <button 
              onClick={() => sendReviewNotification(review._id, 'Your review has been reviewed by an admin.')}
              className="admin-reviews-modal-btn message"
            >
              📧 Send Message
            </button>
            <button 
              onClick={() => handleDelete(review._id)}
              className="admin-reviews-modal-btn delete"
            >
              🗑️ Delete Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const pageCount = Math.ceil(filteredReviews.length / limit);

  return (
    <AdminLayout>
      <div className="admin-reviews-container">
        <div className="admin-reviews-header">
          <h1>Review Moderation</h1>
        </div>
        
        {/* Review Statistics Dashboard */}
        <div className="admin-reviews-stats">
          <div className="admin-reviews-stat-card total">
            <div className="admin-reviews-stat-value">
              {reviewStats.totalReviews || 0}
            </div>
            <div className="admin-reviews-stat-label">Total Reviews</div>
          </div>
          <div className="admin-reviews-stat-card pending">
            <div className="admin-reviews-stat-value">
              {reviewStats.pendingReviews || 0}
            </div>
            <div className="admin-reviews-stat-label">Pending Review</div>
          </div>
          <div className="admin-reviews-stat-card approved">
            <div className="admin-reviews-stat-value">
              {reviewStats.approvedReviews || 0}
            </div>
            <div className="admin-reviews-stat-label">Approved</div>
          </div>
          <div className="admin-reviews-stat-card flagged">
            <div className="admin-reviews-stat-value">
              {reviewStats.flaggedReviews || 0}
            </div>
            <div className="admin-reviews-stat-label">Flagged</div>
          </div>
          <div className="admin-reviews-stat-card today">
            <div className="admin-reviews-stat-value">
              {reviewStats.reviewsToday || 0}
            </div>
            <div className="admin-reviews-stat-label">Today</div>
          </div>
          <div className="admin-reviews-stat-card avg-rating">
            <div className="admin-reviews-stat-value">
              {reviewStats.avgRating ? reviewStats.avgRating.toFixed(1) : '0.0'}
            </div>
            <div className="admin-reviews-stat-label">Avg Rating</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="admin-reviews-filters">
          <input 
            type="text" 
            placeholder="Search feedback, reviewer, or target..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="admin-reviews-search"
          />
          <select 
            value={typeFilter} 
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }} 
            className="admin-reviews-filter-select"
          >
            <option value="">All Types</option>
            <option value="user">User Reviews</option>
            <option value="trip">Trip Reviews</option>
          </select>
          <select 
            value={ratingFilter} 
            onChange={e => { setRatingFilter(e.target.value); setPage(1); }} 
            className="admin-reviews-filter-select"
          >
            <option value="">All Ratings</option>
            <option value="5">5★ Excellent</option>
            <option value="4">4★ Good</option>
            <option value="3">3★ Average</option>
            <option value="2">2★ Poor</option>
            <option value="1">1★ Very Poor</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
            className="admin-reviews-filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="flagged">Flagged</option>
          </select>
          <select 
            value={dateFilter} 
            onChange={e => { setDateFilter(e.target.value); setPage(1); }} 
            className="admin-reviews-filter-select"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedReviews.length > 0 && (
          <div className="admin-reviews-bulk-actions">
            <span className="admin-reviews-bulk-text">
              {selectedReviews.length} review(s) selected
            </span>
            <select 
              value={bulkAction} 
              onChange={e => setBulkAction(e.target.value)}
              className="admin-reviews-bulk-select"
            >
              <option value="">Select Action</option>
              <option value="approve">Approve Selected</option>
              <option value="reject">Reject Selected</option>
              <option value="flag">Flag Selected</option>
              <option value="unflag">Unflag Selected</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button 
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className={`admin-reviews-bulk-btn apply ${!bulkAction ? 'disabled' : ''}`}
            >
              Apply
            </button>
            <button 
              onClick={() => setSelectedReviews([])}
              className="admin-reviews-bulk-btn clear"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Connection Status */}
        <div className={`admin-reviews-connection ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="admin-reviews-connection-indicator" />
          {isConnected ? 'Live updates active' : 'Offline mode'}
        </div>

        <AdminTable
          columns={enhancedColumns}
          data={filteredReviews}
          loading={loading}
          error={error}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          onSort={() => {}}
          sortKey={''}
          sortDirection={'asc'}
          actions={enhancedActions}
          emptyMessage="No reviews found."
          selectable={true}
          selectedItems={selectedReviews}
          onSelectionChange={setSelectedReviews}
        />

        {/* Enhanced Review Details Modal */}
        <AdminModal open={modalOpen} onClose={closeReviewModal} title={`Review Details - ${modalReview?.reviewer?.name}`}>
          {modalReview && renderEnhancedReviewModal(modalReview)}
        </AdminModal>
      </div>
    </AdminLayout>
  );
} 