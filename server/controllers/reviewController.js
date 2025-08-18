import Review from '../models/Review.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Flag from '../models/Flag.js';
import { maybeCreateAutoFlag } from '../middlewares/moderation.js';

// Helper: Check if user is a participant in the trip
async function isTripParticipant(tripId, userId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return false;
  return (
    trip.creator.equals(userId) ||
    trip.members.some(memberId => memberId.equals(userId))
  );
}

// Helper: Check if trip is completed (with date-based logic)
async function isTripCompleted(tripId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return false;
  
  // If manually marked as completed, return true
  if (trip.status === 'completed') {
    return true;
  }
  
  // Calculate based on dates
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  if (now < startDate) return false; // Upcoming
  if (now >= startDate && now <= endDate) return false; // Active
  return true; // Completed (past end date)
}

// Helper: Check if trip is completed (synchronous version for use in other functions)
function isTripCompletedSync(trip) {
  if (!trip) return false;
  
  // If manually marked as completed, return true
  if (trip.status === 'completed') {
    return true;
  }
  
  // Calculate based on dates
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  if (now < startDate) return false; // Upcoming
  if (now >= startDate && now <= endDate) return false; // Active
  return true; // Completed (past end date)
}

// Helper: Check if user can review another user (both must be trip members)
async function canReviewUser(tripId, reviewerId, reviewedUserId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return false;
  
  // Both users must be trip members
  const isReviewerMember = trip.creator.equals(reviewerId) || 
                          trip.members.some(memberId => memberId.equals(reviewerId));
  const isReviewedUserMember = trip.creator.equals(reviewedUserId) || 
                              trip.members.some(memberId => memberId.equals(reviewedUserId));
  
  return isReviewerMember && isReviewedUserMember;
}

// Helper: Get trip details for validation
async function getTripDetails(tripId) {
  const trip = await Trip.findById(tripId)
    .populate('creator', 'name email')
    .populate('members', 'name email');
  return trip;
}

// Perspective-only moderation: middleware blocks high-risk content before reaching here.

