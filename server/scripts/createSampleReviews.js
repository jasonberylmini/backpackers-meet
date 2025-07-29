import mongoose from 'mongoose';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import dotenv from 'dotenv';

dotenv.config();

async function createSampleReviews() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check if we have users and trips
    const users = await User.find().limit(5);
    const trips = await Trip.find().limit(5);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create some users first.');
      return;
    }
    
    if (trips.length === 0) {
      console.log('❌ No trips found. Please create some trips first.');
      return;
    }
    
    console.log(`Found ${users.length} users and ${trips.length} trips`);
    
    // Create sample reviews
    const sampleReviews = [
      // User reviews
      {
        reviewer: users[0]._id,
        reviewType: 'user',
        reviewedUser: users[1]._id,
        rating: 5,
        feedback: 'Amazing travel companion! Very reliable and fun to travel with. Highly recommend!',
        tags: ['reliable', 'fun', 'recommended'],
        status: 'approved',
        flagged: false
      },
      {
        reviewer: users[1]._id,
        reviewType: 'user',
        reviewedUser: users[0]._id,
        rating: 4,
        feedback: 'Great person to travel with. Good communication and planning skills.',
        tags: ['communication', 'planning'],
        status: 'pending',
        flagged: false
      },
      {
        reviewer: users[2]?._id || users[0]._id,
        reviewType: 'user',
        reviewedUser: users[1]._id,
        rating: 2,
        feedback: 'Not a good experience. Poor communication and unreliable.',
        tags: ['poor', 'unreliable'],
        status: 'flagged',
        flagged: true
      },
      
      // Trip reviews
      {
        reviewer: users[0]._id,
        reviewType: 'trip',
        tripId: trips[0]._id,
        rating: 5,
        feedback: 'Incredible trip! The destination was beautiful and the itinerary was perfect. Everything was well organized.',
        tags: ['beautiful', 'organized', 'perfect'],
        status: 'approved',
        flagged: false
      },
      {
        reviewer: users[1]._id,
        reviewType: 'trip',
        tripId: trips[0]._id,
        rating: 4,
        feedback: 'Really enjoyed this trip. Good value for money and great company.',
        tags: ['enjoyable', 'value'],
        status: 'pending',
        flagged: false
      },
      {
        reviewer: users[2]?._id || users[0]._id,
        reviewType: 'trip',
        tripId: trips[1]?._id || trips[0]._id,
        rating: 1,
        feedback: 'TERRIBLE TRIP! Everything was wrong. Waste of money and time. DO NOT RECOMMEND!',
        tags: ['terrible', 'waste'],
        status: 'rejected',
        flagged: true
      },
      {
        reviewer: users[1]._id,
        reviewType: 'trip',
        tripId: trips[1]?._id || trips[0]._id,
        rating: 3,
        feedback: 'Average trip. Some good moments but could have been better organized.',
        tags: ['average', 'organization'],
        status: 'approved',
        flagged: false
      }
    ];
    
    // Create reviews
    const createdReviews = [];
    for (const reviewData of sampleReviews) {
      try {
        const review = new Review(reviewData);
        await review.save();
        createdReviews.push(review);
        console.log(`✅ Created review: ${reviewData.rating}★ - ${reviewData.feedback.substring(0, 50)}...`);
      } catch (error) {
        console.log(`❌ Failed to create review: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Successfully created ${createdReviews.length} sample reviews!`);
    console.log('\n📊 Review Status Distribution:');
    console.log('- Approved: 3');
    console.log('- Pending: 2');
    console.log('- Rejected: 1');
    console.log('- Flagged: 2');
    
    console.log('\n🚀 Now you can test the Review Moderation admin panel!');
    console.log('The reviews should appear with different statuses and ratings.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createSampleReviews(); 