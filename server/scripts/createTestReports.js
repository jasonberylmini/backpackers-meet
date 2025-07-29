import mongoose from 'mongoose';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createTestReports() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create test users if they don't exist
    let testUser1 = await User.findOne({ email: 'testuser1@example.com' });
    let testUser2 = await User.findOne({ email: 'testuser2@example.com' });
    let testUser3 = await User.findOne({ email: 'testuser3@example.com' });
    let testUser4 = await User.findOne({ email: 'testuser4@example.com' });
    let testUser5 = await User.findOne({ email: 'testuser5@example.com' });

    if (!testUser1) {
      const passwordHash1 = await bcrypt.hash('password123', 10);
      testUser1 = new User({
        name: 'John Doe',
        email: 'testuser1@example.com',
        passwordHash: passwordHash1,
        role: 'traveler',
        status: 'active',
        verificationStatus: 'verified'
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
        role: 'traveler',
        status: 'active',
        verificationStatus: 'pending'
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
        role: 'traveler',
        status: 'banned',
        verificationStatus: 'verified'
      });
      await testUser3.save();
      console.log('✅ Created test user 3');
    }

    if (!testUser4) {
      const passwordHash4 = await bcrypt.hash('password123', 10);
      testUser4 = new User({
        name: 'Alice Johnson',
        email: 'testuser4@example.com',
        passwordHash: passwordHash4,
        role: 'traveler',
        status: 'active',
        verificationStatus: 'pending'
      });
      await testUser4.save();
      console.log('✅ Created test user 4');
    }

    if (!testUser5) {
      const passwordHash5 = await bcrypt.hash('password123', 10);
      testUser5 = new User({
        name: 'Charlie Brown',
        email: 'testuser5@example.com',
        passwordHash: passwordHash5,
        role: 'traveler',
        status: 'active',
        verificationStatus: 'verified'
      });
      await testUser5.save();
      console.log('✅ Created test user 5');
    }

    // Create test trips if they don't exist
    let testTrip1 = await Trip.findOne({ destination: 'Paris Adventure' });
    let testTrip2 = await Trip.findOne({ destination: 'Tokyo Explorer' });
    let testTrip3 = await Trip.findOne({ destination: 'New York City Tour' });
    let testTrip4 = await Trip.findOne({ destination: 'London Experience' });
    let testTrip5 = await Trip.findOne({ destination: 'Sydney Discovery' });

    if (!testTrip1) {
      testTrip1 = new Trip({
        destination: 'Paris Adventure',
        description: 'A wonderful trip to Paris with amazing experiences and cultural immersion',
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
        description: 'Exploring the beautiful city of Tokyo with modern technology and traditional culture',
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

    if (!testTrip3) {
      testTrip3 = new Trip({
        destination: 'New York City Tour',
        description: 'Experience the Big Apple with its iconic landmarks and vibrant culture',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 3000,
        creator: testUser3._id,
        tripType: 'public transport',
        status: 'suspended'
      });
      await testTrip3.save();
      console.log('✅ Created test trip 3');
    }

    if (!testTrip4) {
      testTrip4 = new Trip({
        destination: 'London Experience',
        description: 'Discover the historic city of London with its royal heritage and modern attractions',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 2000,
        creator: testUser4._id,
        tripType: 'carpool',
        status: 'completed'
      });
      await testTrip4.save();
      console.log('✅ Created test trip 4');
    }

    if (!testTrip5) {
      testTrip5 = new Trip({
        destination: 'Sydney Discovery',
        description: 'Explore the beautiful harbor city of Sydney with its stunning beaches and landmarks',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 3500,
        creator: testUser5._id,
        tripType: 'public transport',
        status: 'active'
      });
      await testTrip5.save();
      console.log('✅ Created test trip 5');
    }

    // Mark some trips as reported
    await Trip.updateMany(
      { destination: { $in: ['Paris Adventure', 'Tokyo Explorer', 'New York City Tour'] } },
      { 
        $set: { 
          'moderation.reported': true,
          'moderation.reportedAt': new Date(),
          'moderation.reportReason': 'Inappropriate content'
        }
      }
    );
    console.log('✅ Marked trips as reported');

    // Mark some users as reported
    await User.updateMany(
      { email: { $in: ['testuser2@example.com', 'testuser3@example.com', 'testuser4@example.com'] } },
      { 
        $set: { 
          'moderation.reported': true,
          'moderation.reportedAt': new Date(),
          'moderation.reportReason': 'Suspicious activity'
        }
      }
    );
    console.log('✅ Marked users as reported');

    // Add some moderation data to users
    await User.updateOne(
      { email: 'testuser3@example.com' },
      { 
        $set: { 
          'moderation.bannedAt': new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          'moderation.banReason': 'Violation of community guidelines'
        }
      }
    );

    await User.updateOne(
      { email: 'testuser4@example.com' },
      { 
        $set: { 
          'moderation.warnedAt': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          'moderation.warningCount': 2,
          'moderation.warningReason': 'Multiple violations'
        }
      }
    );

    console.log('\n📊 Test Data Summary:');
    console.log('- 5 test users created');
    console.log('- 5 test trips created');
    console.log('- 3 trips marked as reported');
    console.log('- 3 users marked as reported');
    console.log('- 1 user banned');
    console.log('- 1 user warned');
    console.log('\n🚀 You can now test the Trip Reports and User Reports sections!');

  } catch (error) {
    console.error('❌ Error creating test reports:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createTestReports(); 