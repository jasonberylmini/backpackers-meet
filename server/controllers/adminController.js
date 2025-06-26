import User from '../models/User.js';
import Trip from '../models/Trip.js';
import AdminLog from '../models/AdminLog.js';
import Flag from '../models/Flag.js';
import winston from 'winston';
import Review from '../models/Review.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role verificationStatus isBanned createdAt gender preferences idDocument');
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
      const userFlags = await Flag.countDocuments({ type: 'user' });
      const reviewFlags = await Flag.countDocuments({ type: 'review' });
      const topFlaggedUsersAgg = await Flag.aggregate([
        { $match: { type: 'user' } },
        { $group: { _id: '$targetId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]);
      const topFlaggedUsers = await User.find({ _id: { $in: topFlaggedUsersAgg.map(u => u._id) } })
        .select('name email')
        .lean();
      const topUsers = topFlaggedUsersAgg.map(u => {
        const user = topFlaggedUsers.find(usr => usr._id.toString() === u._id.toString());
        return user ? { ...user, count: u.count } : null;
      }).filter(Boolean);
      const topFlaggedReviewsAgg = await Flag.aggregate([
        { $match: { type: 'review' } },
        { $group: { _id: '$targetId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]);
      const topFlaggedReviews = await Review.find({ _id: { $in: topFlaggedReviewsAgg.map(r => r._id) } })
        .select('comment rating tripId reviewer')
        .populate('reviewer', 'name email')
        .lean();
      const topReviews = topFlaggedReviewsAgg.map(r => {
        const review = topFlaggedReviews.find(rv => rv._id.toString() === r._id.toString());
        return review ? { ...review, count: r.count } : null;
      }).filter(Boolean);
      return res.status(200).json({
        reportType: 'flag',
        totalFlags,
        byType: { user: userFlags, review: reviewFlags },
        topFlaggedUsers: topUsers,
        topFlaggedReviews: topReviews
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
