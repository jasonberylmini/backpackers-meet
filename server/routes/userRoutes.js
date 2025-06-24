import express from 'express';
import {
  registerUser,
  loginUser,
  updateProfile,
  getUnverifiedUsers,
  verifyUser
} from '../controllers/userController.js';
import upload from '../middlewares/upload.js';
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

router.post('/update-profile',
  upload.single('idDocument'),
  [
    body('phone').optional().isString(),
    body('gender').optional().isString(),
    body('preferences').optional().isString()
  ],
  updateProfile
);


// ✅ Admin routes
router.get('/admin/unverified', getUnverifiedUsers);
router.put('/admin/verify/:id', verifyUser);

export default router;
