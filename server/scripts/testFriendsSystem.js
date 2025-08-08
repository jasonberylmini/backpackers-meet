import mongoose from 'mongoose';
import axios from 'axios';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:5000';

// Test users data
const testUsers = [
  {
    name: 'Alex Johnson',
    email: 'alex@test.com',
    username: 'alexjohnson',
    password: 'password123',
    country: 'France',
    bio: 'Travel enthusiast Alex Johnson ready for adventures!',
    instagram: 'alex_travels'
  },
  {
    name: 'Sarah Chen',
    email: 'sarah@test.com',
    username: 'sarahchen',
    password: 'password123',
    country: 'Canada',
    bio: 'Adventure seeker and photography lover',
    instagram: 'sarah_adventures'
  },
  {
    name: 'Mike Rodriguez',
    email: 'mike@test.com',
    username: 'mikerodriguez',
    password: 'password123',
    country: 'Spain',
    bio: 'Backpacker and culture enthusiast',
    instagram: 'mike_backpacker'
  },
  {
    name: 'Emma Wilson',
    email: 'emma@test.com',
    username: 'emmawilson',
    password: 'password123',
    country: 'Australia',
    bio: 'Beach lover and surf enthusiast',
    instagram: 'emma_surfs'
  },
  {
    name: 'David Kim',
    email: 'david@test.com',
    username: 'davidkim',
    password: 'password123',
    country: 'South Korea',
    bio: 'Foodie and city explorer',
    instagram: 'david_foodie'
  }
];

// Test trips data
const testTrips = [
  {
    destination: 'Paris Adventure',
    description: 'Exploring the city of lights with fellow travelers',
    tripType: 'cultural',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days ago
    status: 'completed',
    maxMembers: 4,
    budget: 2000,
    requirements: ['Passport', 'Travel insurance'],
    tags: ['culture', 'food', 'sightseeing']
  },
  {
    destination: 'Tokyo Exploration',
    description: 'Discovering the blend of tradition and technology',
    tripType: 'adventure',
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
    endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
    status: 'completed',
    maxMembers: 3,
    budget: 3000,
    requirements: ['Visa', 'Travel insurance'],
    tags: ['technology', 'culture', 'food']
  },
  {
    destination: 'Barcelona Beach Trip',
    description: 'Sun, sea, and Spanish culture',
    tripType: 'beach',
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days from now
    status: 'active',
    maxMembers: 5,
    budget: 1500,
    requirements: ['Passport'],
    tags: ['beach', 'relaxation', 'culture']
  }
];

// Test posts data
const testPosts = [
  {
    content: 'Just completed an amazing trip to Paris! The Eiffel Tower was breathtaking at sunset. 🗼✨ #Paris #Travel #Adventure'
  },
  {
    content: 'Exploring the hidden gems of Tokyo. The street food here is incredible! 🍜🍣 #Tokyo #Foodie #Travel'
  },
  {
    content: 'Planning my next adventure to Barcelona. Anyone have recommendations for the best beaches? 🏖️ #Barcelona #Planning'
  }
];

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

async function createTestUsers() {
  console.log('\n👥 Creating test users...');
  const createdUsers = [];
  
  for (const userData of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`   User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }

      // Create user via API
      const response = await axios.post(`${BASE_URL}/api/users/register`, userData);
      const user = response.data.user;
      createdUsers.push(user);
      console.log(`   ✅ Created user: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(`   ❌ Failed to create user ${userData.email}:`, error.response?.data?.message || error.message);
    }
  }
  
  return createdUsers;
}

async function loginUsers(users) {
  console.log('\n🔐 Logging in users...');
  const loggedInUsers = [];
  
  for (const user of users) {
    try {
      const response = await axios.post(`${BASE_URL}/api/users/login`, {
        email: user.email,
        password: 'password123'
      });
      
      loggedInUsers.push({
        ...user,
        token: response.data.token
      });
      console.log(`   ✅ Logged in: ${user.name}`);
    } catch (error) {
      console.error(`   ❌ Failed to login ${user.email}:`, error.response?.data?.message || error.message);
    }
  }
  
  return loggedInUsers;
}

async function createTestTrips(loggedInUsers) {
  console.log('\n🗺️ Creating test trips...');
  const createdTrips = [];
  
  for (let i = 0; i < testTrips.length; i++) {
    const tripData = testTrips[i];
    const creator = loggedInUsers[i % loggedInUsers.length];
    
    try {
      const response = await axios.post(`${BASE_URL}/api/trips`, {
        ...tripData,
        creator: creator._id
      }, {
        headers: { Authorization: `Bearer ${creator.token}` }
      });
      
      const trip = response.data.trip;
      createdTrips.push(trip);
      console.log(`   ✅ Created trip: ${trip.destination} (Creator: ${creator.name})`);
    } catch (error) {
      console.error(`   ❌ Failed to create trip ${tripData.destination}:`, error.response?.data?.message || error.message);
    }
  }
  
  return createdTrips;
}

