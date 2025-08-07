import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ReviewForm.css';

export default function ReviewForm({ 
  reviewType, 
  tripId, 
  reviewedUser, 
  onReviewSubmitted, 
  onCancel 
}) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tags, setTags] = useState([]);
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
        tripId: selectedTripId,
        rating,
        feedback: feedback.trim(),
        tags
      };

      if (reviewType === 'user' && reviewedUser) {
        reviewData.reviewedUser = reviewedUser;
      }

      console.log('Submitting review data:', reviewData);
      const response = await axios.post('/api/reviews/submit', reviewData, { headers });
      
      console.log('Review submission successful:', response.data);
      toast.success(response.data.message);
      onReviewSubmitted(response.data.review);
    } catch (error) {
      console.error('Review submission error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getReviewTypeTitle = () => {
    if (reviewType === 'trip') {
      return 'Trip Review';
    } else if (reviewType === 'user') {
      return 'User Review';
    }
    return 'Review';
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
              onClick={() => console.log('Button state:', {
                submitting,
                rating,
                feedbackLength: feedback.trim().length,
                disabled: submitting || rating === 0 || feedback.trim().length < 10
              })}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 