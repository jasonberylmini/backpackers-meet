import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import AdminLog from '../models/AdminLog.js';
import { validationResult } from 'express-validator';
import winston from 'winston';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, passwordHash });
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

// 3. Update profile: allow bio, notificationPrefs, dateOfBirth, username, country, instagram, languages, coverImage
export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { phone, gender, preferences, bio, notificationPrefs, dateOfBirth, username, country, instagram, languages, coverImage } = req.body;
    const idDocument = req.files?.idDocument?.[0]?.path;
    const idSelfie = req.files?.idSelfie?.[0]?.path;
    const profileImage = req.files?.profileImage?.[0]?.path;
    const coverImageFile = req.files?.coverImage?.[0]?.path;
    const user = await User.findById(req.user.userId);
    let updateFields = { phone, gender, preferences };
    if (bio !== undefined) updateFields.bio = bio;
    if (notificationPrefs !== undefined) updateFields.notificationPrefs = notificationPrefs;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (username !== undefined) updateFields.username = username;
    if (country !== undefined) updateFields.country = country;
    if (instagram !== undefined) updateFields.instagram = instagram;
    if (languages !== undefined) updateFields.languages = languages;
    if (profileImage) {
      updateFields.profileImage = profileImage;
    }
    if (coverImageFile) {
      updateFields.coverImage = coverImageFile;
    } else if (coverImage !== undefined) {
      updateFields.coverImage = coverImage;
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
      message: "Profile updated and KYC submitted.",
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

