import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#e9ecef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#495057'
          }}>
            {r.reviewer?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>
              {r.reviewer?.name || 'Unknown'}
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
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
                      <div style={{ fontWeight: 'bold', fontSize: 14 }}>
              {r.targetUser?.name || r.tripId?.destination || 'Unknown'}
            </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            color: getRatingColor(r.rating),
            fontSize: 16,
            fontWeight: 'bold'
          }}>
            {r.rating}★
          </span>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
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
        <div style={{ maxWidth: 200 }}>
          <div style={{ 
            fontSize: 14,
            lineHeight: 1.4,
            color: '#495057'
          }}>
            {r.feedback?.length > 80 ? 
              `${r.feedback.substring(0, 80)}...` : 
              r.feedback
            }
          </div>
          {r.tags && r.tags.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {r.tags.slice(0, 2).map(tag => (
                <span key={tag} style={{
                  backgroundColor: '#e9ecef',
                  color: '#495057',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  marginRight: 4
                }}>
                  {tag}
                </span>
              ))}
              {r.tags.length > 2 && (
                <span style={{ fontSize: 10, color: '#6c757d' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: getStatusColor(status)
            }} />
            <span style={{ 
              color: getStatusColor(status),
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase'
            }}>
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
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
            {formatReviewDate(r.createdAt)}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {new Date(r.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
  ];

  // Enhanced actions
  const enhancedActions = (review) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <button 
        onClick={() => openReviewModal(review)}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        View
      </button>
      {review.status === 'pending' && (
        <>
          <button 
            onClick={() => handleApprove(review._id)}
            style={{ 
              padding: '4px 8px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Approve
          </button>
          <button 
            onClick={() => handleReject(review._id)}
            style={{ 
              padding: '4px 8px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Reject
          </button>
        </>
      )}
      <button 
        onClick={() => handleFlag(review._id, !review.flagged)}
        style={{ 
          padding: '4px 8px',
          backgroundColor: review.flagged ? '#28a745' : '#ffc107',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        {review.flagged ? 'Unflag' : 'Flag'}
      </button>
      <button 
        onClick={() => handleDelete(review._id)}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        Delete
      </button>
    </div>
  );

  // Enhanced review modal
  const renderEnhancedReviewModal = (review) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left Column - Review Details */}
      <div>
        <h3 style={{ marginBottom: 16, color: '#495057' }}>Review Information</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Rating:</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginTop: 4,
            fontSize: 18,
            color: getRatingColor(review.rating)
          }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ color: i < review.rating ? 'currentColor' : '#e9ecef' }}>
                ★
              </span>
            ))}
            <span style={{ fontSize: 14, color: '#6c757d' }}>
              ({review.rating}/5)
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Feedback:</label>
          <div style={{ 
            marginTop: 4, 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6,
            lineHeight: 1.5,
            color: '#495057'
          }}>
            {review.feedback}
          </div>
        </div>

        {review.tags && review.tags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 'bold', color: '#495057' }}>Tags:</label>
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {review.tags.map(tag => (
                <span key={tag} style={{
                  backgroundColor: '#e9ecef',
                  color: '#495057',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Status:</label>
          <div style={{ marginTop: 4 }}>
            <span style={{
              backgroundColor: getStatusColor(getReviewStatus(review)),
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {getReviewStatus(review)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Created:</label>
          <div style={{ marginTop: 4, color: '#6c757d' }}>
            {new Date(review.createdAt).toLocaleString()}
          </div>
        </div>

        {review.updatedAt && review.updatedAt !== review.createdAt && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 'bold', color: '#495057' }}>Last Updated:</label>
            <div style={{ marginTop: 4, color: '#6c757d' }}>
              {new Date(review.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - User & Target Info */}
      <div>
        <h3 style={{ marginBottom: 16, color: '#495057' }}>User & Target Information</h3>
        
        {/* Reviewer Info */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 8, color: '#495057' }}>Reviewer</h4>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#007bff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {review.reviewer?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                  {review.reviewer?.name || 'Unknown'}
                </div>
                <div style={{ color: '#6c757d', fontSize: 14 }}>
                  {review.reviewer?.email}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              Member since: {review.reviewer?.createdAt ? 
                new Date(review.reviewer.createdAt).toLocaleDateString() : 'Unknown'
              }
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 8, color: '#495057' }}>
            {review.reviewType === 'trip' ? 'Trip' : 'User'} Being Reviewed
          </h4>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: review.reviewType === 'trip' ? '#28a745' : '#ffc107',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 12
              }}>
                {review.reviewType === 'trip' ? 'T' : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                  {review.targetUser?.name || review.tripId?.destination || 'Unknown'}
                </div>
                <div style={{ color: '#6c757d', fontSize: 14 }}>
                  {review.reviewType === 'trip' ? 'Trip' : 'User'}
                </div>
              </div>
            </div>
            {review.reviewType === 'trip' && review.tripId && (
              <div style={{ fontSize: 12, color: '#6c757d' }}>
                Created by: {review.tripId.creator?.name || 'Unknown'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12, color: '#495057' }}>Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {review.status === 'pending' && (
              <>
                <button 
                  onClick={() => handleApprove(review._id)}
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ✓ Approve Review
                </button>
                <button 
                  onClick={() => handleReject(review._id)}
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ✗ Reject Review
                </button>
              </>
            )}
            <button 
              onClick={() => handleFlag(review._id, !review.flagged)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: review.flagged ? '#28a745' : '#ffc107',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {review.flagged ? '✓ Unflag Review' : '🚩 Flag Review'}
            </button>
            <button 
              onClick={() => sendReviewNotification(review._id, 'Your review has been reviewed by an admin.')}
              style={{ 
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              📧 Send Message
            </button>
            <button 
              onClick={() => handleDelete(review._id)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
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
      <h1>Review Moderation</h1>
      
      {/* Review Statistics Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#007bff', 
          color: 'white', 
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {reviewStats.totalReviews || 0}
          </div>
          <div style={{ fontSize: 14 }}>Total Reviews</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#ffc107', 
          color: 'white', 
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {reviewStats.pendingReviews || 0}
          </div>
          <div style={{ fontSize: 14 }}>Pending Review</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#28a745', 
          color: 'white', 
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {reviewStats.approvedReviews || 0}
          </div>
          <div style={{ fontSize: 14 }}>Approved</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#ff6b6b', 
          color: 'white', 
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {reviewStats.flaggedReviews || 0}
          </div>
          <div style={{ fontSize: 14 }}>Flagged</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#6f42c1', 
          color: 'white', 
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {reviewStats.reviewsToday || 0}
          </div>
          <div style={{ fontSize: 14 }}>Today</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#fd7e14', 
          color: 'white', 
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {reviewStats.avgRating ? reviewStats.avgRating.toFixed(1) : '0.0'}
          </div>
          <div style={{ fontSize: 14 }}>Avg Rating</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input 
          type="text" 
          placeholder="Search feedback, reviewer, or target..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9', 
            minWidth: 250,
            fontSize: 14
          }}
        />
        <select 
          value={typeFilter} 
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Types</option>
          <option value="user">User Reviews</option>
          <option value="trip">Trip Reviews</option>
        </select>
        <select 
          value={ratingFilter} 
          onChange={e => { setRatingFilter(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
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
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
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
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedReviews.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 16, 
          padding: 16, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8,
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 'bold' }}>
            {selectedReviews.length} review(s) selected
          </span>
          <select 
            value={bulkAction} 
            onChange={e => setBulkAction(e.target.value)}
            style={{ 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #e1e5e9',
              fontSize: 14
            }}
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
            style={{ 
              padding: '8px 16px',
              backgroundColor: bulkAction ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: bulkAction ? 'pointer' : 'not-allowed',
              fontSize: 14
            }}
          >
            Apply
          </button>
          <button 
            onClick={() => setSelectedReviews([])}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Connection Status */}
      <div style={{ 
        marginBottom: 16, 
        padding: 8, 
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da', 
        color: isConnected ? '#155724' : '#721c24',
        borderRadius: 4,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: isConnected ? '#28a745' : '#dc3545'
        }} />
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
    </AdminLayout>
  );
} 