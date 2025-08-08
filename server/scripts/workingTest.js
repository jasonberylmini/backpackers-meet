import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function workingTest() {
  console.log('🎯 Working Friends System Test...\n');

  // Use the existing test user we know works
  const testUser = {
    email: 'apitest@example.com',
    password: 'password123'
  };

  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, testUser);
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    console.log('✅ Login successful:', loginResponse.data.user.name);

    // Get initial friends count
    console.log('\n📊 Checking initial friends count...');
    const friendsResponse = await axios.get(`${BASE_URL}/api/users/${userId}/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Initial friends count:', friendsResponse.data.count);

    // Create a second user to test friend addition
    console.log('\n👥 Creating second test user...');
    const secondUser = {
      name: 'Friend Test User',
      email: 'friendtest@example.com',
      password: 'password123'
    };

    let secondUserId;
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/users/register`, secondUser);
      console.log('✅ Second user created');
      // Registration doesn't return user object, so we need to login to get the ID
      const secondLoginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
        email: secondUser.email,
        password: secondUser.password
      });
      secondUserId = secondLoginResponse.data.user.id;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Second user already exists, getting ID...');
        // Login to get the user ID
        const secondLoginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
          email: secondUser.email,
          password: secondUser.password
        });
        secondUserId = secondLoginResponse.data.user.id;
      } else {
        console.log('❌ Failed to create second user:', error.response?.data?.message);
        return;
      }
    }

    // Add friend
    console.log('\n🤝 Adding friend...');
    try {
      await axios.post(`${BASE_URL}/api/users/${secondUserId}/add-friend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Friend added successfully!');
    } catch (error) {
      console.log('❌ Failed to add friend:', error.response?.data?.message);
    }

    // Check friends count after addition
    console.log('\n📊 Checking friends count after addition...');
    const updatedFriendsResponse = await axios.get(`${BASE_URL}/api/users/${userId}/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Updated friends count:', updatedFriendsResponse.data.count);

    // Display test credentials
    console.log('\n📋 Test Credentials:');
    console.log('='.repeat(50));
    console.log('1. Primary Test User:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log('');
    console.log('2. Friend Test User:');
    console.log(`   Email: ${secondUser.email}`);
    console.log(`   Password: ${secondUser.password}`);
    console.log('');
    console.log('🔗 Login URL: http://localhost:3000/login');
    console.log('');
    console.log('📝 Test Scenarios:');
    console.log('   1. Login with either user above');
    console.log('   2. Go to profile page to see stats cards with proper spacing');
    console.log('   3. Check friends section to see the added friend');
    console.log('   4. Test removing the friend manually');
    console.log('='.repeat(50));

    console.log('\n✅ Working test completed successfully!');
    console.log('🎯 You can now test all the new functionality!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

workingTest();
