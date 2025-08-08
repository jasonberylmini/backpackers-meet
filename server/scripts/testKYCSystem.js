import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Test users for KYC
const testUsers = [
  {
    name: 'John Doe',
    email: 'john.kyc@example.com',
    password: 'password123',
    gender: 'male',
    preferences: {
      interests: ['hiking', 'photography'],
      travelStyle: 'budget',
      accommodation: 'hostel'
    }
  },
  {
    name: 'Jane Smith',
    email: 'jane.kyc@example.com',
    password: 'password123',
    gender: 'female',
    preferences: {
      interests: ['culture', 'food'],
      travelStyle: 'luxury',
      accommodation: 'hotel'
    }
  },
  {
    name: 'Mike Johnson',
    email: 'mike.kyc@example.com',
    password: 'password123',
    gender: 'male',
    preferences: {
      interests: ['adventure', 'sports'],
      travelStyle: 'moderate',
      accommodation: 'mixed'
    }
  }
];

// Admin user for testing
const adminUser = {
  name: 'Admin User',
  email: 'admin.kyc@example.com',
  password: 'admin123',
  role: 'admin'
};

let adminToken = '';
let testUserTokens = [];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ridetribe');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createTestUsers = async () => {
  console.log('\n📝 Creating test users...');
  
  for (const userData of testUsers) {
    try {
      // Register user
      const registerResponse = await axios.post(`${BACKEND_URL}/api/users/register`, userData);
      console.log(`✅ Created user: ${userData.email}`);
      
      // Login to get token
      const loginResponse = await axios.post(`${BACKEND_URL}/api/users/login`, {
        email: userData.email,
        password: userData.password
      });
      
      testUserTokens.push({
        email: userData.email,
        token: loginResponse.data.token,
        userId: loginResponse.data.user._id
      });
      
      console.log(`✅ Logged in user: ${userData.email}`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        
        // Try to login
        try {
          const loginResponse = await axios.post(`${BACKEND_URL}/api/users/login`, {
            email: userData.email,
            password: userData.password
          });
          
          testUserTokens.push({
            email: userData.email,
            token: loginResponse.data.token,
            userId: loginResponse.data.user._id
          });
          
          console.log(`✅ Logged in existing user: ${userData.email}`);
        } catch (loginError) {
          console.error(`❌ Failed to login user: ${userData.email}`, loginError.response?.data);
        }
      } else {
        console.error(`❌ Failed to create user: ${userData.email}`, error.response?.data);
      }
    }
  }
};

const createAdminUser = async () => {
  console.log('\n👑 Creating admin user...');
  
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

const testKYCSubmission = async () => {
  console.log('\n📄 Testing KYC submission...');
  
  for (const userToken of testUserTokens) {
    try {
      // Create mock files (in real scenario, these would be actual image files)
      const formData = new FormData();
      
      // Create a mock file for ID document
      const idDocumentBlob = new Blob(['mock id document content'], { type: 'image/jpeg' });
      formData.append('idDocument', idDocumentBlob, 'id_document.jpg');
      
      // Create a mock file for selfie
      const selfieBlob = new Blob(['mock selfie content'], { type: 'image/jpeg' });
      formData.append('selfie', selfieBlob, 'selfie.jpg');
      
      const response = await axios.post(`${BACKEND_URL}/api/users/kyc`, formData, {
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log(`✅ KYC submitted for: ${userToken.email}`);
    } catch (error) {
      console.error(`❌ Failed to submit KYC for: ${userToken.email}`, error.response?.data);
    }
  }
};

const testAdminKYCVerification = async () => {
  console.log('\n🔍 Testing admin KYC verification...');
  
  if (!adminToken) {
    console.log('❌ No admin token available');
    return;
  }
  
  try {
    // Get pending KYC users
    const pendingResponse = await axios.get(`${BACKEND_URL}/api/admin/users/pending-kyc`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log(`📊 Found ${pendingResponse.data.length} pending KYC users`);
    
    // Verify first user
    if (pendingResponse.data.length > 0) {
      const firstUser = pendingResponse.data[0];
      
      const verifyResponse = await axios.put(`${BACKEND_URL}/api/admin/users/${firstUser._id}/verify`, {
        verificationStatus: 'verified'
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      console.log(`✅ Verified user: ${firstUser.email}`);
    }
    
    // Reject second user (if exists)
    if (pendingResponse.data.length > 1) {
      const secondUser = pendingResponse.data[1];
      
      const rejectResponse = await axios.put(`${BACKEND_URL}/api/admin/users/${secondUser._id}/verify`, {
        verificationStatus: 'rejected',
        rejectionReason: 'Documents are unclear and do not meet verification standards'
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      console.log(`❌ Rejected user: ${secondUser.email}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to test admin KYC verification:', error.response?.data);
  }
};

const testNotifications = async () => {
  console.log('\n🔔 Testing notifications...');
  
  for (const userToken of testUserTokens) {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${userToken.token}` }
      });
      
      console.log(`📱 User ${userToken.email} has ${response.data.length} notifications`);
      
      if (response.data.length > 0) {
        console.log(`   Latest: ${response.data[0].title} - ${response.data[0].message}`);
      }
    } catch (error) {
      console.error(`❌ Failed to get notifications for: ${userToken.email}`, error.response?.data);
    }
  }
};

const main = async () => {
  console.log('🚀 Starting KYC System Test...');
  
  await connectDB();
  await createTestUsers();
  await createAdminUser();
  await testKYCSubmission();
  await testAdminKYCVerification();
  await testNotifications();
  
  console.log('\n✅ KYC System Test Completed!');
  console.log('\n📋 Test Credentials:');
  console.log('Admin:', adminUser.email, '/', adminUser.password);
  testUsers.forEach((user, index) => {
    console.log(`User ${index + 1}:`, user.email, '/', user.password);
  });
  
  process.exit(0);
};

main().catch(console.error);
