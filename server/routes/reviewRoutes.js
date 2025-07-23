import express from 'express';
import { giveReview, getUserReviews, getTripReviews, deleteReview, getAllReviews, flagReview, unflagReview } from '../controllers/reviewController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/submit', verifyToken, giveReview);
router.get('/user/:userId', verifyToken, getUserReviews);
router.get('/trip/:tripId', verifyToken, getTripReviews);
router.get('/all', verifyToken, getAllReviews); // Admin: get all reviews with filters
router.put('/:reviewId/flag', verifyToken, flagReview); // Admin: flag a review
router.put('/:reviewId/unflag', verifyToken, unflagReview); // Admin: unflag a review
router.delete('/:reviewId', verifyToken, deleteReview); // TODO: restrict to admin

export default router;
