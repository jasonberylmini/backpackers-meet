import express from 'express';
import { createTrip, getMyTrips, getTripById, joinTrip, browseTrips, leaveTrip, updateTrip, deleteTrip } from '../controllers/tripController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/create', verifyToken, upload.single('image'), createTrip);
router.get('/mine', verifyToken, getMyTrips);
router.get('/browse', verifyToken, browseTrips);
router.get('/:tripId', verifyToken, getTripById);
router.post('/join/:tripId', verifyToken, joinTrip);
router.post('/leave/:tripId', verifyToken, leaveTrip);
router.put('/update/:tripId', verifyToken, updateTrip);
router.delete('/delete/:tripId', verifyToken, deleteTrip);

// Invite user to trip by user ID
router.post('/:tripId/invite', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user.userId;

    // Check if trip exists and current user is the creator
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.creator.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Only trip creator can invite members' });
    }

    // Check if user to invite exists
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    if (trip.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member of this trip' });
    }

    // Check if trip is full
    if (trip.maxMembers && trip.members.length >= trip.maxMembers) {
      return res.status(400).json({ message: 'Trip is full' });
    }

    // Add user to trip members
    trip.members.push(userId);
    await trip.save();

    // Add trip to user's joinedGroups
    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedGroups: tripId }
    });

    res.json({ message: 'User invited successfully' });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Invite user to trip by email
router.post('/:tripId/invite-email', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { email } = req.body;
    const currentUserId = req.user.userId;

    // Check if trip exists and current user is the creator
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.creator.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Only trip creator can invite members' });
    }

    // Find user by email
    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    // Check if user is already a member
    if (trip.members.includes(userToInvite._id)) {
      return res.status(400).json({ message: 'User is already a member of this trip' });
    }

    // Check if trip is full
    if (trip.maxMembers && trip.members.length >= trip.maxMembers) {
      return res.status(400).json({ message: 'Trip is full' });
    }

    // Add user to trip members
    trip.members.push(userToInvite._id);
    await trip.save();

    // Add trip to user's joinedGroups
    await User.findByIdAndUpdate(userToInvite._id, {
      $addToSet: { joinedGroups: tripId }
    });

    res.json({ message: 'User invited successfully' });
  } catch (error) {
    console.error('Invite by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
