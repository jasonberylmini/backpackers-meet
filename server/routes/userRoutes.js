import express from 'express';
import {
  registerUser,
  loginUser,
  updateProfile,
  getUnverifiedUsers,
  verifyUser,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getUserById
} from '../controllers/userController.js';
import upload from '../middlewares/upload.js';
import verifyToken from '../middlewares/authMiddleware.js';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';

// router.post('/create-trip', verifyToken, createTrip);
// router.get('/my-profile', verifyToken, getProfile);


const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many attempts, please try again later.'
});

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

router.put('/profile',
  verifyToken,
  upload.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'idSelfie', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  [
    body('phone').optional().isString(),
    body('gender').optional().isString(),
    body('preferences').optional().isString()
  ],
  updateProfile
);

router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/validate-reset-token', validateResetToken);

// ✅ Admin routes
router.get('/admin/unverified', getUnverifiedUsers);
router.put('/admin/verify/:id', verifyUser);
router.get('/:id', getUserById);

export default router;
