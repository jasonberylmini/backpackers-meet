import express from 'express';
import { createTrip, getMyTrips, joinTrip, browseTrips, leaveTrip } from '../controllers/tripController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', verifyToken, createTrip);
router.get('/mine', verifyToken, getMyTrips);
router.post('/join/:tripId', verifyToken, joinTrip);
router.get('/browse', verifyToken, browseTrips);
router.post('/leave/:tripId', verifyToken, leaveTrip);

export default router;
