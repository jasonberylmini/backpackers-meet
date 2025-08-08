import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const BACKEND_URL = 'http://localhost:5000';

// Test user for KYC
const testUser = {
  name: 'KYC Test User',
  email: 'kyctest@example.com',
  password: 'password123'
};

let userToken = '';
let adminToken = '';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ridetribe');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createTestUser = async () => {
  console.log('\n📝 Creating test user...');
  
  try {
    // Register user
    const registerResponse = await axios.post(`${BACKEND_URL}/api/users/register`, testUser);
    console.log(`✅ Created user: ${testUser.email}`);
    
    // Login to get token
    const loginResponse = await axios.post(`${BACKEND_URL}/api/users/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    userToken = loginResponse.data.token;
    console.log(`✅ Logged in user: ${testUser.email}`);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`⚠️  User already exists: ${testUser.email}`);
      
      // Try to login
      try {
        const loginResponse = await axios.post(`${BACKEND_URL}/api/users/login`, {
          email: testUser.email,
          password: testUser.password
        });
        
        userToken = loginResponse.data.token;
        console.log(`✅ Logged in existing user: ${testUser.email}`);
      } catch (loginError) {
        console.error(`❌ Failed to login user: ${testUser.email}`, loginError.response?.data);
      }
    } else {
      console.error(`❌ Failed to create user: ${testUser.email}`, error.response?.data);
    }
  }
};

const createAdminUser = async () => {
  console.log('\n👑 Creating admin user...');
  
  const adminUser = {
    name: 'KYC Admin',
    email: 'kycadmin@example.com',
    password: 'admin123'
  };
  
  try {
    // Register admin
    const registerResponse = await axios.post(`${BACKEND_URL}/api/users/register`, adminUser);
    console.log(`✅ Created admin: ${adminUser.email}`);
    
    // Login to get token
    const loginResponse = await axios.post(`${BACKEND_URL}/api/users/login`, {
      email: adminUser.email,
      password: adminUser.password
    });
    
    adminToken = loginResponse.data.token;
    console.log(`✅ Logged in admin: ${adminUser.email}`);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`⚠️  Admin already exists: ${adminUser.email}`);
      
      // Try to login
      try {
        const loginResponse = await axios.post(`${BACKEND_URL}/api/users/login`, {
          email: adminUser.email,
          password: adminUser.password
        });
        
        adminToken = loginResponse.data.token;
        console.log(`✅ Logged in existing admin: ${adminUser.email}`);
      } catch (loginError) {
        console.error(`❌ Failed to login admin: ${adminUser.email}`, loginError.response?.data);
      }
    } else {
      console.error(`❌ Failed to create admin: ${adminUser.email}`, error.response?.data);
    }
  }
};

const testUserProfile = async () => {
  console.log('\n👤 Testing user profile...');
  
  if (!userToken) {
    console.log('❌ No user token available');
    return;
  }
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    console.log(`✅ User profile retrieved: ${response.data.name}`);
    console.log(`   Verification status: ${response.data.verificationStatus || 'not set'}`);
  } catch (error) {
    console.error('❌ Failed to get user profile:', error.response?.data);
  }
};

const testPendingKYCUsers = async () => {
  console.log('\n📊 Testing pending KYC users...');
  
  if (!adminToken) {
    console.log('❌ No admin token available');
    return;
  }
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/users/unverified`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log(`✅ Found ${response.data.length} pending KYC users`);
    
    if (response.data.length > 0) {
      console.log('   Users:');
      response.data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.verificationStatus}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to get pending KYC users:', error.response?.data);
  }
};

const testNotifications = async () => {
  console.log('\n🔔 Testing notifications...');
  
  if (!userToken) {
    console.log('❌ No user token available');
    return;
  }
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    console.log(`✅ User has ${response.data.length} notifications`);
    
    if (response.data.length > 0) {
      console.log('   Latest notifications:');
      response.data.slice(0, 3).forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}: ${notification.message}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to get notifications:', error.response?.data);
  }
};

const main = async () => {
  console.log('🚀 Starting Simple KYC System Test...');
  
  await connectDB();
  await createTestUser();
  await createAdminUser();
  await testUserProfile();
  await testPendingKYCUsers();
  await testNotifications();
  
  console.log('\n✅ Simple KYC System Test Completed!');
  console.log('\n📋 Test Credentials:');
  console.log('User:', testUser.email, '/', testUser.password);
  console.log('Admin: kycadmin@example.com / admin123');
  console.log('\n💡 To test the full KYC flow:');
  console.log('1. Login with the user credentials');
  console.log('2. Go to KYC verification page');
  console.log('3. Upload documents');
  console.log('4. Login as admin to verify/reject');
  
  process.exit(0);
};

main().catch(console.error);
