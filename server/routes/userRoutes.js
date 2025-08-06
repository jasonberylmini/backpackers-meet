import express from 'express';
import { registerUser, loginUser, getProfile, updateProfile, getUnverifiedUsers, verifyUser, forgotPassword, resetPassword, validateResetToken, setUserStatus, getUserById, blockUser, unblockUser, getBlockedUsers, getDashboardStats, getDashboardTrips } from '../controllers/userController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';
import upload from '../middlewares/upload.js';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js'; // Added import for User model

// router.post('/create-trip', verifyToken, createTrip);
// router.get('/my-profile', verifyToken, getProfile);


const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many attempts, please try again later.'
});

// Public routes
router.post('/register',
  authLimiter,
  [
    body('name').isString().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  registerUser
);

router.post('/login',
  authLimiter,
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  loginUser
);

router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/validate-reset-token', validateResetToken);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 },
  { name: 'idSelfie', maxCount: 1 }
]), updateProfile);

// Dashboard routes
router.get('/dashboard/stats', verifyToken, getDashboardStats);
router.get('/dashboard/trips', verifyToken, getDashboardTrips);

router.get('/unverified', verifyToken, isAdmin, getUnverifiedUsers);

// Search users - must come before parameterized routes
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
    }

    const searchQuery = new RegExp(q.trim(), 'i');
    const users = await User.find({
      username: searchQuery,
      _id: { $ne: req.user.userId } // Exclude current user
    })
    .select('username name country profileImage')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', verifyToken, getUserById);

// User blocking/unblocking
router.post('/:userId/block', verifyToken, blockUser);
router.post('/:userId/unblock', verifyToken, unblockUser);
router.get('/blocked/list', verifyToken, getBlockedUsers);

export default router;
