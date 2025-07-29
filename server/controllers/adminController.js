import User from '../models/User.js';
import Trip from '../models/Trip.js';
import AdminLog from '../models/AdminLog.js';
import Flag from '../models/Flag.js';
import winston from 'winston';
import Review from '../models/Review.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Get dashboard statistics
export const getStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalTrips = await Trip.countDocuments();
    const totalReviews = await Review.countDocuments();
    const totalFlags = await Flag.countDocuments();
    const totalLogs = await AdminLog.countDocuments();
    
    // Get pending KYC count (users with verificationStatus 'pending')
    const pendingKYC = await User.countDocuments({ verificationStatus: 'pending' });
    
    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
    
    // Get new trips today
    const newTripsToday = await Trip.countDocuments({ createdAt: { $gte: today } });
    
    // Get new reviews today
    const newReviewsToday = await Review.countDocuments({ createdAt: { $gte: today } });
    
    // Get new flags today
    const newFlagsToday = await Flag.countDocuments({ createdAt: { $gte: today } });
    
    // Get new admin logs today
    const newLogsToday = await AdminLog.countDocuments({ timestamp: { $gte: today } });

    res.status(200).json({
      totalUsers,
      totalTrips,
      totalReviews,
      totalFlags,
      totalLogs,
      pendingKYC,
      newUsersToday,
      newTripsToday,
      newReviewsToday,
      newFlagsToday,
      newLogsToday
    });
  } catch (err) {
    logger.error("Get Stats Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role verificationStatus isBanned createdAt gender preferences idDocument idSelfie');
    res.status(200).json(users);
  } catch (err) {
    logger.error("Get Users Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Ban or unban user
export const toggleBanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isBanned },
      { new: true }
    ).select('name email role verificationStatus isBanned createdAt');
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }
    await AdminLog.create({
      adminId: req.user.userId,
      action: isBanned ? 'banned user' : 'unbanned user',
      targetUserId: updatedUser._id,
      reason: isBanned ? 'Violation or flagged behavior' : 'Manual review cleared'
    });
    res.status(200).json({
      message: isBanned ? "User banned." : "User unbanned.",
      user: updatedUser
    });
  } catch (err) {
    logger.error("Ban error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all trips
export const getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('creator', 'name email')
      .populate('members', 'name email')
      .select('creator destination date budget tripType members createdAt');
    res.status(200).json(trips);
  } catch (err) {
    logger.error("Get Trips Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// New GET /api/admin/reports?type=flag|trip|user
export const getReports = async (req, res) => {
  try {
    const { type } = req.query;
    if (type === 'flag') {
      // Flag summary
      const totalFlags = await Flag.countDocuments();
      const userFlagsCount = await Flag.countDocuments({ flagType: 'user' });
      const tripFlagsCount = await Flag.countDocuments({ flagType: 'trip' });
      const reviewFlagsCount = await Flag.countDocuments({ flagType: 'review' });

      // User flags
      const userFlagsAgg = await Flag.aggregate([
        { $match: { flagType: 'user' } },
        { $group: { _id: { targetId: '$targetId', reason: '$reason' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      const userIds = userFlagsAgg.map(f => f._id.targetId);
      const userMap = Object.fromEntries((await User.find({ _id: { $in: userIds } }).select('name email preferences gender').lean()).map(u => [u._id.toString(), u]));
      const userFlags = userFlagsAgg.map(f => ({
        _id: f._id.targetId,
        targetName: userMap[f._id.targetId]?.name || 'Unknown',
        targetEmail: userMap[f._id.targetId]?.email || '-',
        preferences: userMap[f._id.targetId]?.preferences || '',
        gender: userMap[f._id.targetId]?.gender || '',
        reason: f._id.reason,
        count: f.count
      }));

      // Trip flags
      const tripFlagsAgg = await Flag.aggregate([
        { $match: { flagType: 'trip' } },
        { $group: { _id: { targetId: '$targetId', reason: '$reason' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      const tripIds = tripFlagsAgg.map(f => f._id.targetId);
      const tripMap = Object.fromEntries((await Trip.find({ _id: { $in: tripIds } }).select('destination date').lean()).map(t => [t._id.toString(), t]));
      const tripFlags = tripFlagsAgg.map(f => ({
        _id: f._id.targetId,
        targetDestination: tripMap[f._id.targetId]?.destination || 'Unknown',
        tripDate: tripMap[f._id.targetId]?.date || '',
        reason: f._id.reason,
        count: f.count
      }));

      // Review flags
      const reviewFlagsAgg = await Flag.aggregate([
        { $match: { flagType: 'review' } },
        { $group: { _id: { targetId: '$targetId', reason: '$reason' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      const reviewIds = reviewFlagsAgg.map(f => f._id.targetId);
      const reviewMap = Object.fromEntries((await Review.find({ _id: { $in: reviewIds } }).select('feedback reviewer rating tags').populate('reviewer', 'name email').lean()).map(r => [r._id.toString(), r]));
      const reviewFlags = reviewFlagsAgg.map(f => ({
        _id: f._id.targetId,
        comment: reviewMap[f._id.targetId]?.feedback || '',
        reviewer: reviewMap[f._id.targetId]?.reviewer || null,
        rating: reviewMap[f._id.targetId]?.rating || null,
        tags: reviewMap[f._id.targetId]?.tags || [],
        reason: f._id.reason,
        count: f.count
      }));

      return res.status(200).json({
        reportType: 'flag',
        totalFlags,
        byType: { user: userFlagsCount, trip: tripFlagsCount, review: reviewFlagsCount },
        userFlags,
        tripFlags,
        reviewFlags
      });
    }
    if (type === 'trip') {
      // Trip summary
      const totalTrips = await Trip.countDocuments();
      const tripTypesAgg = await Trip.aggregate([
        { $group: { _id: '$tripType', count: { $sum: 1 } } }
      ]);
      const byType = {};
      tripTypesAgg.forEach(t => { byType[t._id] = t.count; });
      const topDestAgg = await Trip.aggregate([
        { $group: { _id: '$destination', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]);
      const topDestinations = topDestAgg.map(d => ({ destination: d._id, count: d.count }));
      return res.status(200).json({
        reportType: 'trip',
        totalTrips,
        byType,
        topDestinations
      });
    }
    if (type === 'user') {
      // User summary
      const totalUsers = await User.countDocuments();
      // Recent signups (last 3 users by createdAt desc)
      const recentSignups = await User.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select('name email createdAt')
        .lean();
      // Most active users (joined the most trips)
      const mostActiveAgg = await Trip.aggregate([
        { $unwind: '$members' },
        { $group: { _id: '$members', tripCount: { $sum: 1 } } },
        { $sort: { tripCount: -1 } },
        { $limit: 3 }
      ]);
      const mostActiveUsers = await User.find({ _id: { $in: mostActiveAgg.map(u => u._id) } })
        .select('name email')
        .lean();
      const mostActive = mostActiveAgg.map(u => {
        const user = mostActiveUsers.find(usr => usr._id.toString() === u._id.toString());
        return user ? { ...user, tripCount: u.tripCount } : null;
      }).filter(Boolean);
      // New users in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsersLast30Days = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
      // Top creators (users who created the most trips)
      const topUsersAgg = await Trip.aggregate([
        { $group: { _id: '$creator', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]);
      const topUsers = await User.find({ _id: { $in: topUsersAgg.map(u => u._id) } })
        .select('name email')
        .lean();
      const topCreators = topUsersAgg.map(u => {
        const user = topUsers.find(usr => usr._id.toString() === u._id.toString());
        return user ? { ...user, count: u.count } : null;
      }).filter(Boolean);
      return res.status(200).json({
        reportType: 'user',
        totalUsers,
        recentSignups,
        mostActive,
        newUsersLast30Days,
        topCreators
      });
    }
    // fallback
    return res.status(400).json({ message: 'Invalid report type' });
  } catch (err) {
    logger.error('Fetch Reports Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all admin logs
export const getAdminLogs = async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate('adminId', 'name')
      .populate('targetUserId', 'name email')
      .sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    logger.error("Log Fetch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Trip.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all flags for a specific user, trip, or review
export const getFlagsForTarget = async (req, res) => {
  try {
    const { flagType, targetId } = req.params;
    if (!['user', 'trip', 'review'].includes(flagType)) {
      return res.status(400).json({ message: 'Invalid flag type.' });
    }
    const flags = await Flag.find({ flagType, targetId })
      .populate('flaggedBy', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(flags);
  } catch (err) {
    logger.error('Fetch Flags For Target Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dismiss a flag
export const dismissFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    await Flag.findByIdAndUpdate(flagId, { status: 'dismissed' });
    res.status(200).json({ message: 'Flag dismissed.' });
  } catch (err) {
    logger.error('Dismiss Flag Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resolve a flag (after ban/delete)
export const resolveFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    await Flag.findByIdAndUpdate(flagId, { status: 'resolved' });
    res.status(200).json({ message: 'Flag resolved.' });
  } catch (err) {
    logger.error('Resolve Flag Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update getAllFlags to filter by status
export const getAllFlags = async (req, res) => {
  try {
    const { flagType, reason, page = 1, limit = 20, status = 'open' } = req.query;
    const filter = {};
    if (flagType) filter.flagType = flagType;
    if (reason) filter.reason = reason;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    let flags = await Flag.find(filter)
      .populate('flaggedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
    // Populate target details
    for (const flag of flags) {
      if (flag.flagType === 'user') {
        const user = await User.findById(flag.targetId).select('name email').lean();
        flag.targetName = user?.name || '-';
        flag.targetEmail = user?.email || '-';
      } else if (flag.flagType === 'trip') {
        const trip = await Trip.findById(flag.targetId).select('destination').lean();
        flag.targetDestination = trip?.destination || '-';
      } else if (flag.flagType === 'review') {
        const review = await Review.findById(flag.targetId).select('feedback').lean();
        flag.targetComment = review?.feedback || '-';
      }
    }
    const total = await Flag.countDocuments(filter);
    res.status(200).json({ flags, total });
  } catch (err) {
    logger.error('Fetch All Flags Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get notification count for a target
export const getNotificationCount = async (req, res) => {
  try {
    const { flagType, targetId } = req.params;
    let count = 0;
    if (flagType === 'user') {
      const user = await User.findById(targetId);
      count = user?.moderation?.notificationCount || 0;
    } else if (flagType === 'trip') {
      const trip = await Trip.findById(targetId);
      count = trip?.moderation?.notificationCount || 0;
    } else if (flagType === 'review') {
      const review = await Review.findById(targetId);
      count = review?.moderation?.notificationCount || 0;
    }
    res.status(200).json({ count });
  } catch (err) {
    logger.error('Get Notification Count Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Increment notification count for a target
export const incrementNotificationCount = async (req, res) => {
  try {
    const { flagType, targetId } = req.params;
    let count = 0;
    if (flagType === 'user') {
      const user = await User.findById(targetId);
      user.moderation.notificationCount = (user.moderation.notificationCount || 0) + 1;
      await user.save();
      count = user.moderation.notificationCount;
    } else if (flagType === 'trip') {
      const trip = await Trip.findById(targetId);
      trip.moderation.notificationCount = (trip.moderation.notificationCount || 0) + 1;
      await trip.save();
      count = trip.moderation.notificationCount;
    } else if (flagType === 'review') {
      const review = await Review.findById(targetId);
      review.moderation.notificationCount = (review.moderation.notificationCount || 0) + 1;
      await review.save();
      count = review.moderation.notificationCount;
    }
    res.status(200).json({ count });
  } catch (err) {
    logger.error('Increment Notification Count Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Approve a review
export const approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { adminResponse } = req.body || {};
    const adminId = req.user.userId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // Update review status
    review.status = 'approved';
    review.adminResponse = adminResponse || '';
    review.updatedAt = new Date();
    await review.save();

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'approved review',
      targetReviewId: reviewId,
      outcome: 'Review approved and made visible'
    });

    res.status(200).json({
      message: "Review approved successfully.",
      review: {
        _id: review._id,
        status: review.status,
        adminResponse: review.adminResponse,
        updatedAt: review.updatedAt
      }
    });
  } catch (err) {
    logger.error("Approve review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Reject a review
export const rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { adminResponse } = req.body || {};
    const adminId = req.user.userId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // Update review status
    review.status = 'rejected';
    review.adminResponse = adminResponse || '';
    review.updatedAt = new Date();
    await review.save();

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'rejected review',
      targetReviewId: reviewId,
      outcome: 'Review rejected and hidden'
    });

    res.status(200).json({
      message: "Review rejected successfully.",
      review: {
        _id: review._id,
        status: review.status,
        adminResponse: review.adminResponse,
        updatedAt: review.updatedAt
      }
    });
  } catch (err) {
    logger.error("Reject review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const adminId = req.user.userId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // Soft delete the review
    review.deletedAt = new Date();
    review.updatedAt = new Date();
    await review.save();

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'deleted review',
      targetReviewId: reviewId,
      outcome: 'Review permanently removed'
    });

    res.status(200).json({
      message: "Review deleted successfully."
    });
  } catch (err) {
    logger.error("Delete review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
