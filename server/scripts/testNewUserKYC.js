import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Test new user credentials
const newUser = {
  name: 'New Test User',
  email: 'newtestuser@example.com',
  password: 'newtestpass123'
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

async function createNewUser() {
  try {
    console.log('Creating new test user...');
    const response = await axios.post(`${BACKEND_URL}/api/users/register`, newUser);
    console.log('✅ New user created:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('⚠️ User already exists, deleting and recreating...');
      // Try to delete the existing user first
      try {
        const User = mongoose.model('User');
        await User.findOneAndDelete({ email: newUser.email });
        console.log('✅ Existing user deleted');
        
        // Create again
        const response = await axios.post(`${BACKEND_URL}/api/users/register`, newUser);
        console.log('✅ New user created:', response.data);
        return response.data;
      } catch (deleteError) {
        console.error('❌ Failed to delete existing user:', deleteError);
        return null;
      }
    }
    console.error('❌ Failed to create new user:', error.response?.data);
    return null;
  }
}

async function loginUser() {
  try {
    console.log('Logging in as new user...');
    const response = await axios.post(`${BACKEND_URL}/api/users/login`, {
      email: newUser.email,
      password: newUser.password
    });
    console.log('✅ User login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ User login failed:', error.response?.data);
    return null;
  }
}

async function checkUserProfile(userToken) {
  try {
    console.log('Checking user profile...');
    const headers = { Authorization: `Bearer ${userToken}` };
    const response = await axios.get(`${BACKEND_URL}/api/users/profile`, { headers });
    
    console.log('📋 User Profile:');
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Email: ${response.data.email}`);
    console.log(`   Verification Status: ${response.data.verificationStatus}`);
    console.log(`   ID Document: ${response.data.idDocument || 'Not uploaded'}`);
    console.log(`   ID Selfie: ${response.data.idSelfie || 'Not uploaded'}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get user profile:', error.response?.data);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing New User KYC Flow');
  console.log('============================');
  
  await connectDB();
  
  // Create new user
  await createNewUser();
  
  // Login as user
  const userToken = await loginUser();
  if (!userToken) {
    console.log('❌ Cannot proceed without user token');
    process.exit(1);
  }
  
  // Check user profile
  const userProfile = await checkUserProfile(userToken);
  
  // Analysis
  console.log('\n📊 Analysis:');
  if (userProfile) {
    if (userProfile.verificationStatus === null) {
      console.log('✅ CORRECT: New user has null verification status');
      console.log('✅ This means they will see the upload interface');
    } else if (userProfile.verificationStatus === 'pending') {
      console.log('❌ ISSUE: New user has pending verification status');
      console.log('❌ This means they will see the pending interface instead of upload');
    } else {
      console.log(`⚠️ UNEXPECTED: New user has ${userProfile.verificationStatus} status`);
    }
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Test completed');
}

main().catch(console.error);
