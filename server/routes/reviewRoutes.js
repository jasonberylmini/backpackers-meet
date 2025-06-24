import express from 'express';
import { giveReview, getUserReviews } from '../controllers/reviewController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/submit', verifyToken, giveReview);
router.get('/user/:userId', verifyToken, getUserReviews);

export default router;
