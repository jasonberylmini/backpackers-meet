import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ReviewForm.css';

export default function ReviewForm({ 
  reviewType, 
  tripId, 
  reviewedUser, 
  onReviewSubmitted, 
  onCancel,
  editingReview = null,
  onReviewUpdated = null
}) {
  const [rating, setRating] = useState(editingReview ? editingReview.rating : 0);
  const [feedback, setFeedback] = useState(editingReview ? editingReview.feedback : '');
  const [tags, setTags] = useState(editingReview ? editingReview.tags || [] : []);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(tripId);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const availableTags = [
    'Great Communication', 'Reliable', 'Fun', 'Organized', 
    'Punctual', 'Helpful', 'Friendly', 'Adventurous',
    'Responsible', 'Flexible', 'Knowledgeable', 'Safe Driver'
  ];

  useEffect(() => {
    if (reviewType === 'user' && !tripId && reviewedUser) {
      fetchAvailableTrips();
    }
  }, [reviewType, tripId, reviewedUser]);

  // Update form state when editingReview changes
  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating);
      setFeedback(editingReview.feedback);
      setTags(editingReview.tags || []);
    } else {
      setRating(0);
      setFeedback('');
      setTags([]);
    }
  }, [editingReview]);

  // Debug: Log current form state
  useEffect(() => {
    console.log('ReviewForm state:', {
      rating,
      feedback: feedback.trim(),
      feedbackLength: feedback.trim().length,
      reviewType,
      editingReview: editingReview ? 'yes' : 'no',
      buttonDisabled: rating === 0 || feedback.trim().length < 10
    });
  }, [rating, feedback, reviewType, editingReview]);

  const fetchAvailableTrips = async () => {
    try {
      setLoadingTrips(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`/api/trips/completed-with-user/${reviewedUser}`, { headers });
      setAvailableTrips(response.data);
    } catch (error) {
      console.error('Failed to fetch available trips:', error);
      toast.error('Failed to load available trips');
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleTagToggle = (tag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Submit button clicked!');
    console.log('Form data:', {
      rating,
      feedback: feedback.trim(),
      feedbackLength: feedback.trim().length,
      reviewType,
      tripId: selectedTripId,
      reviewedUser
    });
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (feedback.trim().length < 10) {
      toast.error('Please provide at least 10 characters of feedback');
      return;
    }

    if (reviewType === 'user' && !selectedTripId) {
      toast.error('Please select a trip to review');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const reviewData = {
        reviewType,
        tripId: editingReview ? editingReview.tripId : selectedTripId,
        rating,
        feedback: feedback.trim(),
        tags
      };

      if (reviewType === 'user' && reviewedUser) {
        reviewData.reviewedUser = reviewedUser;
      }

      let response;
      
      if (editingReview) {
        // Update existing review
        console.log('Updating review data:', reviewData);
        console.log('Making PUT request to:', `/api/reviews/${editingReview._id}`);
        console.log('Headers:', headers);
        
        response = await axios.put(`/api/reviews/${editingReview._id}`, reviewData, { headers });
        
        console.log('Review update successful:', response.data);
        
        if (onReviewUpdated) {
          onReviewUpdated(response.data.review);
        }
      } else {
        // Create new review
        console.log('Submitting review data:', reviewData);
        console.log('Making POST request to:', '/api/reviews/submit');
        console.log('Headers:', headers);
        
        response = await axios.post('/api/reviews/submit', reviewData, { headers });
        
        console.log('Review submission successful:', response.data);
        
        if (onReviewSubmitted) {
          onReviewSubmitted(response.data.review);
        }
      }
    } catch (error) {
      console.error('Review submission error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      if (error.response?.status === 403) {
        toast.error(`Access denied: ${error.response.data.message}`);
      } else if (error.response?.status === 400) {
        toast.error(`Invalid request: ${error.response.data.message}`);
      } else if (error.response?.status === 409) {
        toast.error(`Already reviewed: ${error.response.data.message}`);
      } else if (error.response?.status === 404) {
        toast.error(`Not found: ${error.response.data.message}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getReviewTypeTitle = () => {
    const baseTitle = reviewType === 'trip' ? 'Trip Review' : 
                     reviewType === 'user' ? 'User Review' : 'Review';
    return editingReview ? `Edit ${baseTitle}` : baseTitle;
  };

  return (
    <div className="review-form-overlay">
      <div className="review-form-modal">
        <div className="review-form-header">
          <h2>{getReviewTypeTitle()}</h2>
          <button 
            className="close-button"
            onClick={onCancel}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          {/* Trip Selection for User Reviews */}
          {reviewType === 'user' && !tripId && (
            <div className="trip-selection-section">
              <label className="trip-selection-label">Select Trip *</label>
              {loadingTrips ? (
                <div className="loading-trips">
                  <div className="loading-spinner"></div>
                  <p>Loading available trips...</p>
                </div>
              ) : availableTrips.length > 0 ? (
                <select
                  value={selectedTripId || ''}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="trip-select"
                  required
                  disabled={submitting}
                >
                  <option value="">Choose a completed trip...</option>
                  {availableTrips.map(trip => (
                    <option key={trip._id} value={trip._id}>
                      {trip.destination} - {new Date(trip.endDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="no-trips-available">
                  <p>No completed trips found with this user.</p>
                  <p className="trip-hint">You can only review users from trips you both participated in.</p>
                </div>
              )}
            </div>
          )}

          {/* Rating Section */}
          <div className="rating-section">
            <label className="rating-label">Rating *</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-button ${star <= (hoveredRating || rating) ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={submitting}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="rating-text">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </span>
          </div>

          {/* Feedback Section */}
          <div className="feedback-section">
            <label htmlFor="feedback" className="feedback-label">
              Feedback * (10-1000 characters)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your experience and thoughts..."
              className="feedback-textarea"
              rows="4"
              maxLength="1000"
              disabled={submitting}
              required
            />
            <div className="character-count">
              {feedback.length}/1000
            </div>
          </div>

          {/* Tags Section */}
          <div className="tags-section">
            <label className="tags-label">Tags (optional)</label>
            <div className="tags-grid">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-button ${tags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                  disabled={submitting}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || rating === 0 || feedback.trim().length < 10}
              title={`Rating: ${rating}, Feedback length: ${feedback.trim().length}/10, Submitting: ${submitting}`}
            >
              {submitting ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}
            </button>
            
            {/* Debug info - only show if button is disabled */}
            {(submitting || rating === 0 || feedback.trim().length < 10) && (
              <div style={{ 
                fontSize: '11px', 
                color: '#e53e3e', 
                marginTop: '8px', 
                padding: '8px', 
                background: '#fed7d7',
                borderRadius: '4px',
                border: '1px solid #feb2b2'
              }}>
                <strong>⚠️ Form Requirements:</strong><br/>
                {rating === 0 && '• Please select a rating'}<br/>
                {feedback.trim().length < 10 && `• Feedback needs at least 10 characters (currently ${feedback.trim().length})`}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 