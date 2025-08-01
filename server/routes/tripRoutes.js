import express from 'express';
import { createTrip, getMyTrips, getTripById, joinTrip, browseTrips, leaveTrip, updateTrip, deleteTrip } from '../controllers/tripController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/create', verifyToken, upload.single('image'), createTrip);
router.get('/mine', verifyToken, getMyTrips);
router.get('/browse', verifyToken, browseTrips);
router.get('/:tripId', verifyToken, getTripById);
router.post('/join/:tripId', verifyToken, joinTrip);
router.post('/leave/:tripId', verifyToken, leaveTrip);
router.put('/update/:tripId', verifyToken, updateTrip);
router.delete('/delete/:tripId', verifyToken, deleteTrip);

export default router;
