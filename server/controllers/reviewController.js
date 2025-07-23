import Review from '../models/Review.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';

// Helper: Check if user is a participant in the trip
async function isTripParticipant(tripId, userId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return false;
  return (
    trip.creator.equals(userId) ||
    trip.members.some(memberId => memberId.equals(userId))
  );
}

// Submit a review (for trip or user)
export const giveReview = async (req, res) => {
  try {
    const { reviewType, tripId, reviewedUser, rating, feedback, tags } = req.body;
    const reviewer = req.user.userId;

    if (!reviewType || !rating || !feedback) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (reviewType === 'trip' && !tripId) {
      return res.status(400).json({ message: 'Trip ID required for trip reviews.' });
    }
    if (reviewType === 'user' && !reviewedUser) {
      return res.status(400).json({ message: 'Reviewed user required for user reviews.' });
    }

    // Validate trip participation for trip/user reviews
    if (tripId) {
      const isParticipant = await isTripParticipant(tripId, reviewer);
      if (!isParticipant) {
        return res.status(403).json({ message: 'You can only review trips you participated in.' });
      }
    }

    // Prevent duplicate reviews (enforced by schema index, but check for user-friendly error)
    const duplicate = await Review.findOne({ reviewer, reviewType, tripId: tripId || null, reviewedUser: reviewedUser || null });
    if (duplicate) {
      return res.status(409).json({ message: 'You have already submitted a review.' });
    }

    const newReview = new Review({
      reviewer,
      reviewType,
      tripId: tripId || undefined,
      reviewedUser: reviewedUser || undefined,
      rating,
      feedback,
      tags,
    });
    await newReview.save();
    res.status(201).json({ message: 'Review submitted.', review: newReview });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted a review.' });
    }
    console.error('❌ Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reviews for a user
export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ reviewedUser: userId, reviewType: 'user' })
      .populate('reviewer', 'name email')
      .populate('tripId', 'destination date');
    res.status(200).json(reviews);
  } catch (err) {
    console.error('❌ Fetch User Reviews Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reviews for a trip
export const getTripReviews = async (req, res) => {
  try {
    const { tripId } = req.params;
    const reviews = await Review.find({ tripId, reviewType: 'trip' })
      .populate('reviewer', 'name email');
    res.status(200).json(reviews);
  } catch (err) {
    console.error('❌ Fetch Trip Reviews Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all reviews with filters, search, and pagination
export const getAllReviews = async (req, res) => {
  try {
    const { type, rating, flagged, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.reviewType = type;
    if (rating) filter.rating = Number(rating);
    if (flagged !== undefined) filter.flagged = flagged === 'true';
    if (search) filter.feedback = { $regex: search, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const reviews = await Review.find(filter)
      .populate('reviewer', 'name email')
      .populate('reviewedUser', 'name email')
      .populate('tripId', 'destination date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await Review.countDocuments(filter);
    res.status(200).json({ reviews, total });
  } catch (err) {
    console.error('❌ Fetch All Reviews Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Flag a review
export const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findByIdAndUpdate(reviewId, { flagged: true });
    res.status(200).json({ message: 'Review flagged.' });
  } catch (err) {
    console.error('❌ Flag Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Unflag a review
export const unflagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findByIdAndUpdate(reviewId, { flagged: false });
    res.status(200).json({ message: 'Review unflagged.' });
  } catch (err) {
    console.error('❌ Unflag Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: 'Review deleted.' });
  } catch (err) {
    console.error('❌ Delete Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
