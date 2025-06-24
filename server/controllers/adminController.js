import User from '../models/User.js';
import Trip from '../models/Trip.js';
import SystemReport from '../models/SystemReport.js';
import AdminLog from '../models/AdminLog.js';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role verificationStatus isBanned createdAt');
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
    const trips = await Trip.find().populate('members', 'name email').select('creator destination date budget tripType members createdAt');
    res.status(200).json(trips);
  } catch (err) {
    logger.error("Get Trips Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ This is for POST /admin/report
export const generateReport = async (req, res) => {
  try {
    const { reportType, data } = req.body;
    const newReport = new SystemReport({
      reportType,
      data,
      generatedFor: req.user.userId
    });
    await newReport.save();
    res.status(201).json({ message: "Report created", report: newReport });
  } catch (err) {
    logger.error("Report Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ This is for GET /admin/reports
export const getReports = async (req, res) => {
  try {
    const reports = await SystemReport.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (err) {
    logger.error("Fetch Reports Error:", err);
    res.status(500).json({ message: "Server error" });
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
