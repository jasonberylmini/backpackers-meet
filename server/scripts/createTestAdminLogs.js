import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Import models
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Review from '../models/Review.js';
import Flag from '../models/Flag.js';
import AdminLog from '../models/AdminLog.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const createTestAdminLogs = async () => {
  try {
    console.log('Creating test admin logs...');

    // Clean up existing test logs
    await AdminLog.deleteMany({});
    console.log('Cleaned up existing test logs');

    // Create test admin users
    const adminUsers = [];
    const adminNames = ['Jason', 'Admin Example', 'Sarah', 'Mike', 'Lisa'];
    
    for (let i = 0; i < adminNames.length; i++) {
      const admin = await User.findOneAndUpdate(
        { email: `${adminNames[i].toLowerCase().replace(' ', '')}@example.com` },
        {
          name: adminNames[i],
          email: `${adminNames[i].toLowerCase().replace(' ', '')}@example.com`,
          passwordHash: await bcrypt.hash('password123', 10),
          role: 'admin',
          verificationStatus: 'verified'
        },
        { upsert: true, new: true }
      );
      adminUsers.push(admin);
    }

    // Create test regular users
    const regularUsers = [];
    const userNames = ['john@example.com', 'jane@example.com', 'bob@example.com', 'alice@example.com', 'catty@example.com'];
    
    for (let i = 0; i < userNames.length; i++) {
      const user = await User.findOneAndUpdate(
        { email: userNames[i] },
        {
          name: userNames[i].split('@')[0].charAt(0).toUpperCase() + userNames[i].split('@')[0].slice(1),
          email: userNames[i],
          passwordHash: await bcrypt.hash('password123', 10),
          role: 'traveler',
          verificationStatus: i % 2 === 0 ? 'verified' : 'pending'
        },
        { upsert: true, new: true }
      );
      regularUsers.push(user);
    }

    // Create test trips
    const trips = [];
    const destinations = ['Paris', 'Tokyo', 'New York', 'London', 'Sydney'];
    
    for (let i = 0; i < destinations.length; i++) {
      const trip = await Trip.findOneAndUpdate(
        { destination: destinations[i] },
        {
          destination: destinations[i],
          description: `Amazing trip to ${destinations[i]}`,
          startDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budget: 1000 + (i * 500),
          tripType: ['adventure', 'cultural', 'relaxation', 'business', 'romantic'][i],
          creator: regularUsers[i % regularUsers.length]._id,
          status: ['active', 'completed', 'cancelled', 'suspended'][i % 4]
        },
        { upsert: true, new: true }
      );
      trips.push(trip);
    }

    // Create test reviews
    const reviews = [];
    for (let i = 0; i < 5; i++) {
      const review = await Review.findOneAndUpdate(
        { 
          reviewer: regularUsers[i % regularUsers.length]._id,
          reviewType: 'trip',
          tripId: trips[i % trips.length]._id
        },
        {
          reviewer: regularUsers[i % regularUsers.length]._id,
          reviewType: 'trip',
          tripId: trips[i % trips.length]._id,
          rating: 3 + (i % 3),
          feedback: `Great trip to ${trips[i % trips.length].destination}!`,
          status: ['pending', 'approved', 'rejected'][i % 3]
        },
        { upsert: true, new: true }
      );
      reviews.push(review);
    }

    // Create test flags
    const flags = [];
    for (let i = 0; i < 5; i++) {
      const flag = await Flag.findOneAndUpdate(
        { 
          flaggedBy: regularUsers[i % regularUsers.length]._id,
          flagType: 'user',
          targetId: regularUsers[(i + 1) % regularUsers.length]._id
        },
        {
          flaggedBy: regularUsers[i % regularUsers.length]._id,
          flagType: ['user', 'trip', 'review'][i % 3],
          targetId: [regularUsers[(i + 1) % regularUsers.length]._id, trips[i % trips.length]._id, reviews[i % reviews.length]._id][i % 3],
          reason: `Inappropriate content - test flag ${i + 1}`,
          severity: ['low', 'medium', 'high'][i % 3],
          status: ['pending', 'resolved', 'dismissed', 'escalated'][i % 4]
        },
        { upsert: true, new: true }
      );
      flags.push(flag);
    }

    // Create test admin logs with various actions
    const logActions = [
      // User management actions
      { action: 'banned user', reason: 'Violation of community guidelines' },
      { action: 'unbanned user', reason: 'Manual review cleared' },
      { action: 'verified user', reason: 'KYC documents approved' },
      { action: 'rejected user', reason: 'KYC document invalid' },
      { action: 'warned user', reason: 'First warning for inappropriate behavior' },
      
      // Review moderation actions
      { action: 'approved review', reason: 'Content meets guidelines' },
      { action: 'rejected review', reason: 'Inappropriate content' },
      { action: 'deleted review', reason: 'Spam content removed' },
      
      // Trip management actions
      { action: 'deleted trip', reason: 'Inappropriate destination' },
      { action: 'suspended trip', reason: 'Under investigation' },
      { action: 'approved trip', reason: 'Trip meets guidelines' },
      
      // KYC management actions
      { action: 'bulk verified KYC', reason: 'Bulk KYC verified - Manual review' },
      { action: 'Marked user as verified', reason: 'KYC verification completed' },
      { action: 'Marked user as rejected', reason: 'KYC document invalid' },
      
      // Flag management actions
      { action: 'resolved flag', reason: 'Flag resolved - action taken' },
      { action: 'dismissed flag', reason: 'Flag dismissed - no violation found' },
      { action: 'escalated flag', reason: 'Flag escalated for further review' },
      
      // Bulk operations
      { action: 'bulk banned users', reason: 'Bulk ban - multiple violations' },
      { action: 'bulk verified KYC', reason: 'Bulk KYC verification' },
      { action: 'bulk approved reviews', reason: 'Bulk review approval' }
    ];

    const adminLogs = [];
    const now = new Date();

    // Create logs for the past 30 days
    for (let i = 0; i < 50; i++) {
      const logAction = logActions[i % logActions.length];
      const admin = adminUsers[i % adminUsers.length];
      const targetUser = regularUsers[i % regularUsers.length];
      
      // Create timestamp for the past 30 days
      const timestamp = new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000));
      
      const log = new AdminLog({
        adminId: admin._id,
        action: logAction.action,
        reason: logAction.reason,
        targetUserId: targetUser._id,
        createdAt: timestamp,
        outcome: 'completed'
      });
      
      adminLogs.push(log);
    }

    // Insert all logs
    await AdminLog.insertMany(adminLogs);
    
    console.log(`✅ Created ${adminLogs.length} test admin logs`);
    console.log('Test admin logs created successfully!');
    
    // Display some statistics
    const totalLogs = await AdminLog.countDocuments();
    const todayLogs = await AdminLog.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    const uniqueActions = await AdminLog.distinct('action');
    
    console.log('\n📊 Admin Logs Statistics:');
    console.log(`Total logs: ${totalLogs}`);
    console.log(`Today's logs: ${todayLogs}`);
    console.log(`Unique actions: ${uniqueActions.length}`);
    console.log(`Actions: ${uniqueActions.join(', ')}`);

  } catch (error) {
    console.error('Error creating test admin logs:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
createTestAdminLogs(); 