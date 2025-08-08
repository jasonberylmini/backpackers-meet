import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import User from '../models/User.js';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Test user and admin credentials
const testUser = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'testpass123'
};

const adminUser = {
  email: 'admin@example.com',
  password: 'adminpass123'
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createTestUser() {
  try {
    console.log('Creating test user...');
    const response = await axios.post(`${BACKEND_URL}/api/users/register`, testUser);
    console.log('✅ Test user created:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('⚠️ Test user already exists');
      return null;
    }
    console.error('❌ Failed to create test user:', error.response?.data);
    return null;
  }
}

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    const adminData = {
      name: 'Admin User',
      email: adminUser.email,
      password: adminUser.password
    };
    const response = await axios.post(`${BACKEND_URL}/api/users/register`, adminData);
    console.log('✅ Admin user created:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('⚠️ Admin user already exists');
      return null;
    }
    console.error('❌ Failed to create admin user:', error.response?.data);
    return null;
  }
}

async function loginAdmin() {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${BACKEND_URL}/api/users/login`, adminUser);
    console.log('✅ Admin login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data);
    return null;
  }
}

async function getTestUser(adminToken) {
  try {
    console.log('Getting test user...');
    const headers = { Authorization: `Bearer ${adminToken}` };
    const response = await axios.get(`${BACKEND_URL}/api/admin/users`, { headers });
    console.log('Response data length:', response.data.length);
    const testUserData = response.data.find(user => user.email === testUser.email);
    if (testUserData) {
      console.log('✅ Test user found:', testUserData._id);
      return testUserData._id;
    }
    console.log('❌ Test user not found');
    return null;
  } catch (error) {
    console.error('❌ Failed to get test user:', error.response?.data);
    console.error('Full error:', error);
    return null;
  }
}

async function testRejectEndpoint(adminToken, userId) {
  try {
    console.log('Testing reject endpoint...');
    const headers = { Authorization: `Bearer ${adminToken}` };
    const payload = {
      verificationStatus: 'rejected',
      rejectionReason: 'Test rejection reason'
    };
    
    console.log('Request payload:', payload);
    console.log('User ID:', userId);
    
    const response = await axios.put(`${BACKEND_URL}/api/admin/verify/${userId}`, payload, { headers });
    console.log('✅ Reject endpoint successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Reject endpoint failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    return false;
  }
}

async function testVerifyEndpoint(adminToken, userId) {
  try {
    console.log('Testing verify endpoint...');
    const headers = { Authorization: `Bearer ${adminToken}` };
    const payload = {
      verificationStatus: 'verified'
    };
    
    console.log('Request payload:', payload);
    console.log('User ID:', userId);
    
    const response = await axios.put(`${BACKEND_URL}/api/admin/verify/${userId}`, payload, { headers });
    console.log('✅ Verify endpoint successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Verify endpoint failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing KYC Reject/Verify Endpoints');
  console.log('=====================================');
  
  await connectDB();
  
  // Create test user
  await createTestUser();
  
  // Create admin user
  await createAdminUser();
  
  // Set admin role (we'll need to do this directly in the database)
  try {
    console.log('Setting admin role...');
    await User.findOneAndUpdate(
      { email: adminUser.email },
      { role: 'admin' },
      { new: true }
    );
    console.log('✅ Admin role set');
  } catch (error) {
    console.error('❌ Failed to set admin role:', error);
  }
  
  // Login as admin
  const adminToken = await loginAdmin();
  if (!adminToken) {
    console.log('❌ Cannot proceed without admin token');
    process.exit(1);
  }
  
  // Get test user ID
  const userId = await getTestUser(adminToken);
  if (!userId) {
    console.log('❌ Cannot proceed without test user ID');
    process.exit(1);
  }
  
  // Test reject endpoint
  console.log('\n🧪 Testing Reject Endpoint');
  console.log('==========================');
  const rejectSuccess = await testRejectEndpoint(adminToken, userId);
  
  // Test verify endpoint
  console.log('\n🧪 Testing Verify Endpoint');
  console.log('==========================');
  const verifySuccess = await testVerifyEndpoint(adminToken, userId);
  
  // Summary
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`Reject endpoint: ${rejectSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Verify endpoint: ${verifySuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  await mongoose.disconnect();
  console.log('\n✅ Test completed');
}

main().catch(console.error);
