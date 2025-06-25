import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import AdminLog from '../models/AdminLog.js';
import { validationResult } from 'express-validator';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

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
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    logger.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { phone, gender, preferences } = req.body;
    const idDocument = req.files?.idDocument?.[0]?.path;
    const profileImage = req.files?.profileImage?.[0]?.path;
    // Only set verificationStatus to 'pending' if uploading a new doc or not verified
    const user = await User.findById(req.user.userId);
    let updateFields = { phone, gender, preferences };
    if (profileImage) {
      updateFields.profileImage = profileImage;
    }
    if (idDocument) {
      updateFields.idDocument = idDocument;
      updateFields.verificationStatus = 'pending';
    } else if (user.verificationStatus !== 'verified') {
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
    const users = await User.find({ verificationStatus: "pending" }).select('name email verificationStatus createdAt');
    res.status(200).json(users);
  } catch (err) {
    logger.error("Fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      id,
      { verificationStatus: status },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: "User not found." });
    await AdminLog.create({
      adminId: req.user.userId,
      action: `Marked user as ${status}`,
      targetUserId: id,
      reason: status === 'verified' ? 'KYC accepted' : 'KYC document invalid'
    });
    res.status(200).json({ message: `User ${status}`, user });
  } catch (err) {
    logger.error("Verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

