import express from 'express';
import { submitFlag, getAllFlags } from '../controllers/flagController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/submit', verifyToken, submitFlag);
router.get('/all', verifyToken, getAllFlags); // restrict this to admin in frontend

export default router;
