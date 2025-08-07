import Review from '../models/Review.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Flag from '../models/Flag.js';

// Helper: Check if user is a participant in the trip
async function isTripParticipant(tripId, userId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return false;
  return (
    trip.creator.equals(userId) ||
    trip.members.some(memberId => memberId.equals(userId))
  );
}

// Helper: Check if trip is completed
async function isTripCompleted(tripId) {
  const trip = await Trip.findById(tripId);
  if (!trip) return false;
  return trip.status === 'completed';
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

// Automated review moderation checks
function runAutomatedChecks(feedback, rating) {
  const issues = [];
  
  // Check for banned words/phrases
  const bannedWords = [
    'scam', 'fake', 'fraud', 'cheat', 'liar', 'stupid', 'idiot', 'moron',
    'hate', 'kill', 'death', 'suicide', 'terrorist', 'bomb', 'weapon',
    'spam', 'advertisement', 'promote', 'buy now', 'click here'
  ];
  
  const lowerFeedback = feedback.toLowerCase();
  for (const word of bannedWords) {
    if (lowerFeedback.includes(word)) {
      issues.push(`Contains banned word: ${word}`);
    }
  }
  
  // Check for excessive caps (shouting)
  const capsCount = (feedback.match(/[A-Z]/g) || []).length;
  const totalChars = feedback.length;
  if (capsCount > 0 && (capsCount / totalChars) > 0.7) {
    issues.push('Excessive use of capital letters');
  }
  
  // Check for repeated characters (spam)
  const repeatedChars = feedback.match(/(.)\1{4,}/g);
  if (repeatedChars) {
    issues.push('Repeated characters detected');
  }
  
  // Check for suspicious rating patterns
  if (rating < 1 || rating > 5) {
    issues.push('Invalid rating value');
  }
  
  // Check for minimum content length
  if (feedback.length < 10) {
    issues.push('Review too short (minimum 10 characters)');
  }
  
  // Check for maximum content length
  if (feedback.length > 1000) {
    issues.push('Review too long (maximum 1000 characters)');
  }
  
  // Check for URLs/links
  const urlPattern = /https?:\/\/[^\s]+/g;
  if (urlPattern.test(feedback)) {
    issues.push('URLs/links not allowed');
  }
  
  return {
    passed: issues.length === 0,
    issues
  };
}

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
    if (trip.status !== 'completed') {
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

    // Run automated moderation checks
    const moderationResult = runAutomatedChecks(feedback, rating);
    let status = 'approved';
    let adminResponse = '';

    if (!moderationResult.passed) {
      status = 'rejected';
      adminResponse = `Auto-rejected: ${moderationResult.issues.join(', ')}`;
    }

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
    
    const responseMessage = status === 'approved' 
      ? 'Review submitted and published.' 
      : 'Review submitted but rejected due to content policy violations.';
    
    res.status(201).json({ 
      message: responseMessage, 
      review: {
        ...newReview.toObject(),
        moderationIssues: moderationResult.passed ? null : moderationResult.issues
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
      .populate('reviewer', 'name email')
      .populate('reviewedUser', 'name email')
      .populate({
        path: 'tripId',
        select: 'destination description startDate endDate budget tripType status',
        populate: {
          path: 'creator',
          select: 'name email'
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
      .populate('reviewer', 'name email')
      .populate('reviewedUser', 'name email')
      .populate({
        path: 'tripId',
        select: 'destination description startDate endDate budget tripType status',
        populate: {
          path: 'creator',
          select: 'name email'
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
    if (trip.status !== 'completed') {
      permissions.reason = 'Trip must be completed before reviews can be submitted.';
      return res.status(200).json(permissions);
    }

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
