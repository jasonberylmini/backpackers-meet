import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getDisplayName, getDisplayInitials } from '../utils/userDisplay';
import { isTripCompleted } from '../utils/tripStatus';

import './ReviewsList.css';

export default function ReviewsList({ 
  reviewType, 
  tripId, 
  userId, 
  trip,
  showReviewForm = false,
  onReviewSubmitted,
  showMemberReviewButton = false,
  onReviewButtonClick = null,
  onEditReview = null
}) {
  console.log('ReviewsList render:', { reviewType, tripId, userId, trip, showReviewForm, showMemberReviewButton });
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewPermissions, setReviewPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);


  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchReviews();
    checkReviewPermissions();
  }, [reviewType, tripId, userId, trip]);



  const checkReviewPermissions = async () => {
    if (!currentUser) return;
    
    // For user reviews on profile pages, we need to check permissions even without tripId
    if (reviewType === 'user' && !tripId && userId) {
      // Check if current user is trying to review themselves
      const isSelfReview = currentUser.id === userId || currentUser._id === userId || currentUser.userId === userId;
      if (isSelfReview) {
        setCanReview(false);
        setReviewPermissions({
          canReview: false,
          reason: 'You cannot review yourself.'
        });
        return;
      }
    }
    
    // For trip reviews, we need tripId
    if (reviewType === 'trip' && !tripId) return;
    
    try {
      setPermissionsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = new URLSearchParams({
        reviewType,
        ...(tripId && { tripId }),
        ...(reviewType === 'user' && userId && { reviewedUser: userId })
      });
      
      const response = await axios.get(`/api/reviews/permissions?${params}`, { headers });
      setReviewPermissions(response.data);
      setCanReview(response.data.canReview);
    } catch (error) {
      console.error('Failed to check review permissions:', error);
      // Set default permissions instead of failing
      setCanReview(reviewType === 'trip' ? isTripCompleted(trip) : true);
      setReviewPermissions({
        canReview: reviewType === 'trip' ? isTripCompleted(trip) : true,
        reason: 'Using default permissions due to API error.'
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let endpoint = '';
      if (reviewType === 'trip' && tripId) {
        endpoint = `/api/reviews/trip/${tripId}`;
      } else if (reviewType === 'user' && userId) {
        endpoint = `/api/reviews/user/${userId}`;
      } else {
        setLoading(false);
        return;
      }

      const response = await axios.get(endpoint, { headers });
      console.log('Reviews data:', response.data);
      setReviews(response.data);
      
      // Check if current user has already reviewed
      if (currentUser) {
        const userReview = response.data.find(
          review => review.reviewer._id === currentUser.id || 
                   review.reviewer._id === currentUser._id ||
                   review.reviewer._id === currentUser.userId
        );
        setHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = (newReview) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    setHasReviewed(true);
    setShowForm(false);
    if (onReviewSubmitted) {
      onReviewSubmitted(newReview);
    }
  };

  const handleFlagReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/reviews/${reviewId}/flag`, {
        reason: 'inappropriate',
        details: 'Flagged by user'
      }, { headers });
      
      toast.success('Review flagged for moderation');
    } catch (error) {
      console.error('Failed to flag review:', error);
      toast.error('Failed to flag review');
    }
  };

  const handleEditReview = (review) => {
    if (onEditReview) {
      onEditReview(review);
    } else {
      // Fallback to local state if no callback provided
      setEditingReview(review);
      setShowForm(true);
    }
  };



  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/reviews/${reviewId}`, { headers });
      toast.success('Review deleted successfully');
      fetchReviews(); // Refresh the reviews list
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error(error.response?.data?.message || 'Failed to delete review');
    }
  };

  const isReviewOwner = (review) => {
    if (!currentUser || !review || !review.reviewer) return false;
    
    // Get current user ID (handle different possible field names)
    const currentUserId = currentUser.id || currentUser._id || currentUser.userId;
    
    // Get reviewer ID (handle different possible field names)
    const reviewerId = review.reviewer._id || review.reviewer.id;
    
    console.log('Checking review ownership:', {
      currentUserId,
      reviewerId,
      currentUser,
      reviewer: review.reviewer
    });
    
    return currentUserId === reviewerId;
  };

  const handleProfileClick = (reviewerId) => {
    navigate(`/profile/${reviewerId}`);
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    return distribution;
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span 
        key={i} 
        className={`star ${i < rating ? 'filled' : ''}`}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="reviews-container">
        <div className="loading-reviews">
          <div className="loading-spinner"></div>
          <p>Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-container">
      {/* Reviews Header */}
      <div className="reviews-header">
        <div className="reviews-summary">
          <div className="average-rating">
            <div className="rating-number">{getAverageRating()}</div>
            <div className="rating-stars">
              {renderStars(Math.round(getAverageRating()))}
            </div>
            <div className="total-reviews">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </div>
          </div>
          
          {reviews.length > 0 && (
            <div className="rating-distribution">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = getRatingDistribution()[rating];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="rating-bar">
                    <span className="rating-label">{rating}★</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="rating-count">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        

        

        
        {/* Show detailed feedback about review restrictions */}
        {currentUser && !canReview && reviewPermissions && (
          <div className="review-restrictions">
            <div className="restriction-notice">
              <i className="icon-info"></i>
              <div className="restriction-details">
                <h4>Review Restrictions</h4>
                <p>{reviewPermissions.reason}</p>
                {reviewPermissions.tripStatus && (
                  <p className="trip-status">
                    Trip Status: <span className={`status-${reviewPermissions.tripStatus}`}>
                      {reviewPermissions.tripStatus}
                    </span>
                  </p>
                )}
                {!reviewPermissions.isTripMember && (
                  <p className="membership-notice">
                    You must be a trip member to submit reviews.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show loading state for permissions */}
        {currentUser && permissionsLoading && (
          <div className="review-permissions-loading">
            <div className="loading-spinner"></div>
            <p>Checking review permissions...</p>
          </div>
        )}
        
        {/* Show message if trip is not completed */}
        {currentUser && trip && !isTripCompleted(trip) && (
          <div className="review-notice">
            <p>Reviews will be available after the trip is completed.</p>
          </div>
        )}
      </div>



      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review._id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info" 
                     style={{ cursor: 'pointer' }}
                     onClick={() => handleProfileClick(review.reviewer._id || review.reviewer.id)}
                     title="Click to view profile">
                  <div className="reviewer-avatar">
                    {review.reviewer.profileImage ? (
                      <img 
                        src={review.reviewer.profileImage.startsWith('http') 
                          ? review.reviewer.profileImage 
                          : `http://localhost:5000/uploads/${review.reviewer.profileImage}`
                        } 
                        alt={getDisplayName(review.reviewer)} 
                        className="reviewer-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="reviewer-placeholder" style={{ 
                      display: review.reviewer.profileImage ? 'none' : 'flex' 
                    }}>
                      {getDisplayInitials(review.reviewer)}
                    </div>
                  </div>
                  <div className="reviewer-details">
                    <div className="reviewer-name">
                      {getDisplayName(review.reviewer)}
                    </div>
                    <div className="review-date">
                      {formatDate(review.createdAt)}
                    </div>

                  </div>
                </div>
                
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
              </div>

              <div className="review-content">
                <p className="review-feedback">{review.feedback}</p>
                
                {review.tags && review.tags.length > 0 && (
                  <div className="review-tags">
                    {review.tags.map(tag => (
                      <span key={tag} className="review-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="review-actions">
                {currentUser && isReviewOwner(review) && (
                  <div className="owner-actions">
                    <button 
                      className="edit-review-btn"
                      onClick={() => handleEditReview(review)}
                      title="Edit your review"
                    >
                      <i className="icon-edit"></i>
                      Edit
                    </button>
                    <button 
                      className="delete-review-btn"
                      onClick={() => handleDeleteReview(review._id)}
                      title="Delete your review"
                    >
                      <i className="icon-delete"></i>
                      Delete
                    </button>
                  </div>
                )}
                {currentUser && !isReviewOwner(review) && (
                  <button 
                    className="flag-review-btn"
                    onClick={() => handleFlagReview(review._id)}
                    title="Flag inappropriate review"
                  >
                    <i className="icon-flag"></i>
                    Flag
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-reviews">
            <div className="no-reviews-icon">
              <i className="icon-reviews"></i>
            </div>
            <h3>No reviews yet</h3>
            <p>
              {reviewType === 'trip' 
                ? 'Be the first to review this trip!' 
                : 'Reviews appear here when other travelers review you after completing trips together.'
              }
            </p>

          </div>
        )}
      </div>
      
      {/* Review Button - Single button at the bottom for all cases */}
      {currentUser && (
        (reviewType === 'trip' && trip) || 
        (reviewType === 'user' && userId && trip && 
         currentUser.id !== userId && currentUser._id !== userId && currentUser.userId !== userId)
      ) && (
        <div style={{ marginTop: '24px', marginBottom: '16px', textAlign: 'center' }}>
                      <button 
              className="btn-primary"
              onClick={() => {
                if (onReviewButtonClick) {
                  onReviewButtonClick(userId);
                } else {
                  setShowForm(true);
                }
              }}
            style={{ 
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              minWidth: '160px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
            }}
          >
            Write a Review
          </button>
        </div>
      )}
    </div>
  );
} 