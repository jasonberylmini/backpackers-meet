import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const API_BASE_URL = 'http://localhost:5000/api';

async function testReviewsAPI() {
  try {
    console.log('🧪 Testing Reviews API Functionality...\n');

    // Test 1: Login as first user
    console.log('🔐 Test 1: Logging in as first user...');
    const loginResponse1 = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'john@example.com',
      password: 'password123'
    });
    const token1 = loginResponse1.data.token;
    const user1 = loginResponse1.data.user;
    console.log(`✅ Logged in as: ${user1.name}`);

    // Test 2: Login as second user
    console.log('\n🔐 Test 2: Logging in as second user...');
    const loginResponse2 = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'sarah@example.com',
      password: 'password123'
    });
    const token2 = loginResponse2.data.token;
    const user2 = loginResponse2.data.user;
    console.log(`✅ Logged in as: ${user2.name}`);

    // Test 3: Get a trip to review
    console.log('\n🗺️ Test 3: Getting a trip to review...');
    const tripsResponse = await axios.get(`${API_BASE_URL}/trips/browse`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const trip = tripsResponse.data[0];
    console.log(`✅ Found trip: ${trip.destination}`);

    // Test 4: Submit a user review (should automatically add friends)
    console.log('\n📝 Test 4: Submitting user review...');
    const userReviewData = {
      reviewType: 'user',
      reviewedUser: user2.id,
      rating: 5,
      feedback: 'Amazing travel companion! Very reliable and fun to travel with.',
      tags: ['Reliable', 'Fun', 'Friendly']
    };
    
    const userReviewResponse = await axios.post(`${API_BASE_URL}/reviews/submit`, userReviewData, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`✅ User review submitted: ${userReviewResponse.data.message}`);

    // Test 5: Submit a trip review
    console.log('\n📝 Test 5: Submitting trip review...');
    const tripReviewData = {
      reviewType: 'trip',
      tripId: trip._id,
      rating: 4,
      feedback: 'Incredible trip! The destination was beautiful and the group was amazing.',
      tags: ['Beautiful', 'Well Organized']
    };
    
    const tripReviewResponse = await axios.post(`${API_BASE_URL}/reviews/submit`, tripReviewData, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`✅ Trip review submitted: ${tripReviewResponse.data.message}`);

    // Test 6: Check if friends were added automatically
    console.log('\n👥 Test 6: Checking automatic friend addition...');
    const user1FriendsResponse = await axios.get(`${API_BASE_URL}/users/${user1.id}/friends`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const user2FriendsResponse = await axios.get(`${API_BASE_URL}/users/${user2.id}/friends`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    
    const user1HasUser2AsFriend = user1FriendsResponse.data.friends.some(friend => friend._id === user2.id);
    const user2HasUser1AsFriend = user2FriendsResponse.data.friends.some(friend => friend._id === user1.id);
    
    console.log(`${user1.name} has ${user2.name} as friend: ${user1HasUser2AsFriend ? '✅' : '❌'}`);
    console.log(`${user2.name} has ${user1.name} as friend: ${user2HasUser1AsFriend ? '✅' : '❌'}`);

    // Test 7: Get user reviews
    console.log('\n📊 Test 7: Fetching user reviews...');
    const userReviewsResponse = await axios.get(`${API_BASE_URL}/reviews/user/${user2.id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`Found ${userReviewsResponse.data.length} reviews for ${user2.name}`);

    // Test 8: Get trip reviews
    console.log('\n📊 Test 8: Fetching trip reviews...');
    const tripReviewsResponse = await axios.get(`${API_BASE_URL}/reviews/trip/${trip._id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`Found ${tripReviewsResponse.data.length} reviews for trip to ${trip.destination}`);

    // Test 9: Calculate average ratings
    console.log('\n⭐ Test 9: Calculating average ratings...');
    const userRating = userReviewsResponse.data.reduce((sum, review) => sum + review.rating, 0) / userReviewsResponse.data.length;
    const tripRating = tripReviewsResponse.data.reduce((sum, review) => sum + review.rating, 0) / tripReviewsResponse.data.length;
    
    console.log(`Average rating for ${user2.name}: ${userRating.toFixed(1)}/5`);
    console.log(`Average rating for trip to ${trip.destination}: ${tripRating.toFixed(1)}/5`);

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Submitted ${userReviewsResponse.data.length} user review(s)`);
    console.log(`- Submitted ${tripReviewsResponse.data.length} trip review(s)`);
    console.log(`- Friends automatically added: ${user1HasUser2AsFriend && user2HasUser1AsFriend ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testReviewsAPI(); 