// Submit a review (for trip or user)
export const giveReview = async (req, res) => {
  try {
    const { reviewType, tripId, reviewedUser, rating, feedback, tags } = req.body;
    const reviewer = req.user.userId;

    // Basic validation
    if (!reviewType || !rating || !feedback) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (reviewType === 'trip' && !tripId) {
      return res.status(400).json({ message: 'Trip ID required for trip reviews.' });
    }
    if (reviewType === 'user' && !reviewedUser) {
      return res.status(400).json({ message: 'Reviewed user required for user reviews.' });
    }

    // For both trip and user reviews, we need a tripId to validate completion and membership
    if (!tripId) {
      return res.status(400).json({ message: 'Trip ID is required for all reviews.' });
    }

    // Get trip details for validation
    const trip = await getTripDetails(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // RESTRICTION 1: Only after completing a trip can users post reviews
    if (!isTripCompletedSync(trip)) {
      return res.status(403).json({ 
        message: 'You can only review after the trip is completed.',
        tripStatus: trip.status
      });
    }

    // RESTRICTION 2: Only trip members can review each other (not anyone else)
    const isReviewerMember = await isTripParticipant(tripId, reviewer);
    if (!isReviewerMember) {
      return res.status(403).json({ 
        message: 'You can only review trips you participated in.',
        tripDestination: trip.destination
      });
    }

    if (reviewType === 'user') {
      // RESTRICTION 3: Users cannot review themselves
      if (reviewer === reviewedUser) {
        return res.status(400).json({ 
          message: 'You cannot review yourself.',
          reviewerId: reviewer,
          reviewedUserId: reviewedUser
        });
      }

      // RESTRICTION 4: Only trip members can review each other
      const canReview = await canReviewUser(tripId, reviewer, reviewedUser);
      if (!canReview) {
        return res.status(403).json({ 
          message: 'You can only review other members of the same trip.',
          tripDestination: trip.destination,
          tripMembers: trip.members.map(m => ({ id: m._id, name: m.name }))
        });
      }
    }

    // Check for duplicate reviews
    const duplicate = await Review.findOne({ 
      reviewer, 
      reviewType, 
      tripId, 
      reviewedUser: reviewedUser || null 
    });
    if (duplicate) {
      return res.status(409).json({ 
        message: 'You have already submitted a review for this trip/user combination.',
        existingReviewId: duplicate._id
      });
    }

    // Perspective middleware already blocked high-risk. Default approve.
    let status = 'approved';
    let adminResponse = '';

    const newReview = new Review({
      reviewer,
      reviewType,
      tripId,
      reviewedUser: reviewedUser || undefined,
      rating,
      feedback,
      tags,
      status,
      adminResponse
    });
    await newReview.save();
    // If the request-level moderation flagged the content, create a flag and mark review flagged
    const reqMod = req?.moderation?.feedback;
    if (reqMod && reqMod.flagged) {
      await Review.findByIdAndUpdate(newReview._id, { flagged: true });
      await maybeCreateAutoFlag({ req, fieldName: 'feedback', targetId: newReview._id, flagType: 'review' });
    }
    
    // If this is a user review and it's approved, automatically add as friends
    if (reviewType === 'user' && reviewedUser && status === 'approved') {
      try {
        // Add reviewedUser to reviewer's friends list
        await User.findByIdAndUpdate(reviewer, {
          $addToSet: { friends: reviewedUser }
        });
        
        // Add reviewer to reviewedUser's friends list
        await User.findByIdAndUpdate(reviewedUser, {
          $addToSet: { friends: reviewer }
        });
      } catch (friendError) {
        console.error('Error adding friends:', friendError);
        // Don't fail the review submission if friend addition fails
      }
    }
    
    const responseMessage = 'Review submitted and published.';
    
    // Populate the reviewer data before sending response
    const populatedReview = await Review.findById(newReview._id)
      .populate('reviewer', 'name email username profileImage');
    
    res.status(201).json({ 
      message: responseMessage, 
      review: {
        ...populatedReview.toObject(),
        moderationIssues: req?.moderation?.feedback?.flagged ? req.moderation.feedback.reasons : null
      }
    });
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
      .populate('reviewer', 'name email username profileImage')
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
      .populate('reviewer', 'name email username profileImage');
    res.status(200).json(reviews);
  } catch (err) {
    console.error('❌ Fetch Trip Reviews Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all reviews with filters, search, and pagination
export const getAllReviews = async (req, res) => {
  try {
    const { type, rating, flagged, search, page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (type) filter.reviewType = type;
    if (rating) filter.rating = Number(rating);
    if (flagged !== undefined) filter.flagged = flagged === 'true';
    if (search) filter.feedback = { $regex: search, $options: 'i' };
    
    // For admin panel, show all reviews by default unless specific status is requested
    if (status) {
      filter.status = status;
    }
    // Remove the default 'approved' filter to show all reviews for admin
    
    const skip = (Number(page) - 1) * Number(limit);
    const reviews = await Review.find(filter)
      .populate('reviewer', 'name email username profileImage')
      .populate('reviewedUser', 'name email username profileImage')
      .populate({
        path: 'tripId',
        select: 'destination description startDate endDate budget tripType status',
        populate: {
          path: 'creator',
          select: 'name email username profileImage'
        }
      })
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

// Admin: Get reviews that need moderation (flagged, pending, rejected)
export const getReviewsForModeration = async (req, res) => {
  try {
    const { status = 'flagged', page = 1, limit = 20 } = req.query;
    const filter = { status };
    
    const skip = (Number(page) - 1) * Number(limit);
    const reviews = await Review.find(filter)
      .populate('reviewer', 'name email username profileImage')
      .populate('reviewedUser', 'name email username profileImage')
      .populate({
        path: 'tripId',
        select: 'destination description startDate endDate budget tripType status',
        populate: {
          path: 'creator',
          select: 'name email username profileImage'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await Review.countDocuments(filter);
    
    res.status(200).json({ 
      reviews, 
      total,
      status: 'flagged' // Only flagged reviews need admin attention
    });
  } catch (err) {
    console.error('❌ Fetch Reviews for Moderation Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: Flag a review (create a Flag record)
export const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason, details } = req.body;
    const userId = req.user.userId;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required for flagging.' });
    }

    // Check if review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Check if user already flagged this review
    const existingFlag = await Flag.findOne({ 
      flagType: 'review', 
      targetId: reviewId, 
      flaggedBy: userId 
    });
    
    if (existingFlag) {
      return res.status(409).json({ message: 'You have already flagged this review.' });
    }

    // Create flag record
    const flag = new Flag({
      flagType: 'review',
      targetId: reviewId,
      reason,
      flaggedBy: userId,
      severity: 'medium' // Default severity for review flags
    });

    await flag.save();

    // Update review to mark as flagged and set status to flagged for admin review
    await Review.findByIdAndUpdate(reviewId, { 
      flagged: true, 
      status: 'flagged',
      updatedAt: new Date()
    });

    res.status(201).json({ 
      message: 'Review flagged for moderation.',
      flag: {
        _id: flag._id,
        flagType: flag.flagType,
        targetId: flag.targetId,
        reason: flag.reason,
        flaggedBy: flag.flaggedBy,
        severity: flag.severity,
        status: flag.status,
        createdAt: flag.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Flag Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: Unflag a review (remove Flag record)
export const unflagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    // Check if review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Find and delete the flag
    const flag = await Flag.findOneAndDelete({ 
      flagType: 'review', 
      targetId: reviewId, 
      flaggedBy: userId 
    });

    if (!flag) {
      return res.status(404).json({ message: 'No flag found for this review.' });
    }

    // Check if there are any other flags for this review
    const remainingFlags = await Flag.countDocuments({ 
      flagType: 'review', 
      targetId: reviewId 
    });

    // If no more flags, unflag the review
    if (remainingFlags === 0) {
      await Review.findByIdAndUpdate(reviewId, { flagged: false });
    }

    res.status(200).json({ message: 'Flag withdrawn.' });
  } catch (err) {
    console.error('❌ Unflag Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: Update a review (only the review owner can update)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, feedback, tags } = req.body;
    const userId = req.user.userId;

    // Basic validation
    if (!rating || !feedback) {
      return res.status(400).json({ message: 'Rating and feedback are required.' });
    }

    // Check if review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Check if user owns the review
    if (review.reviewer.toString() !== userId) {
      return res.status(403).json({ message: 'You can only update your own reviews.' });
    }

    // Perspective middleware blocked high-risk; keep approved
    let status = 'approved';
    let adminResponse = '';

    // Update the review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        rating,
        feedback,
        tags,
        status,
        adminResponse,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('reviewer', 'name email username profileImage');

    const reqModUpdate = req?.moderation?.feedback;
    if (reqModUpdate && reqModUpdate.flagged) {
      await Review.findByIdAndUpdate(reviewId, { flagged: true });
      await maybeCreateAutoFlag({ req, fieldName: 'feedback', targetId: reviewId, flagType: 'review' });
    }

    const responseMessage = 'Review updated and published.';
    
    res.status(200).json({ 
      message: responseMessage, 
      review: updatedReview
    });
  } catch (err) {
    console.error('❌ Update Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: Delete a review (only the review owner can delete)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    // Check if review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Check if user owns the review
    if (review.reviewer.toString() !== userId) {
      return res.status(403).json({ message: 'You can only delete your own reviews.' });
    }

    await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('❌ Delete Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check review permissions for frontend
export const checkReviewPermissions = async (req, res) => {
  try {
    const { reviewType, tripId, reviewedUser } = req.query;
    const userId = req.user.userId;

    if (!reviewType || !tripId) {
      return res.status(400).json({ message: 'Review type and trip ID are required.' });
    }

    // Get trip details
    const trip = await getTripDetails(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const permissions = {
      canReview: false,
      reason: '',
      tripStatus: trip.status,
      isTripMember: false,
      tripCompleted: trip.status === 'completed'
    };

    // Check if user is a trip member
    const isTripMember = await isTripParticipant(tripId, userId);
    permissions.isTripMember = isTripMember;

    // Check trip completion
    if (!isTripCompletedSync(trip)) {
      permissions.reason = 'Trip must be completed before reviews can be submitted.';
      permissions.tripCompleted = false;
      return res.status(200).json(permissions);
    }
    
    permissions.tripCompleted = true;

    // Check trip membership
    if (!isTripMember) {
      permissions.reason = 'You must be a trip member to submit reviews.';
      return res.status(200).json(permissions);
    }

    // For user reviews, check additional restrictions
    if (reviewType === 'user') {
      if (!reviewedUser) {
        permissions.reason = 'Reviewed user is required for user reviews.';
        return res.status(200).json(permissions);
      }

      // Check if user is trying to review themselves
      if (userId === reviewedUser) {
        permissions.reason = 'You cannot review yourself.';
        return res.status(200).json(permissions);
      }

      // Check if reviewed user is also a trip member
      const canReviewUser = await canReviewUser(tripId, userId, reviewedUser);
      if (!canReviewUser) {
        permissions.reason = 'You can only review other members of the same trip.';
        return res.status(200).json(permissions);
      }
    }

    // Check if user has already reviewed
    const existingReview = await Review.findOne({
      reviewer: userId,
      reviewType,
      tripId,
      reviewedUser: reviewedUser || null
    });

    if (existingReview) {
      permissions.reason = 'You have already submitted a review for this trip/user combination.';
      return res.status(200).json(permissions);
    }

    // All checks passed
    permissions.canReview = true;
    res.status(200).json(permissions);

  } catch (err) {
    console.error('❌ Check Review Permissions Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
