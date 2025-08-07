import mongoose from 'mongoose';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testReviews() {
  try {
    console.log('🧪 Testing Reviews Functionality...\n');

    // Get some test users
    const users = await User.find().limit(3);
    if (users.length < 2) {
      console.log('❌ Need at least 2 users to test reviews');
      return;
    }

    const [user1, user2] = users;
    console.log(`👤 Test users: ${user1.name} and ${user2.name}`);

    // Get a test trip
    const trip = await Trip.findOne();
    if (!trip) {
      console.log('❌ Need at least 1 trip to test reviews');
      return;
    }
    console.log(`🗺️ Test trip: ${trip.destination}`);

    // Test 1: Create a user review
    console.log('\n📝 Test 1: Creating user review...');
    const userReview = new Review({
      reviewer: user1._id,
      reviewType: 'user',
      reviewedUser: user2._id,
      rating: 5,
      feedback: 'Great travel companion! Very reliable and fun to travel with.',
      tags: ['Reliable', 'Fun', 'Friendly'],
      status: 'approved'
    });
    await userReview.save();
    console.log('✅ User review created successfully');

    // Test 2: Create a trip review
    console.log('\n📝 Test 2: Creating trip review...');
    const tripReview = new Review({
      reviewer: user1._id,
      reviewType: 'trip',
      tripId: trip._id,
      rating: 4,
      feedback: 'Amazing trip! The destination was beautiful and the group was great.',
      tags: ['Beautiful', 'Well Organized'],
      status: 'approved'
    });
    await tripReview.save();
    console.log('✅ Trip review created successfully');

    // Test 3: Check if friends were added automatically
    console.log('\n👥 Test 3: Checking automatic friend addition...');
    const updatedUser1 = await User.findById(user1._id);
    const updatedUser2 = await User.findById(user2._id);
    
    const user1HasUser2AsFriend = updatedUser1.friends.includes(user2._id);
    const user2HasUser1AsFriend = updatedUser2.friends.includes(user1._id);
    
    console.log(`${user1.name} has ${user2.name} as friend: ${user1HasUser2AsFriend ? '✅' : '❌'}`);
    console.log(`${user2.name} has ${user1.name} as friend: ${user2HasUser1AsFriend ? '✅' : '❌'}`);

    // Test 4: Get reviews for user
    console.log('\n📊 Test 4: Fetching user reviews...');
    const userReviews = await Review.find({ 
      reviewedUser: user2._id, 
      reviewType: 'user' 
    }).populate('reviewer', 'name');
    console.log(`Found ${userReviews.length} reviews for ${user2.name}`);

    // Test 5: Get reviews for trip
    console.log('\n📊 Test 5: Fetching trip reviews...');
    const tripReviews = await Review.find({ 
      tripId: trip._id, 
      reviewType: 'trip' 
    }).populate('reviewer', 'name');
    console.log(`Found ${tripReviews.length} reviews for trip to ${trip.destination}`);

    // Test 6: Calculate average ratings
    console.log('\n⭐ Test 6: Calculating average ratings...');
    const userRating = userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length;
    const tripRating = tripReviews.reduce((sum, review) => sum + review.rating, 0) / tripReviews.length;
    
    console.log(`Average rating for ${user2.name}: ${userRating.toFixed(1)}/5`);
    console.log(`Average rating for trip to ${trip.destination}: ${tripRating.toFixed(1)}/5`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Created ${userReviews.length} user review(s)`);
    console.log(`- Created ${tripReviews.length} trip review(s)`);
    console.log(`- Friends automatically added: ${user1HasUser2AsFriend && user2HasUser1AsFriend ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testReviews(); 