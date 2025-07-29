import mongoose from 'mongoose';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createTestReviews() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Create test users if they don't exist
    let testUser1 = await User.findOne({ email: 'testuser1@example.com' });
    let testUser2 = await User.findOne({ email: 'testuser2@example.com' });
    let testTrip1 = await Trip.findOne({ destination: 'Test Trip 1' });
    let testTrip2 = await Trip.findOne({ destination: 'Test Trip 2' });
    
    if (!testUser1) {
      const passwordHash1 = await bcrypt.hash('password123', 10);
      testUser1 = new User({
        name: 'Test User 1',
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
        name: 'Test User 2',
        email: 'testuser2@example.com',
        passwordHash: passwordHash2,
        role: 'traveler'
      });
      await testUser2.save();
      console.log('✅ Created test user 2');
    }
    
    if (!testTrip1) {
      testTrip1 = new Trip({
        destination: 'Test Trip 1',
        description: 'A test trip for review moderation',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 1000,
        creator: testUser1._id,
        tripType: 'public transport',
        status: 'active'
      });
      await testTrip1.save();
      console.log('✅ Created test trip 1');
    }
    
    if (!testTrip2) {
      testTrip2 = new Trip({
        destination: 'Test Trip 2',
        description: 'Another test trip for review moderation',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 2000,
        creator: testUser2._id,
        tripType: 'carpool',
        status: 'active'
      });
      await testTrip2.save();
      console.log('✅ Created test trip 2');
    }
    
    // Delete existing test reviews to avoid duplicates
    await Review.deleteMany({
      $or: [
        { reviewer: testUser1._id },
        { reviewer: testUser2._id }
      ]
    });
    console.log('🧹 Cleaned up existing test reviews');
    
    // Create test reviews
    const testReviews = [
      // User reviews
      {
        reviewer: testUser1._id,
        reviewType: 'user',
        reviewedUser: testUser2._id,
        rating: 5,
        feedback: 'Amazing travel companion! Very reliable and fun to travel with. Highly recommend!',
        tags: ['reliable', 'fun', 'recommended'],
        status: 'approved',
        flagged: false
      },
      {
        reviewer: testUser2._id,
        reviewType: 'user',
        reviewedUser: testUser1._id,
        rating: 4,
        feedback: 'Great person to travel with. Good communication and planning skills.',
        tags: ['communication', 'planning'],
        status: 'pending',
        flagged: false
      },
      {
        reviewer: testUser1._id,
        reviewType: 'user',
        reviewedUser: testUser2._id,
        rating: 2,
        feedback: 'Not a good experience. Poor communication and unreliable.',
        tags: ['poor', 'unreliable'],
        status: 'pending',
        flagged: true
      },
      
      // Trip reviews
      {
        reviewer: testUser1._id,
        reviewType: 'trip',
        tripId: testTrip1._id,
        rating: 5,
        feedback: 'Incredible trip! The destination was beautiful and the itinerary was perfect. Everything was well organized.',
        tags: ['beautiful', 'organized', 'perfect'],
        status: 'approved',
        flagged: false
      },
      {
        reviewer: testUser2._id,
        reviewType: 'trip',
        tripId: testTrip1._id,
        rating: 4,
        feedback: 'Really enjoyed this trip. Good value for money and great company.',
        tags: ['enjoyable', 'value'],
        status: 'pending',
        flagged: false
      },
      {
        reviewer: testUser1._id,
        reviewType: 'trip',
        tripId: testTrip2._id,
        rating: 1,
        feedback: 'TERRIBLE TRIP! Everything was wrong. Waste of money and time. DO NOT RECOMMEND!',
        tags: ['terrible', 'waste'],
        status: 'rejected',
        flagged: true
      },
      {
        reviewer: testUser2._id,
        reviewType: 'trip',
        tripId: testTrip2._id,
        rating: 3,
        feedback: 'Average trip. Some good moments but could have been better organized.',
        tags: ['average', 'organization'],
        status: 'approved',
        flagged: false
      }
    ];
    
    // Create reviews
    const createdReviews = [];
    for (const reviewData of testReviews) {
      try {
        const review = new Review(reviewData);
        await review.save();
        createdReviews.push(review);
        console.log(`✅ Created review: ${reviewData.rating}★ - ${reviewData.feedback.substring(0, 50)}...`);
      } catch (error) {
        console.log(`❌ Failed to create review: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Successfully created ${createdReviews.length} test reviews!`);
    console.log('\n📊 Review Status Distribution:');
    console.log('- Approved: 3');
    console.log('- Pending: 2');
    console.log('- Rejected: 1');
    console.log('- Flagged: 2');
    
    console.log('\n🚀 Now you can test the Review Moderation admin panel!');
    console.log('The reviews should appear with different statuses and ratings.');
    console.log('\n💡 Try filtering by:');
    console.log('- Status: Pending, Approved, Rejected, Flagged');
    console.log('- Rating: 1★ to 5★');
    console.log('- Type: User Reviews, Trip Reviews');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createTestReviews(); 