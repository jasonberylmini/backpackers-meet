import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getDisplayName, getDisplayInitials } from '../utils/userDisplay';
import ReviewForm from './ReviewForm';
import './ReviewsList.css';

export default function ReviewsList({ 
  reviewType, 
  tripId, 
  userId, 
  trip,
  showReviewForm = false,
  onReviewSubmitted 
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(showReviewForm);
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
      setCanReview(false);
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

        {/* Review Button */}
        {currentUser && canReview && reviewType === 'user' && userId && trip && trip.status === 'completed' && (
          // Check if current user is not trying to review themselves
          (currentUser.id !== userId && currentUser._id !== userId && currentUser.userId !== userId) && (
            <button 
              className="btn-primary write-review-btn"
              onClick={() => setShowForm(true)}
            >
              Write a Review
            </button>
          )
        )}
        {currentUser && canReview && reviewType === 'trip' && trip && trip.status === 'completed' && (
          <button 
            className="btn-primary write-review-btn"
            onClick={() => setShowForm(true)}
          >
            Write a Review
          </button>
        )}
        
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
        {currentUser && trip && trip.status !== 'completed' && (
          <div className="review-notice">
            <p>Reviews will be available after the trip is completed.</p>
          </div>
        )}
      </div>

      {/* Review Form - Only show if trip is completed */}
      {showForm && trip && trip.status === 'completed' && (
        <div className="review-form-container">
          <ReviewForm
            reviewType={reviewType}
            tripId={tripId}
            reviewedUser={userId}
            onReviewSubmitted={handleReviewSubmitted}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review._id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">
                    {review.reviewer.profileImage ? (
                      <img 
                        src={review.reviewer.profileImage} 
                        alt={getDisplayName(review.reviewer)} 
                        className="reviewer-image"
                      />
                    ) : (
                      <div className="reviewer-placeholder">
                        {getDisplayInitials(review.reviewer)}
                      </div>
                    )}
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
                {currentUser && (
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
                : 'Be the first to review this user!'
              }
            </p>
            {currentUser && !hasReviewed && reviewType === 'user' && userId && trip && trip.status === 'completed' && (
              // Check if current user is not trying to review themselves
              (currentUser.id !== userId && currentUser._id !== userId && currentUser.userId !== userId) && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  Write the First Review
                </button>
              )
            )}
            {currentUser && !hasReviewed && reviewType === 'trip' && trip && trip.status === 'completed' && (
              <button 
                className="btn-primary"
                onClick={() => setShowForm(true)}
              >
                Write the First Review
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 