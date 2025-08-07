import express from 'express';
import { giveReview, updateReview, getUserReviews, getTripReviews, deleteReview, getAllReviews, flagReview, unflagReview, getReviewsForModeration, checkReviewPermissions } from '../controllers/reviewController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/submit', verifyToken, giveReview);
router.put('/:reviewId', verifyToken, updateReview);
router.get('/permissions', verifyToken, checkReviewPermissions);
router.get('/trip/:tripId', verifyToken, getTripReviews);
router.get('/user/:userId', verifyToken, getUserReviews);
router.delete('/:reviewId', verifyToken, deleteReview);
router.post('/:reviewId/flag', verifyToken, flagReview);
router.delete('/:reviewId/flag', verifyToken, unflagReview);

export default router;
