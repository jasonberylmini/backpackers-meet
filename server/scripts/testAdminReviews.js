import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const API_BASE_URL = 'http://localhost:5000/api';

async function testAdminReviews() {
  try {
    console.log('🧪 Testing Admin Reviews API Functionality...\n');

    // Test 1: Login as admin user
    console.log('🔐 Test 1: Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'admin@backpacker.com',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    const admin = loginResponse.data.user;
    console.log(`✅ Logged in as: ${admin.name} (${admin.role})`);

    // Test 2: Get all reviews
    console.log('\n📊 Test 2: Getting all reviews...');
    const allReviewsResponse = await axios.get(`${API_BASE_URL}/reviews/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${allReviewsResponse.data.reviews.length} reviews`);
    console.log(`Total reviews: ${allReviewsResponse.data.total}`);

    // Test 3: Get review stats
    console.log('\n📈 Test 3: Getting review stats...');
    const statsResponse = await axios.get(`${API_BASE_URL}/admin/review-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Review stats:', statsResponse.data);

    // Test 4: Test filtering reviews
    console.log('\n🔍 Test 4: Testing review filters...');
    const filteredResponse = await axios.get(`${API_BASE_URL}/reviews/all?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${filteredResponse.data.reviews.length} pending reviews`);

    // Test 5: Test search functionality
    console.log('\n🔍 Test 5: Testing search functionality...');
    const searchResponse = await axios.get(`${API_BASE_URL}/reviews/all?search=amazing`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${searchResponse.data.reviews.length} reviews with "amazing"`);

    // Test 6: Test rating filter
    console.log('\n⭐ Test 6: Testing rating filter...');
    const ratingResponse = await axios.get(`${API_BASE_URL}/reviews/all?rating=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${ratingResponse.data.reviews.length} 5-star reviews`);

    // Test 7: Test type filter
    console.log('\n📝 Test 7: Testing type filter...');
    const typeResponse = await axios.get(`${API_BASE_URL}/reviews/all?type=user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${typeResponse.data.reviews.length} user reviews`);

    // Test 8: Test pagination
    console.log('\n📄 Test 8: Testing pagination...');
    const pageResponse = await axios.get(`${API_BASE_URL}/reviews/all?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Page 1 with limit 5: ${pageResponse.data.reviews.length} reviews`);

    console.log('\n🎉 All Admin Reviews API tests completed successfully!');

  } catch (error) {
    console.error('❌ Admin Reviews API test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testAdminReviews();
