import express from 'express';
import { giveReview, updateReview, getUserReviews, getTripReviews, deleteReview, getAllReviews, flagReview, unflagReview, getReviewsForModeration, checkReviewPermissions } from '../controllers/reviewController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';
import { moderateBodyField } from '../middlewares/moderation.js';

const router = express.Router();

router.post('/submit', verifyToken, moderateBodyField('feedback'), giveReview);
router.put('/:reviewId', verifyToken, moderateBodyField('feedback'), updateReview);
router.get('/permissions', verifyToken, checkReviewPermissions);
router.get('/trip/:tripId', verifyToken, getTripReviews);
router.get('/user/:userId', verifyToken, getUserReviews);
router.delete('/:reviewId', verifyToken, deleteReview);
router.post('/:reviewId/flag', verifyToken, flagReview);
router.delete('/:reviewId/flag', verifyToken, unflagReview);

// Admin routes for review management
router.get('/all', verifyToken, isAdmin, getAllReviews);
router.get('/moderation', verifyToken, isAdmin, getReviewsForModeration);

export default router;
