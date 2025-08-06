import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

dotenv.config();

const createSampleNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get a user to create notifications for
    const user = await User.findOne();
    if (!user) {
      console.log('No users found. Please create a user first.');
      return;
    }

    // Clear existing notifications
    await Notification.deleteMany({ user: user._id });
    console.log('Cleared existing notifications');

    // Create sample notifications
    const sampleNotifications = [
      {
        user: user._id,
        type: 'trip',
        title: 'Trip Invitation',
        message: 'You have been invited to join a trip to Goa!',
        data: {
          tripName: 'Goa Adventure',
          actionUrl: '/trips/123'
        },
        read: false
      },
      {
        user: user._id,
        type: 'message',
        title: 'New Message',
        message: 'John Doe sent you a message about your upcoming trip.',
        data: {
          chatId: 'chat123'
        },
        read: false
      },
      {
        user: user._id,
        type: 'expense',
        title: 'Expense Added',
        message: 'A new expense of ₹5000 has been added to your trip.',
        data: {
          amount: 5000,
          currency: 'INR'
        },
        read: true
      },
      {
        user: user._id,
        type: 'kyc',
        title: 'KYC Verification',
        message: 'Your KYC verification has been approved!',
        read: false
      },
      {
        user: user._id,
        type: 'system',
        title: 'Welcome to RideTribe',
        message: 'Welcome to RideTribe! Start exploring trips and connecting with fellow travelers.',
        read: true
      }
    ];

    const notifications = await Notification.insertMany(sampleNotifications);
    console.log(`Created ${notifications.length} sample notifications for user: ${user.name || user.username}`);

    console.log('Sample notifications created successfully!');
  } catch (error) {
    console.error('Error creating sample notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createSampleNotifications(); 