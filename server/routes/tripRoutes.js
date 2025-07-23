import express from 'express';
import { createTrip, getMyTrips, joinTrip, browseTrips, leaveTrip, updateTrip } from '../controllers/tripController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', verifyToken, createTrip);
router.get('/mine', verifyToken, getMyTrips);
router.post('/join/:tripId', verifyToken, joinTrip);
router.get('/browse', verifyToken, browseTrips);
router.post('/leave/:tripId', verifyToken, leaveTrip);
router.put('/update/:tripId', verifyToken, updateTrip);

export default router;
