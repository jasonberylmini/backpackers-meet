import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  // Test 1: Server is running
  try {
    const response = await axios.get(`${BASE_URL}/`);
    console.log('✅ Server is running:', response.data);
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return;
  }

  // Test 2: Try to register a new user
  const testUser = {
    name: 'API Test User',
    email: 'apitest@example.com',
    password: 'password123'
  };

  console.log('\n👤 Testing user registration...');
  try {
    const response = await axios.post(`${BASE_URL}/api/users/register`, testUser);
    console.log('✅ User registered successfully:', response.data.user.email);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️ User already exists, trying to login...');
    } else {
      console.log('❌ Registration failed:', error.response?.data?.message || error.message);
      return;
    }
  }

  // Test 3: Try to login
  console.log('\n🔐 Testing user login...');
  try {
    const response = await axios.post(`${BASE_URL}/api/users/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', response.data.user.email);
    console.log('   Token received:', response.data.token ? 'Yes' : 'No');
    
    const token = response.data.token;
    const userId = response.data.user._id;

    // Test 4: Get user profile
    console.log('\n👤 Testing get user profile...');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Profile retrieved:', profileResponse.data.name);
    } catch (error) {
      console.log('❌ Profile retrieval failed:', error.response?.data?.message || error.message);
    }

    // Test 5: Get friends
    console.log('\n🤝 Testing get friends...');
    try {
      const friendsResponse = await axios.get(`${BASE_URL}/api/users/${userId}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Friends retrieved, count:', friendsResponse.data.count);
    } catch (error) {
      console.log('❌ Friends retrieval failed:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    console.log('   Status:', error.response?.status);
    console.log('   Data:', error.response?.data);
  }

  console.log('\n✅ API test completed!');
}

testAPI().catch(console.error);