async function addMembersToTrips(trips, loggedInUsers) {
  console.log('\n👥 Adding members to trips...');
  
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    const creator = loggedInUsers[i % loggedInUsers.length];
    
    // Add other users as members (excluding the creator)
    const otherUsers = loggedInUsers.filter(user => user._id !== creator._id);
    
    for (const member of otherUsers.slice(0, 2)) { // Add max 2 members per trip
      try {
        await axios.post(`${BASE_URL}/api/trips/${trip._id}/join`, {}, {
          headers: { Authorization: `Bearer ${member.token}` }
        });
        console.log(`   ✅ Added ${member.name} to ${trip.destination}`);
      } catch (error) {
        console.log(`   ⚠️ Could not add ${member.name} to ${trip.destination}: ${error.response?.data?.message || error.message}`);
      }
    }
  }
}

async function createTestPosts(loggedInUsers) {
  console.log('\n📝 Creating test posts...');
  
  for (let i = 0; i < testPosts.length; i++) {
    const postData = testPosts[i];
    const author = loggedInUsers[i % loggedInUsers.length];
    
    try {
      await axios.post(`${BASE_URL}/api/posts`, postData, {
        headers: { Authorization: `Bearer ${author.token}` }
      });
      console.log(`   ✅ Created post by ${author.name}`);
    } catch (error) {
      console.error(`   ❌ Failed to create post:`, error.response?.data?.message || error.message);
    }
  }
}

async function testFriendsSystem(loggedInUsers) {
  console.log('\n🤝 Testing friends system...');
  
  // Test 1: Check initial friends count
  const alex = loggedInUsers[0];
  try {
    const response = await axios.get(`${BASE_URL}/api/users/${alex._id}/friends`, {
      headers: { Authorization: `Bearer ${alex.token}` }
    });
    console.log(`   📊 Initial friends count for ${alex.name}: ${response.data.count}`);
  } catch (error) {
    console.log(`   📊 Initial friends count for ${alex.name}: 0 (no friends yet)`);
  }
  
  // Test 2: Manually add a friend
  const sarah = loggedInUsers[1];
  try {
    await axios.post(`${BASE_URL}/api/users/${sarah._id}/add-friend`, {}, {
      headers: { Authorization: `Bearer ${alex.token}` }
    });
    console.log(`   ✅ ${alex.name} manually added ${sarah.name} as friend`);
  } catch (error) {
    console.log(`   ⚠️ Could not manually add friend: ${error.response?.data?.message || error.message}`);
  }
  
  // Test 3: Check friends count after manual addition
  try {
    const response = await axios.get(`${BASE_URL}/api/users/${alex._id}/friends`, {
      headers: { Authorization: `Bearer ${alex.token}` }
    });
    console.log(`   📊 Friends count after manual addition: ${response.data.count}`);
  } catch (error) {
    console.log(`   📊 Friends count after manual addition: Error checking`);
  }
}

async function displayTestCredentials(loggedInUsers) {
  console.log('\n📋 Test Credentials:');
  console.log('='.repeat(50));
  
  loggedInUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: password123`);
    console.log(`   Username: ${user.username}`);
    console.log('');
  });
  
  console.log('🔗 Login URLs:');
  console.log('   Frontend: http://localhost:3000/login');
  console.log('   Backend API: http://localhost:5000');
  console.log('');
  console.log('📝 Test Scenarios:');
  console.log('   1. Login with any user above');
  console.log('   2. Go to profile page to see stats cards with proper spacing');
  console.log('   3. Check friends section to see manually added friends');
  console.log('   4. Complete a trip to trigger automatic friend addition');
  console.log('   5. Test removing friends manually');
  console.log('='.repeat(50));
}

async function main() {
  try {
    console.log('🚀 Starting Friends System Test Data Setup...');
    
    await connectDB();
    
    // Create test users
    const users = await createTestUsers();
    
    // Login users to get tokens
    const loggedInUsers = await loginUsers(users);
    
    // Create test trips
    const trips = await createTestTrips(loggedInUsers);
    
    // Add members to trips
    await addMembersToTrips(trips, loggedInUsers);
    
    // Create test posts
    await createTestPosts(loggedInUsers);
    
    // Test friends system
    await testFriendsSystem(loggedInUsers);
    
    // Display test credentials
    await displayTestCredentials(loggedInUsers);
    
    console.log('\n✅ Test data setup completed successfully!');
    console.log('🎯 You can now test all the new functionality:');
    console.log('   - Profile stats card spacing');
    console.log('   - Automatic friend system');
    console.log('   - Manual friend removal');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();
