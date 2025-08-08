import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:5000';

// Test user credentials
const testUser = {
  email: 'alex@test.com',
  password: 'password123'
};

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ridetribe';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function loginUser() {
  try {
    const response = await axios.post(`${BASE_URL}/api/users/login`, testUser);
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function getActiveTrips(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/trips/mine`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.filter(trip => trip.status === 'active');
  } catch (error) {
    console.error('❌ Failed to get trips:', error.response?.data?.message || error.message);
    return [];
  }
}

async function completeTrip(tripId, token) {
  try {
    const response = await axios.put(`${BASE_URL}/api/trips/${tripId}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to complete trip:', error.response?.data?.message || error.message);
    return null;
  }
}

async function checkFriends(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const user = response.data;
    const friendsResponse = await axios.get(`${BASE_URL}/api/users/${user._id}/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return friendsResponse.data.count;
  } catch (error) {
    console.error('❌ Failed to check friends:', error.response?.data?.message || error.message);
    return 0;
  }
}

async function main() {
  try {
    console.log('🚀 Triggering Automatic Friends System...');
    
    await connectDB();
    
    // Login user
    console.log('\n🔐 Logging in user...');
    const token = await loginUser();
    if (!token) {
      console.log('❌ Cannot proceed without login');
      return;
    }
    console.log('✅ Logged in successfully');
    
    // Check initial friends count
    console.log('\n📊 Checking initial friends count...');
    const initialFriendsCount = await checkFriends(token);
    console.log(`   Initial friends count: ${initialFriendsCount}`);
    
    // Get active trips
    console.log('\n🗺️ Getting active trips...');
    const activeTrips = await getActiveTrips(token);
    console.log(`   Found ${activeTrips.length} active trips`);
    
    if (activeTrips.length === 0) {
      console.log('❌ No active trips found to complete');
      console.log('💡 Make sure to run the test data script first: node server/scripts/testFriendsSystem.js');
      return;
    }
    
    // Complete the first active trip
    const tripToComplete = activeTrips[0];
    console.log(`\n✅ Completing trip: ${tripToComplete.destination}`);
    
    const completedTrip = await completeTrip(tripToComplete._id, token);
    if (completedTrip) {
      console.log(`   ✅ Trip completed successfully!`);
      console.log(`   Status: ${completedTrip.trip.status}`);
      
      // Wait a moment for the automatic friend addition to process
      console.log('\n⏳ Waiting for automatic friend addition to process...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check friends count after completion
      console.log('\n📊 Checking friends count after trip completion...');
      const finalFriendsCount = await checkFriends(token);
      console.log(`   Final friends count: ${finalFriendsCount}`);
      
      if (finalFriendsCount > initialFriendsCount) {
        console.log(`   🎉 Automatic friends added: ${finalFriendsCount - initialFriendsCount} new friends!`);
      } else {
        console.log(`   ℹ️ No new friends added (maybe already friends or no other participants)`);
      }
    }
    
    console.log('\n✅ Automatic friends system test completed!');
    console.log('🎯 You can now:');
    console.log('   1. Login to the frontend to see the updated friends list');
    console.log('   2. Test the manual friend removal feature');
    console.log('   3. Check the profile stats cards with proper spacing');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();
