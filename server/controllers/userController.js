import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Expense from '../models/Expense.js';
import Review from '../models/Review.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import AdminLog from '../models/AdminLog.js';
import { validationResult } from 'express-validator';
import winston from 'winston';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { generateUniqueUsername } from '../utils/usernameGenerator.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// 1. Register: only accept name, email, password
export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Email already registered." });
    }
    
    // Generate a unique username from the user's name
    const username = await generateUniqueUsername(name);
    
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, passwordHash, username });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    logger.error("Registration Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. Login: update lastLogin, expose new fields
export const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "Your account is banned." });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role || 'traveler'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
        bio: user.bio,
        notificationPrefs: user.notificationPrefs,
        dateOfBirth: user.dateOfBirth,
        lastLogin: user.lastLogin,
        accountStatus: user.accountStatus,
        deletedAt: user.deletedAt
      }
    });
  } catch (err) {
    logger.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Get profile: return current user's profile data
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (err) {
    logger.error("Get Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 4. Update profile: allow bio, notificationPrefs, dateOfBirth, username, country, instagram, languages, coverImage
export const updateProfile = async (req, res) => {
  try {
    const { phone, gender, preferences, bio, notificationPrefs, dateOfBirth, username, country, instagram, languages } = req.body;
    const idDocument = req.files?.idDocument?.[0]?.path;
    const idSelfie = req.files?.idSelfie?.[0]?.path;
    const profileImage = req.files?.profileImage?.[0]?.path;
    const coverImageFile = req.files?.coverImage?.[0]?.path;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let updateFields = {};
    
    // Handle text fields
    if (phone !== undefined) updateFields.phone = phone;
    if (gender !== undefined) updateFields.gender = gender;
    if (preferences !== undefined) updateFields.preferences = preferences;
    if (bio !== undefined) updateFields.bio = bio;
    if (notificationPrefs !== undefined) {
      try {
        updateFields.notificationPrefs = JSON.parse(notificationPrefs);
      } catch (e) {
        updateFields.notificationPrefs = notificationPrefs;
      }
    }
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (username !== undefined) {
      // Check if username is already taken by another user
      const existingUser = await User.findOne({ username, _id: { $ne: req.user.userId } });
      if (existingUser) {
        return res.status(409).json({ message: "Username is already taken." });
      }
      updateFields.username = username;
    }
    if (country !== undefined) updateFields.country = country;
    if (instagram !== undefined) updateFields.instagram = instagram;
    if (languages !== undefined) updateFields.languages = languages;
    
    // Handle file uploads
    if (profileImage) {
      // Handle both forward and backward slashes for cross-platform compatibility
      const profileFilename = profileImage.split(/[/\\]/).pop(); // Store just the filename
      updateFields.profileImage = profileFilename;
      console.log('Saving profileImage:', updateFields.profileImage);
      console.log('Original profileImage path:', profileImage);
    }
    if (coverImageFile) {
      // Handle both forward and backward slashes for cross-platform compatibility
      const coverFilename = coverImageFile.split(/[/\\]/).pop(); // Store just the filename
      updateFields.coverImage = coverFilename;
      console.log('Saving coverImage:', updateFields.coverImage);
      console.log('Original coverImage path:', coverImageFile);
    }
    if (idDocument) {
      updateFields.idDocument = idDocument;
      updateFields.verificationStatus = 'pending';
    }
    if (idSelfie) {
      updateFields.idSelfie = idSelfie;
      updateFields.verificationStatus = 'pending';
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateFields,
      { new: true }
    ).select('-passwordHash');
    
    res.status(200).json({
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (err) {
    logger.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUnverifiedUsers = async (req, res) => {
  try {
    const users = await User.find({ verificationStatus: "pending" }).select('name email gender preferences idDocument verificationStatus createdAt');
    res.status(200).json(users);
  } catch (err) {
    logger.error("Fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;
    const user = await User.findByIdAndUpdate(
      id,
      { verificationStatus },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: "User not found." });
    await AdminLog.create({
      adminId: req.user.userId,
      action: `Marked user as ${verificationStatus}`,
      targetUserId: id,
      reason: verificationStatus === 'verified' ? 'KYC accepted' : 'KYC document invalid'
    });
    res.status(200).json({ message: `User ${verificationStatus}`, user });
  } catch (err) {
    logger.error("Verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password Controller
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Always respond with success to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      text: `You requested a password reset. Click the link to reset your password: ${resetUrl}\n\nThis link is valid for 5 minutes. If you did not request this, please ignore this email.`
    };
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset Password Controller
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    logger.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate Reset Token Controller
export const validateResetToken = async (req, res) => {
  const { token } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(200).json({ valid: false, message: 'This reset link has expired or is invalid.' });
    }
    return res.status(200).json({ valid: true });
  } catch (err) {
    logger.error('Validate Reset Token Error:', err);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
};

// 4. Admin: change accountStatus, soft delete
export const setUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;
    let update = { accountStatus };
    if (accountStatus === 'deleted') {
      update.deletedAt = new Date();
    }
    const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: "User not found." });
    await AdminLog.create({
      adminId: req.user.userId,
      action: `Set user status to ${accountStatus}`,
      targetUserId: id,
      reason: 'Admin status change'
    });
    res.status(200).json({ message: `User status set to ${accountStatus}`, user });
  } catch (err) {
    logger.error("Set User Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 5. Get user by id: expose all new fields
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ user });
  } catch (err) {
    logger.error("Get User By Id Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Prevent self-blocking
    if (currentUserId === userId) {
      return res.status(400).json({ message: 'You cannot block yourself.' });
    }
    
    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User to block not found.' });
    }
    
    // Check if already blocked
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found.' });
    }
    
    if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User already blocked.' });
    }
    
    // Add user to blocked list
    await User.findByIdAndUpdate(currentUserId, { 
      $addToSet: { blockedUsers: userId },
      updatedAt: new Date()
    });
    
    // Log the action
    await AdminLog.create({
      adminId: currentUserId,
      action: 'blocked user',
      targetUserId: userId,
      outcome: `User ${currentUser.name} blocked ${targetUser.name}`
    });
    
    res.status(200).json({ 
      message: 'User blocked successfully.',
      blockedUser: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      }
    });
  } catch (err) {
    logger.error('Block User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User to unblock not found.' });
    }
    
    // Check if user is actually blocked
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found.' });
    }
    
    if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is not blocked.' });
    }
    
    // Remove user from blocked list
    await User.findByIdAndUpdate(currentUserId, { 
      $pull: { blockedUsers: userId },
      updatedAt: new Date()
    });
    
    // Log the action
    await AdminLog.create({
      adminId: currentUserId,
      action: 'unblocked user',
      targetUserId: userId,
      outcome: `User ${currentUser.name} unblocked ${targetUser.name}`
    });
    
    res.status(200).json({ 
      message: 'User unblocked successfully.',
      unblockedUser: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      }
    });
  } catch (err) {
    logger.error('Unblock User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get blocked users list
export const getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    const currentUser = await User.findById(currentUserId).populate('blockedUsers', 'name email profileImage');
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.status(200).json({ 
      blockedUsers: currentUser.blockedUsers || [],
      count: currentUser.blockedUsers ? currentUser.blockedUsers.length : 0
    });
  } catch (err) {
    logger.error('Get Blocked Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard endpoints
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's verification status
    const user = await User.findById(userId).select('verificationStatus');
    
    // Count user's trips
    const totalTrips = await Trip.countDocuments({
      $or: [
        { creator: userId },
        { members: userId }
      ]
    });
    
    // Count completed trips (past end date)
    const completedTrips = await Trip.countDocuments({
      $or: [
        { creator: userId },
        { members: userId }
      ],
      endDate: { $lt: new Date() }
    });
    
    // Count upcoming trips (future start date)
    const upcomingTrips = await Trip.countDocuments({
      $or: [
        { creator: userId },
        { members: userId }
      ],
      startDate: { $gt: new Date() }
    });
    
    // Calculate total expenses
    const expenses = await Expense.find({
      tripId: {
        $in: await Trip.find({
          $or: [
            { creator: userId },
            { members: userId }
          ]
        }).distinct('_id')
      }
    });
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Count user's reviews
    const totalReviews = await Review.countDocuments({ author: userId });
    
    res.status(200).json({
      totalTrips,
      completedTrips,
      upcomingTrips,
      totalExpenses,
      totalReviews,
      verificationStatus: user.verificationStatus
    });
  } catch (error) {
    logger.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

export const getDashboardTrips = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's recent trips
    const trips = await Trip.find({
      $or: [
        { creator: userId },
        { members: userId }
      ]
    })
    .populate('creator', 'name username profileImage')
    .populate('members', 'name username profileImage')
    .sort({ startDate: -1 })
    .limit(10);
    
    res.status(200).json(trips);
  } catch (error) {
    logger.error('Dashboard Trips Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard trips' });
  }
};

