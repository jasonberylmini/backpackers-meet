import express from 'express';
import { sendMessage, getTripMessages } from '../controllers/chatController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', verifyToken, sendMessage);
router.get('/:tripId', verifyToken, getTripMessages);

export default router;
