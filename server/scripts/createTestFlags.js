import mongoose from 'mongoose';
import Flag from '../models/Flag.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Review from '../models/Review.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createTestFlags() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create test users if they don't exist
    let testUser1 = await User.findOne({ email: 'testuser1@example.com' });
    let testUser2 = await User.findOne({ email: 'testuser2@example.com' });
    let testUser3 = await User.findOne({ email: 'testuser3@example.com' });
    let adminUser = await User.findOne({ email: 'admin@example.com' });

    if (!testUser1) {
      const passwordHash1 = await bcrypt.hash('password123', 10);
      testUser1 = new User({
        name: 'John Doe',
        email: 'testuser1@example.com',
        passwordHash: passwordHash1,
        role: 'traveler'
      });
      await testUser1.save();
      console.log('✅ Created test user 1');
    }

    if (!testUser2) {
      const passwordHash2 = await bcrypt.hash('password123', 10);
      testUser2 = new User({
        name: 'Jane Smith',
        email: 'testuser2@example.com',
        passwordHash: passwordHash2,
        role: 'traveler'
      });
      await testUser2.save();
      console.log('✅ Created test user 2');
    }

    if (!testUser3) {
      const passwordHash3 = await bcrypt.hash('password123', 10);
      testUser3 = new User({
        name: 'Bob Wilson',
        email: 'testuser3@example.com',
        passwordHash: passwordHash3,
        role: 'traveler'
      });
      await testUser3.save();
      console.log('✅ Created test user 3');
    }

    if (!adminUser) {
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Created admin user');
    }

    // Create test trips if they don't exist
    let testTrip1 = await Trip.findOne({ destination: 'Paris Adventure' });
    let testTrip2 = await Trip.findOne({ destination: 'Tokyo Explorer' });

    if (!testTrip1) {
      testTrip1 = new Trip({
        destination: 'Paris Adventure',
        description: 'A wonderful trip to Paris with amazing experiences',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 1500,
        creator: testUser1._id,
        tripType: 'public transport',
        status: 'active'
      });
      await testTrip1.save();
      console.log('✅ Created test trip 1');
    }

    if (!testTrip2) {
      testTrip2 = new Trip({
        destination: 'Tokyo Explorer',
        description: 'Exploring the beautiful city of Tokyo',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 2500,
        creator: testUser2._id,
        tripType: 'carpool',
        status: 'active'
      });
      await testTrip2.save();
      console.log('✅ Created test trip 2');
    }

    // Create test reviews if they don't exist
    let testReview1 = await Review.findOne({ 
      reviewer: testUser1._id, 
      reviewType: 'user', 
      reviewedUser: testUser2._id 
    });
    let testReview2 = await Review.findOne({ 
      reviewer: testUser2._id, 
      reviewType: 'trip', 
      tripId: testTrip1._id 
    });

    if (!testReview1) {
      testReview1 = new Review({
        reviewer: testUser1._id,
        reviewType: 'user',
        tripId: testTrip1._id, // Add tripId for user reviews
        reviewedUser: testUser2._id,
        rating: 5,
        feedback: 'Great experience with this user! Very reliable and friendly.',
        tags: ['reliable', 'friendly'],
        status: 'approved'
      });
      await testReview1.save();
      console.log('✅ Created test review 1');
    } else {
      console.log('✅ Test review 1 already exists');
    }

    if (!testReview2) {
      testReview2 = new Review({
        reviewer: testUser2._id,
        reviewType: 'trip',
        tripId: testTrip1._id,
        rating: 2,
        feedback: 'Not satisfied with the trip organization. Poor communication.',
        tags: ['poor', 'unreliable'],
        status: 'pending'
      });
      await testReview2.save();
      console.log('✅ Created test review 2');
    } else {
      console.log('✅ Test review 2 already exists');
    }

    // Clean up existing test flags
    await Flag.deleteMany({
      $or: [
        { flaggedBy: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        { targetId: { $in: [testUser1._id, testUser2._id, testTrip1._id, testTrip2._id, testReview1._id, testReview2._id] } }
      ]
    });
    console.log('🧹 Cleaned up existing test flags');

    // Create test flags with different statuses and severities
    const testFlags = [
      // High priority user flags
      {
        flagType: 'user',
        targetId: testUser1._id,
        flaggedBy: testUser2._id,
        reason: 'Inappropriate behavior',
        details: 'User was harassing other members during the trip',
        severity: 'high',
        resolved: false,
        dismissed: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        flagType: 'user',
        targetId: testUser2._id,
        flaggedBy: testUser1._id,
        reason: 'Fake profile',
        details: 'Profile picture appears to be fake and user information seems fabricated',
        severity: 'high',
        resolved: true,
        resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        flagType: 'user',
        targetId: testUser3._id,
        flaggedBy: testUser1._id,
        reason: 'Spam messages',
        details: 'User is sending unsolicited promotional messages',
        severity: 'medium',
        resolved: false,
        dismissed: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },

      // Trip flags
      {
        flagType: 'trip',
        targetId: testTrip1._id,
        flaggedBy: testUser3._id,
        reason: 'Fake trip',
        details: 'This trip appears to be fake with unrealistic details',
        severity: 'high',
        resolved: false,
        dismissed: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        flagType: 'trip',
        targetId: testTrip2._id,
        flaggedBy: testUser1._id,
        reason: 'Inappropriate content',
        details: 'Trip description contains inappropriate language',
        severity: 'medium',
        resolved: true,
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        flagType: 'trip',
        targetId: testTrip1._id,
        flaggedBy: testUser2._id,
        reason: 'Safety concerns',
        details: 'Trip involves risky activities without proper safety measures',
        severity: 'high',
        escalated: true,
        escalatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
      },

      // Review flags
      {
        flagType: 'review',
        targetId: testReview1._id,
        flaggedBy: testUser3._id,
        reason: 'Fake review',
        details: 'This review appears to be fake or paid for',
        severity: 'medium',
        resolved: false,
        dismissed: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      },
      {
        flagType: 'review',
        targetId: testReview2._id,
        flaggedBy: testUser1._id,
        reason: 'Inappropriate language',
        details: 'Review contains offensive language and inappropriate comments',
        severity: 'high',
        resolved: false,
        dismissed: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        flagType: 'review',
        targetId: testReview1._id,
        flaggedBy: testUser2._id,
        reason: 'Spam review',
        details: 'User is posting multiple similar reviews',
        severity: 'low',
        dismissed: true,
        dismissedAt: new Date(Date.now() - 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },

      // Today's flags
      {
        flagType: 'user',
        targetId: testUser1._id,
        flaggedBy: testUser3._id,
        reason: 'Suspicious activity',
        details: 'User has been logging in from multiple suspicious locations',
        severity: 'high',
        resolved: false,
        dismissed: false,
        createdAt: new Date() // Today
      },
      {
        flagType: 'trip',
        targetId: testTrip2._id,
        flaggedBy: testUser1._id,
        reason: 'Duplicate trip',
        details: 'This trip appears to be a duplicate of another existing trip',
        severity: 'medium',
        resolved: false,
        dismissed: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ];

    // Create flags
    for (const flagData of testFlags) {
      const flag = new Flag(flagData);
      await flag.save();
    }

    console.log(`✅ Created ${testFlags.length} test flags`);
    console.log('\n📊 Flag Statistics:');
    console.log(`- Total Flags: ${testFlags.length}`);
    console.log(`- High Priority: ${testFlags.filter(f => f.severity === 'high').length}`);
    console.log(`- Pending: ${testFlags.filter(f => !f.resolved && !f.dismissed).length}`);
    console.log(`- Resolved: ${testFlags.filter(f => f.resolved).length}`);
    console.log(`- Dismissed: ${testFlags.filter(f => f.dismissed).length}`);
    console.log(`- Escalated: ${testFlags.filter(f => f.escalated).length}`);
    console.log(`- Today: ${testFlags.filter(f => {
      const today = new Date();
      const flagDate = new Date(f.createdAt);
      return flagDate.toDateString() === today.toDateString();
    }).length}`);

    console.log('\n🎯 Test Data Summary:');
    console.log('- 3 test users created');
    console.log('- 2 test trips created');
    console.log('- 2 test reviews created');
    console.log('- 12 test flags created with various statuses and severities');
    console.log('\n🚀 You can now test the System Reports dashboard!');

  } catch (error) {
    console.error('❌ Error creating test flags:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createTestFlags(); 