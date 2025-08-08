import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Test user credentials
const testUser = {
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

async function loginUser() {
  try {
    console.log('Logging in as test user...');
    const response = await axios.post(`${BACKEND_URL}/api/users/login`, testUser);
    console.log('✅ User login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ User login failed:', error.response?.data);
    return null;
  }
}

async function createTestImage() {
  // Create a simple test image (1x1 pixel PNG)
  const testImagePath = path.join(process.cwd(), 'test-image.png');
  
  // Create a minimal PNG file (1x1 pixel, transparent)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(testImagePath, pngData);
  console.log('✅ Test image created:', testImagePath);
  return testImagePath;
}

async function testKYCupload(userToken) {
  try {
    console.log('Testing KYC document upload...');
    
    // Create test images
    const idDocumentPath = await createTestImage();
    const selfiePath = await createTestImage();
    
    // Create FormData
    const formData = new FormData();
    formData.append('idDocument', fs.createReadStream(idDocumentPath), {
      filename: 'test-id-document.png',
      contentType: 'image/png'
    });
    formData.append('idSelfie', fs.createReadStream(selfiePath), {
      filename: 'test-selfie.png',
      contentType: 'image/png'
    });
    
    console.log('FormData created with files');
    
    // Make the request
    const headers = {
      'Authorization': `Bearer ${userToken}`,
      ...formData.getHeaders()
    };
    
    console.log('Making request to:', `${BACKEND_URL}/api/users/profile`);
    console.log('Headers:', headers);
    
    const response = await axios.put(`${BACKEND_URL}/api/users/profile`, formData, { headers });
    
    console.log('✅ Upload successful:', response.data);
    
    // Clean up test files
    fs.unlinkSync(idDocumentPath);
    fs.unlinkSync(selfiePath);
    
    return true;
  } catch (error) {
    console.error('❌ Upload failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    // Clean up test files if they exist
    try {
      if (fs.existsSync('test-image.png')) {
        fs.unlinkSync('test-image.png');
      }
    } catch (cleanupError) {
      console.log('Could not clean up test file');
    }
    
    return false;
  }
}

async function main() {
  console.log('🧪 Testing KYC Document Upload');
  console.log('==============================');
  
  await connectDB();
  
  // Login as user
  const userToken = await loginUser();
  if (!userToken) {
    console.log('❌ Cannot proceed without user token');
    process.exit(1);
  }
  
  // Test KYC upload
  const uploadSuccess = await testKYCupload(userToken);
  
  // Summary
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`KYC Upload: ${uploadSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  await mongoose.disconnect();
  console.log('\n✅ Test completed');
}

main().catch(console.error);
