import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';
import { 
  createTrip, 
  getMyTrips, 
  getTripById, 
  joinTrip, 
  browseTrips, 
  leaveTrip, 
  updateTrip, 
  deleteTrip,
  getCompletedTripsWithUser,
  markTripAsCompleted
} from '../controllers/tripController.js';
import { sendNotification } from '../utils/sendNotification.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

import { emitToUser } from '../utils/socketManager.js';
import mongoose from 'mongoose';

const router = express.Router();

router.post('/create', verifyToken, upload.single('image'), createTrip);
router.get('/mine', verifyToken, getMyTrips);
router.get('/browse', verifyToken, browseTrips);
router.get('/completed-with-user/:userId', verifyToken, getCompletedTripsWithUser);
router.get('/:tripId', verifyToken, getTripById);
router.post('/join/:tripId', verifyToken, joinTrip);
router.post('/leave/:tripId', verifyToken, leaveTrip);
router.put('/update/:tripId', verifyToken, updateTrip);
router.delete('/delete/:tripId', verifyToken, deleteTrip);
router.post('/:tripId/complete', verifyToken, markTripAsCompleted);

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

    // Check if invitation notification already exists
    const existingNotification = await Notification.findOne({
      user: userId,
      type: 'invitation',
      'data.tripId': tripId,
      read: false
    });

    if (existingNotification) {
      return res.status(400).json({ message: 'Invitation already sent to this user' });
    }

    // Send notification to invited user
    await sendNotification({
      user: userToInvite,
      type: 'trip',
      title: 'Trip Invitation',
      message: `You've been invited to join the trip "${trip.destination}" by ${trip.creator.name || trip.creator.username}. Click to view and respond.`,
      data: {
        tripId: tripId,
        tripName: trip.destination,
        actionUrl: `/trips/${tripId}`
      },
      relatedTrip: tripId,
      sentBy: currentUserId
    });

    res.json({ message: 'Invitation sent successfully' });
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

    // Check if invitation notification already exists
    const existingNotification = await Notification.findOne({
      user: userToInvite._id,
      type: 'invitation',
      'data.tripId': tripId,
      read: false
    });

    if (existingNotification) {
      return res.status(400).json({ message: 'Invitation already sent to this user' });
    }

    // Send notification to invited user
    await sendNotification({
      user: userToInvite,
      type: 'trip',
      title: 'Trip Invitation',
      message: `You've been invited to join the trip "${trip.destination}" by ${trip.creator.name || trip.creator.username}. Click to view and respond.`,
      data: {
        tripId: tripId,
        tripName: trip.destination,
        actionUrl: `/trips/${tripId}`
      },
      relatedTrip: tripId,
      sentBy: currentUserId
    });

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invite by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept trip invitation
router.post('/:tripId/accept-invitation', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const currentUserId = req.user.userId;

    // Find pending invitation notification
    const invitationNotification = await Notification.findOne({
      user: currentUserId,
      type: 'invitation',
      'data.tripId': tripId,
      read: false
    });

    if (!invitationNotification) {
      return res.status(404).json({ message: 'No pending invitation found' });
    }

    // Get trip details
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if trip is full
    if (trip.maxMembers && trip.members.length >= trip.maxMembers) {
      return res.status(400).json({ message: 'Trip is full' });
    }

    // Mark invitation notification as read
    invitationNotification.read = true;
    await invitationNotification.save();

    // Add user to trip
    trip.members.push(currentUserId);
    await trip.save();

    // Add trip to user's joinedGroups
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { joinedGroups: tripId }
    });

    // Send notification to trip creator
    const creator = await User.findById(trip.creator);
    if (creator) {
      await sendNotification({
        user: creator,
        type: 'trip',
        title: 'Invitation Accepted',
        message: `${req.user.name || req.user.username} has accepted your invitation to join "${trip.destination}".`,
        data: {
          tripId: tripId,
          tripName: trip.destination,
          actionUrl: `/trips/${tripId}`
        },
        relatedTrip: tripId,
        sentBy: currentUserId
      });
    }

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline trip invitation
router.post('/:tripId/decline-invitation', verifyToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const currentUserId = req.user.userId;

    // Find pending invitation notification
    const invitationNotification = await Notification.findOne({
      user: currentUserId,
      type: 'invitation',
      'data.tripId': tripId,
      read: false
    });

    if (!invitationNotification) {
      return res.status(404).json({ message: 'No pending invitation found' });
    }

    // Mark invitation notification as read
    invitationNotification.read = true;
    await invitationNotification.save();

    // Send notification to trip creator
    const trip = await Trip.findById(tripId);
    if (trip) {
      const creator = await User.findById(trip.creator);
      if (creator) {
        await sendNotification({
          user: creator,
          type: 'trip',
          title: 'Invitation Declined',
          message: `${req.user.name || req.user.username} has declined your invitation to join "${trip.destination}".`,
          data: {
            tripId: tripId,
            tripName: trip.destination,
            actionUrl: `/trips/${tripId}`
          },
          relatedTrip: tripId,
          sentBy: currentUserId
        });
      }
    }

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;
