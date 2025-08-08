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

// Get all users with enhanced data
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role verificationStatus isBanned createdAt gender preferences idDocument idSelfie phone location lastLogin');
    
    // Enhance users with activity data
    const enhancedUsers = await Promise.all(users.map(async (user) => {
      // Get user's trip count
      const tripsCount = await Trip.countDocuments({ createdBy: user._id });
      
      // Get user's review count
      const reviewsCount = await Review.countDocuments({ userId: user._id });
      
      // Get flags against this user's content
      const flagsCount = await Flag.countDocuments({ 
        $or: [
          { targetId: user._id, flagType: 'user' },
          { targetId: { $in: await Trip.find({ createdBy: user._id }).select('_id') } },
          { targetId: { $in: await Review.find({ userId: user._id }).select('_id') } }
        ]
      });
      
      // Get reports received by this user
      const reportsCount = await Flag.countDocuments({ 
        targetId: user._id, 
        flagType: 'user' 
      });

      return {
        ...user.toObject(),
        tripsCount,
        reviewsCount,
        flagsCount,
        reportsCount
      };
    }));

    res.status(200).json(enhancedUsers);
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

// Bulk ban/unban users
export const bulkToggleBanUsers = async (req, res) => {
  try {
    const { userIds, isBanned } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required." });
    }

    const updatedUsers = await User.updateMany(
      { _id: { $in: userIds } },
      { isBanned },
      { new: true }
    );

    // Log bulk action
    await AdminLog.create({
      adminId: req.user.userId,
      action: isBanned ? 'bulk banned users' : 'bulk unbanned users',
      targetUserIds: userIds,
      reason: isBanned ? 'Bulk violation or flagged behavior' : 'Bulk manual review cleared'
    });

    res.status(200).json({
      message: isBanned ? `${userIds.length} users banned.` : `${userIds.length} users unbanned.`,
      updatedCount: userIds.length
    });
  } catch (err) {
    logger.error("Bulk ban error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk KYC verification
export const bulkKYCVerification = async (req, res) => {
  try {
    const { userIds, verificationStatus } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required." });
    }

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verification status." });
    }

    const updatedUsers = await User.updateMany(
      { _id: { $in: userIds } },
      { verificationStatus },
      { new: true }
    );

    // Log bulk KYC action
    await AdminLog.create({
      adminId: req.user.userId,
      action: `bulk ${verificationStatus} KYC`,
      targetUserIds: userIds,
      reason: `Bulk KYC ${verificationStatus} - Manual review`
    });

    res.status(200).json({
      message: `${userIds.length} users ${verificationStatus}.`,
      updatedCount: userIds.length
    });
  } catch (err) {
    logger.error("Bulk KYC error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Get trip statistics
export const getTripStats = async (req, res) => {
  try {
    const totalTrips = await Trip.countDocuments();
    const activeTrips = await Trip.countDocuments({ status: 'active' });
    const completedTrips = await Trip.countDocuments({ status: 'completed' });
    const cancelledTrips = await Trip.countDocuments({ status: 'cancelled' });
    const reportedTrips = await Trip.countDocuments({ 'moderation.reported': true });
    
    // Trips today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripsToday = await Trip.countDocuments({ createdAt: { $gte: today } });
    
    // Average budget
    const avgBudget = await Trip.aggregate([
      { $group: { _id: null, avgBudget: { $avg: '$budget' } } }
    ]);
    
    // Popular destinations
    const popularDestinations = await Trip.aggregate([
      { $group: { _id: '$destination', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Trip type distribution
    const tripTypeStats = await Trip.aggregate([
      { $group: { _id: '$tripType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Recent trips
    const recentTrips = await Trip.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('creator', 'name email')
      .select('destination startDate endDate budget creator');

    res.status(200).json({
      totalTrips,
      activeTrips,
      completedTrips,
      cancelledTrips,
      reportedTrips,
      tripsToday,
      avgBudget: avgBudget[0]?.avgBudget || 0,
      popularDestinations,
      tripTypeStats,
      recentTrips
    });
  } catch (err) {
    logger.error("Get trip stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get reported trips
export const getReportedTrips = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = { 'moderation.reported': true };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { destination: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const trips = await Trip.find(filter)
      .populate('creator', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // Enhance trips with better creator information
    const enhancedTrips = trips.map(trip => {
      const enhancedTrip = trip.toObject();
      
      // Ensure creator has proper data
      if (trip.creator) {
        enhancedTrip.creator = {
          name: trip.creator.name || 'Unknown Creator',
          email: trip.creator.email || 'No email'
        };
      } else {
        enhancedTrip.creator = {
          name: 'Unknown Creator',
          email: 'No email'
        };
      }
      
      return enhancedTrip;
    });
    
    const total = await Trip.countDocuments(filter);
    
    res.status(200).json({ trips: enhancedTrips, total });
  } catch (err) {
    logger.error("Get reported trips error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk trip operations
export const bulkTripOperations = async (req, res) => {
  try {
    const { tripIds, action } = req.body;
    
    if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({ message: "Trip IDs array is required." });
    }

    if (!['approve', 'suspend', 'delete', 'complete'].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    let updateData = {};
    if (action === 'approve') {
      updateData = { 
        status: 'active',
        'moderation.reported': false,
        'moderation.approvedAt': new Date()
      };
    } else if (action === 'suspend') {
      updateData = { 
        status: 'suspended',
        'moderation.suspendedAt': new Date()
      };
    } else if (action === 'complete') {
      updateData = { 
        status: 'completed',
        'moderation.completedAt': new Date()
      };
    }

    let result;
    if (action === 'delete') {
      result = await Trip.deleteMany({ _id: { $in: tripIds } });
    } else {
      result = await Trip.updateMany(
        { _id: { $in: tripIds } },
        updateData,
        { new: true }
      );
    }

    // Log bulk trip action
    await AdminLog.create({
      adminId: req.user.userId,
      action: `bulk ${action} trips`,
      targetTripIds: tripIds,
      reason: `Bulk trip ${action} - Admin action`
    });

    res.status(200).json({
      message: `${tripIds.length} trips ${action}ed.`,
      updatedCount: tripIds.length
    });
  } catch (err) {
    logger.error("Bulk trip operations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get flag statistics
export const getFlagStats = async (req, res) => {
  try {
    const totalFlags = await Flag.countDocuments();
    const pendingFlags = await Flag.countDocuments({ resolved: false, dismissed: false });
    const resolvedFlags = await Flag.countDocuments({ resolved: true });
    const dismissedFlags = await Flag.countDocuments({ dismissed: true });
    const escalatedFlags = await Flag.countDocuments({ escalated: true });
    
    // Flags today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const flagsToday = await Flag.countDocuments({ createdAt: { $gte: today } });
    
    // High priority flags
    const highPriorityFlags = await Flag.countDocuments({ severity: 'high' });
    
    // Average resolution time (in hours)
    const resolvedFlagsWithTime = await Flag.find({ 
      resolved: true, 
      resolvedAt: { $exists: true } 
    });
    
    let avgResolutionTime = 0;
    if (resolvedFlagsWithTime.length > 0) {
      const totalTime = resolvedFlagsWithTime.reduce((sum, flag) => {
        const resolutionTime = flag.resolvedAt - flag.createdAt;
        return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedFlagsWithTime.length);
    }
    
    // Flag type distribution
    const typeStats = await Flag.aggregate([
      {
        $group: {
          _id: '$flagType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Severity distribution
    const severityStats = await Flag.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      totalFlags,
      pendingFlags,
      resolvedFlags,
      dismissedFlags,
      escalatedFlags,
      flagsToday,
      highPriorityFlags,
      avgResolutionTime,
      typeDistribution: typeStats,
      severityDistribution: severityStats
    });
  } catch (err) {
    logger.error("Get flag stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });
    const reportedUsers = await User.countDocuments({ 'moderation.reported': true });
    
    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
    
    // New users this week
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });
    
    // Most active users (by trip count)
    const mostActiveUsers = await User.aggregate([
      {
        $lookup: {
          from: 'trips',
          localField: '_id',
          foreignField: 'creator',
          as: 'trips'
        }
      },
      {
        $addFields: {
          tripCount: { $size: '$trips' }
        }
      },
      {
        $sort: { tripCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          name: 1,
          email: 1,
          tripCount: 1,
          createdAt: 1
        }
      }
    ]);
    
    // User verification status
    const verificationStats = await User.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Recent signups
    const recentSignups = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt verificationStatus');

    res.status(200).json({
      totalUsers,
      activeUsers,
      bannedUsers,
      reportedUsers,
      newUsersToday,
      newUsersThisWeek,
      mostActiveUsers,
      verificationStats,
      recentSignups
    });
  } catch (err) {
    logger.error("Get user stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get reported users
export const getReportedUsers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = { 'moderation.reported': true };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // Enhance users with additional data
    const enhancedUsers = users.map(user => ({
      ...user.toObject(),
      status: user.isBanned ? 'banned' : user.status || 'active',
      verificationStatus: user.verificationStatus || 'pending'
    }));
    
    const total = await User.countDocuments(filter);
    
    res.status(200).json({ users: enhancedUsers, total });
  } catch (err) {
    logger.error("Get reported users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk user operations
export const bulkUserOperations = async (req, res) => {
  try {
    const { userIds, action } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required." });
    }

    if (!['ban', 'unban', 'warn', 'delete'].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    let updateData = {};
    if (action === 'ban') {
      updateData = { 
        status: 'banned',
        'moderation.bannedAt': new Date()
      };
    } else if (action === 'unban') {
      updateData = { 
        status: 'active',
        'moderation.unbannedAt': new Date()
      };
    } else if (action === 'warn') {
      updateData = { 
        'moderation.warnedAt': new Date(),
        'moderation.warningCount': { $inc: 1 }
      };
    }

    let result;
    if (action === 'delete') {
      result = await User.deleteMany({ _id: { $in: userIds } });
    } else {
      result = await User.updateMany(
        { _id: { $in: userIds } },
        updateData,
        { new: true }
      );
    }

    // Log bulk user action
    await AdminLog.create({
      adminId: req.user.userId,
      action: `bulk ${action} users`,
      targetUserIds: userIds,
      reason: `Bulk user ${action} - Admin action`
    });

    res.status(200).json({
      message: `${userIds.length} users ${action}ed.`,
      updatedCount: userIds.length
    });
  } catch (err) {
    logger.error("Bulk user operations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get enhanced review statistics
export const getReviewStats = async (req, res) => {
  try {
    const totalReviews = await Review.countDocuments();
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const approvedReviews = await Review.countDocuments({ status: 'approved' });
    const rejectedReviews = await Review.countDocuments({ status: 'rejected' });
    const flaggedReviews = await Review.countDocuments({ flagged: true });
    
    // Rating distribution
    const ratingStats = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    // Reviews today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewsToday = await Review.countDocuments({ createdAt: { $gte: today } });
    
    // Average rating
    const avgRating = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    // Most active reviewers
    const topReviewers = await Review.aggregate([
      {
        $group: {
          _id: '$reviewer',
          reviewCount: { $sum: 1 }
        }
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'reviewerInfo'
        }
      }
    ]);
    
    // Most reviewed targets
    const topTargets = await Review.aggregate([
      {
        $group: {
          _id: { 
            reviewType: '$reviewType',
            targetId: { $ifNull: ['$tripId', '$reviewedUser'] }
          },
          reviewCount: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      totalReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      flaggedReviews,
      reviewsToday,
      avgRating: avgRating[0]?.avgRating || 0,
      ratingDistribution: ratingStats,
      topReviewers,
      topTargets
    });
  } catch (err) {
    logger.error("Get review stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all flags with filters
export const getAllFlags = async (req, res) => {
  try {
    const { status, severity, type, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (status === 'pending') {
      filter.resolved = false;
      filter.dismissed = false;
    } else if (status === 'resolved') {
      filter.resolved = true;
    } else if (status === 'dismissed') {
      filter.dismissed = true;
    } else if (status === 'escalated') {
      filter.escalated = true;
    }
    
    if (severity) filter.severity = severity;
    if (type) filter.flagType = type;
    if (search) {
      filter.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const flags = await Flag.find(filter)
      .populate('flaggedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // Manually populate target data based on flag type
    const enhancedFlags = await Promise.all(flags.map(async (flag) => {
      const enhancedFlag = flag.toObject();
      
      // Populate target data based on flag type
      if (flag.flagType === 'user') {
        const user = await User.findById(flag.targetId).select('name email');
        enhancedFlag.targetId = {
          name: user ? user.name : 'Deleted User',
          email: user ? user.email : 'No email'
        };
      } else if (flag.flagType === 'trip') {
        const trip = await Trip.findById(flag.targetId).populate('creator', 'name email').select('destination description creator');
        enhancedFlag.targetId = {
          destination: trip ? trip.destination : 'Deleted Trip',
          description: trip ? trip.description : 'No description',
          creator: trip && trip.creator ? {
            name: trip.creator.name || 'Unknown Creator',
            email: trip.creator.email || 'No email'
          } : { name: 'Unknown Creator', email: 'No email' }
        };
      } else if (flag.flagType === 'review') {
        const review = await Review.findById(flag.targetId).select('feedback rating');
        enhancedFlag.targetId = {
          feedback: review ? review.feedback : 'Deleted Review',
          rating: review ? review.rating : 0
        };
      }
      
      // Ensure flaggedBy has proper data - fix "Anonymous" issue
      if (flag.flaggedBy) {
        enhancedFlag.flaggedBy = {
          name: flag.flaggedBy.name || 'Anonymous User',
          email: flag.flaggedBy.email || 'No email provided'
        };
      } else {
        enhancedFlag.flaggedBy = { name: 'Anonymous User', email: 'No email provided' };
      }
      

      
      return enhancedFlag;
    }));
    
    const total = await Flag.countDocuments(filter);
    
    res.status(200).json({ flags: enhancedFlags, total });
  } catch (err) {
    logger.error("Get all flags error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk flag operations
export const bulkFlagOperations = async (req, res) => {
  try {
    const { flagIds, action } = req.body;
    
    if (!flagIds || !Array.isArray(flagIds) || flagIds.length === 0) {
      return res.status(400).json({ message: "Flag IDs array is required." });
    }

    if (!['resolve', 'dismiss', 'delete', 'escalate'].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    let updateData = {};
    if (action === 'resolve') {
      updateData = { resolved: true, resolvedAt: new Date() };
    } else if (action === 'dismiss') {
      updateData = { dismissed: true, dismissedAt: new Date() };
    } else if (action === 'escalate') {
      updateData = { escalated: true, escalatedAt: new Date() };
    }

    let result;
    if (action === 'delete') {
      result = await Flag.deleteMany({ _id: { $in: flagIds } });
    } else {
      result = await Flag.updateMany(
        { _id: { $in: flagIds } },
        updateData,
        { new: true }
      );
    }

    // Log bulk flag action
    await AdminLog.create({
      adminId: req.user.userId,
      action: `bulk ${action} flags`,
      targetFlagIds: flagIds,
      reason: `Bulk flag ${action} - Admin action`
    });

    res.status(200).json({
      message: `${flagIds.length} flags ${action}ed.`,
      updatedCount: flagIds.length
    });
  } catch (err) {
    logger.error("Bulk flag operations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk review operations
export const bulkReviewOperations = async (req, res) => {
  try {
    const { reviewIds, action } = req.body;
    
    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ message: "Review IDs array is required." });
    }

    if (!['approve', 'reject', 'delete', 'flag', 'unflag'].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    let updateData = {};
    if (action === 'approve') {
      updateData = { status: 'approved' };
    } else if (action === 'reject') {
      updateData = { status: 'rejected' };
    } else if (action === 'flag') {
      updateData = { flagged: true };
    } else if (action === 'unflag') {
      updateData = { flagged: false };
    }

    let result;
    if (action === 'delete') {
      result = await Review.deleteMany({ _id: { $in: reviewIds } });
    } else {
      result = await Review.updateMany(
        { _id: { $in: reviewIds } },
        updateData,
        { new: true }
      );
    }

    // Log bulk review action
    await AdminLog.create({
      adminId: req.user.userId,
      action: `bulk ${action} reviews`,
      targetReviewIds: reviewIds,
      reason: `Bulk review ${action} - Admin action`
    });

    res.status(200).json({
      message: `${reviewIds.length} reviews ${action}ed.`,
      updatedCount: reviewIds.length
    });
  } catch (err) {
    logger.error("Bulk review operations error:", err);
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

// Get all admin logs with enhanced filtering and analytics
export const getAdminLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      adminId, 
      action, 
      dateFrom, 
      dateTo,
      status 
    } = req.query;
    
    const filter = {};
    
    // Search filter
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { 'adminId.name': { $regex: search, $options: 'i' } },
        { 'targetUserId.name': { $regex: search, $options: 'i' } },
        { 'targetUserId.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Admin filter
    if (adminId) {
      filter.adminId = adminId;
    }
    
    // Action filter
    if (action) {
      filter.action = { $regex: action, $options: 'i' };
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const logs = await AdminLog.find(filter)
      .populate('adminId', 'name email')
      .populate('targetUserId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // Enhance logs with better fallback data for missing users
    const enhancedLogs = logs.map(log => {
      const enhancedLog = log.toObject();
      
      // Handle missing admin data
      if (!enhancedLog.adminId) {
        enhancedLog.adminId = {
          name: 'Deleted Admin',
          email: 'No email available'
        };
      } else if (!enhancedLog.adminId.name) {
        enhancedLog.adminId.name = enhancedLog.adminId.name || 'Unknown Admin';
        enhancedLog.adminId.email = enhancedLog.adminId.email || 'No email available';
      }
      
      // Handle missing target user data
      if (!enhancedLog.targetUserId) {
        enhancedLog.targetUserId = {
          name: 'Deleted User',
          email: 'No email available'
        };
      } else if (!enhancedLog.targetUserId.name) {
        enhancedLog.targetUserId.name = enhancedLog.targetUserId.name || 'Unknown User';
        enhancedLog.targetUserId.email = enhancedLog.targetUserId.email || 'No email available';
      }
      
      return enhancedLog;
    });
    
    const total = await AdminLog.countDocuments(filter);
    
    res.status(200).json({ logs: enhancedLogs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    logger.error("Log Fetch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get admin logs analytics
export const getAdminLogsAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }
    
    // Total logs
    const totalLogs = await AdminLog.countDocuments(dateFilter);
    
    // Today's actions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActions = await AdminLog.countDocuments({
      ...dateFilter,
      createdAt: { $gte: today }
    });
    
    // Action types count
    const actionTypes = await AdminLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Admin activity breakdown
    const adminActivity = await AdminLog.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'adminId',
          foreignField: '_id',
          as: 'admin'
        }
      },
      {
        $group: {
          _id: '$adminId',
          adminName: { $first: '$admin.name' },
          actionCount: { $sum: 1 }
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 5 }
    ]);
    
    // Daily activity for the last 7 days
    const dailyActivity = await AdminLog.aggregate([
      {
        $match: {
          ...dateFilter,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Action categories
    const actionCategories = await AdminLog.aggregate([
      { $match: dateFilter },
      {
        $addFields: {
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$action', regex: 'user|ban|unban|warn' } }, then: 'User Management' },
                { case: { $regexMatch: { input: '$action', regex: 'trip|delete.*trip' } }, then: 'Trip Management' },
                { case: { $regexMatch: { input: '$action', regex: 'review|approve|reject' } }, then: 'Content Moderation' },
                { case: { $regexMatch: { input: '$action', regex: 'kyc|verify' } }, then: 'KYC Management' },
                { case: { $regexMatch: { input: '$action', regex: 'flag|resolve|dismiss' } }, then: 'Flag Management' }
              ],
              default: 'Other'
            }
          }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Current active admin
    const currentAdmin = await AdminLog.findOne()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      totalLogs,
      todayActions,
      actionTypes: actionTypes.length,
      currentAdmin: currentAdmin?.adminId?.name || 'No recent activity',
      actionBreakdown: actionTypes,
      adminActivity,
      dailyActivity,
      actionCategories
    });
  } catch (err) {
    logger.error('Get Admin Logs Analytics Error:', err);
    res.status(500).json({ message: 'Server error' });
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
