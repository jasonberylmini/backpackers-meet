import Trip from '../models/Trip.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

export const createTrip = async (req, res) => {
  try {
    // KYC check
    const user = await User.findById(req.user.userId);
    if (!user || user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'KYC verification required to create trips.' });
    }
    
    const { destination, startDate, endDate, budget, tripType, description, maxMembers, privacy } = req.body;
    
    if (!destination || !startDate || !endDate || !budget || !tripType) {
      return res.status(400).json({ message: "All fields (destination, startDate, endDate, budget, tripType) are required." });
    }

    // Handle image upload
    let images = [];
    if (req.file) {
      // If using multer for file upload - store the full path
      const imagePath = `/uploads/${req.file.filename}`;
      images.push(imagePath);
    } else if (req.body.image) {
      // If image is sent as base64 or URL
      images.push(req.body.image);
    }

    const tripData = {
      creator: req.user.userId,
      destination,
      startDate,
      endDate,
      budget: parseInt(budget),
      tripType,
      description: description || '',
      members: [], // Don't add creator to members array - they're already the creator
      images,
      privacy: privacy || 'public'
    };

    // Add maxMembers if provided
    if (maxMembers && parseInt(maxMembers) > 0) {
      tripData.maxMembers = parseInt(maxMembers);
    }

    const newTrip = new Trip(tripData);
    await newTrip.save();
    
    // Populate the creator field for the response
    await newTrip.populate('creator', 'name email');
    
    res.status(201).json({
      message: "Trip created successfully!",
      trip: newTrip
    });
  } catch (err) {
    logger.error("Trip creation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyTrips = async (req, res) => {
  try {
    const myTrips = await Trip.find({
      $or: [
        { creator: req.user.userId },
        { members: req.user.userId }
      ]
    })
    .populate('creator', 'name email profileImage username')
    .populate('members', 'name profileImage username')
    .select('creator destination startDate endDate budget tripType description images members maxMembers createdAt');

    res.status(200).json(myTrips);
  } catch (err) {
    logger.error("Fetch trips error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId)
      .populate('creator', 'name email profileImage username')
      .populate('members', 'name email profileImage username');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    res.status(200).json(trip);
  } catch (err) {
    logger.error("Fetch trip error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const joinTrip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // KYC check
    const user = await User.findById(req.user.userId);
    if (!user || user.verificationStatus !== 'verified') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'KYC verification required to join trips.' });
    }
    const { tripId } = req.params;
    const userId = req.user.userId;

    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Trip not found." });
    }

    // Avoid duplicates
    if (trip.members.includes(userId) || trip.creator.equals(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Already in this trip." });
    }

    // Add user to trip
    trip.members.push(userId);
    await trip.save({ session });

    // ✅ Add trip to user's joinedGroups
    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedGroups: trip._id } // ensures no duplicates
    }, { session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Joined trip!", trip });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Join trip error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const browseTrips = async (req, res) => {
  try {
    const { destination, tripType } = req.query;
    const filter = { privacy: 'public' }; // Only show public trips
    if (destination) filter.destination = new RegExp(destination, 'i');
    if (tripType) filter.tripType = tripType;

    const trips = await Trip.find(filter)
      .populate('creator', 'name profileImage username')
      .populate('members', 'name profileImage username')
      .select('creator destination startDate endDate budget tripType description images members maxMembers createdAt privacy');
    
    res.status(200).json(trips);
  } catch (err) {
    logger.error("Browse trips error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const leaveTrip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.userId;
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Trip not found" });
    }

    // Remove user from trip's members array
    trip.members = trip.members.filter(
      (memberId) => memberId.toString() !== userId
    );

    await trip.save({ session });

    // ✅ Remove trip from user's joinedGroups
    await User.findByIdAndUpdate(userId, {
      $pull: { joinedGroups: trip._id }
    }, { session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Successfully left the trip." });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Leave Trip Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (!trip.creator.equals(userId)) {
      return res.status(403).json({ message: 'Only the trip creator can update this trip.' });
    }
    const { destination, startDate, endDate, budget, tripType, description } = req.body;
    if (!destination || !startDate || !endDate || !budget || !tripType) {
      return res.status(400).json({ message: 'All fields (destination, startDate, endDate, budget, tripType) are required.' });
    }
    trip.destination = destination;
    trip.startDate = startDate;
    trip.endDate = endDate;
    trip.budget = budget;
    trip.tripType = tripType;
    trip.description = description;
    await trip.save();
    res.status(200).json({ message: 'Trip updated successfully!', trip });
  } catch (err) {
    logger.error('Trip update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (!trip.creator.equals(userId)) {
      return res.status(403).json({ message: 'Only the trip creator can delete this trip.' });
    }
    // Remove trip from all users' joinedGroups
    await User.updateMany(
      { joinedGroups: trip._id },
      { $pull: { joinedGroups: trip._id } }
    );
    await trip.deleteOne();
    res.status(200).json({ message: 'Trip deleted.' });
  } catch (err) {
    logger.error('Trip delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


