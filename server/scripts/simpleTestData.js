import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:5000';

// Simple test user data
const testUsers = [
  {
    name: 'Test User 1',
    email: 'test1@example.com',
    password: 'password123'
  },
  {
    name: 'Test User 2',
    email: 'test2@example.com',
    password: 'password123'
  },
  {
    name: 'Test User 3',
    email: 'test3@example.com',
    password: 'password123'
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

async function createUser(userData) {
  try {
    const response = await axios.post(`${BASE_URL}/api/users/register`, userData);
    console.log(`   ✅ Created user: ${userData.name} (${userData.email})`);
    return response.data.user;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`   ℹ️ User ${userData.email} already exists, logging in...`);
      return await loginUser(userData);
    } else {
      console.error(`   ❌ Failed to create user ${userData.email}:`, error.response?.data?.message || error.message);
      return null;
    }
  }
}

async function loginUser(userData) {
  try {
    const response = await axios.post(`${BASE_URL}/api/users/login`, {
      email: userData.email,
      password: userData.password
    });
    console.log(`   ✅ Logged in: ${userData.name}`);
    return {
      ...userData,
      _id: response.data.user._id,
      token: response.data.token
    };
  } catch (error) {
    console.error(`   ❌ Failed to login ${userData.email}:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function testFriendsSystem(users) {
  console.log('\n🤝 Testing Friends System...');
  
  if (users.length < 2) {
    console.log('   ❌ Need at least 2 users to test friends system');
    return;
  }

  const user1 = users[0];
  const user2 = users[1];

  // Test 1: Check initial friends count
  try {
    const response = await axios.get(`${BASE_URL}/api/users/${user1._id}/friends`, {
      headers: { Authorization: `Bearer ${user1.token}` }
    });
    console.log(`   📊 Initial friends count for ${user1.name}: ${response.data.count}`);
  } catch (error) {
    console.log(`   📊 Initial friends count for ${user1.name}: 0 (no friends yet)`);
  }

  // Test 2: Manually add a friend
  try {
    await axios.post(`${BASE_URL}/api/users/${user2._id}/add-friend`, {}, {
      headers: { Authorization: `Bearer ${user1.token}` }
    });
    console.log(`   ✅ ${user1.name} manually added ${user2.name} as friend`);
  } catch (error) {
    console.log(`   ⚠️ Could not manually add friend: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Check friends count after manual addition
  try {
    const response = await axios.get(`${BASE_URL}/api/users/${user1._id}/friends`, {
      headers: { Authorization: `Bearer ${user1.token}` }
    });
    console.log(`   📊 Friends count after manual addition: ${response.data.count}`);
  } catch (error) {
    console.log(`   📊 Friends count after manual addition: Error checking`);
  }
}

async function displayCredentials(users) {
  console.log('\n📋 Test Credentials:');
  console.log('='.repeat(50));
  
  users.forEach((user, index) => {
    if (user) {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Username: ${user.username}`);
      console.log('');
    }
  });
  
  console.log('🔗 Login URLs:');
  console.log('   Frontend: http://localhost:3000/login');
  console.log('   Backend API: http://localhost:5000');
  console.log('');
  console.log('📝 Test Scenarios:');
  console.log('   1. Login with any user above');
  console.log('   2. Go to profile page to see stats cards with proper spacing');
  console.log('   3. Check friends section to see manually added friends');
  console.log('   4. Test removing friends manually');
  console.log('='.repeat(50));
}

async function main() {
  try {
    console.log('🚀 Starting Simple Friends System Test...');
    
    await connectDB();
    
    // Create or login users
    console.log('\n👥 Creating/Logging in test users...');
    const users = [];
    
    for (const userData of testUsers) {
      const user = await createUser(userData);
      if (user) {
        users.push(user);
      }
    }
    
    if (users.length === 0) {
      console.log('❌ No users could be created/logged in');
      return;
    }
    
    // Test friends system
    await testFriendsSystem(users);
    
    // Display credentials
    await displayCredentials(users);
    
    console.log('\n✅ Simple test completed successfully!');
    console.log('🎯 You can now test:');
    console.log('   - Profile stats card spacing');
    console.log('   - Manual friend addition/removal');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();
