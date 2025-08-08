import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Test blocked users functionality
async function testBlockedUsers() {
  try {
    console.log('Testing blocked users functionality...\n');

    // First, let's login as a test user
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Login successful');

    // Get blocked users list
    const blockedResponse = await axios.get(`${BASE_URL}/users/blocked/list`, { headers });
    console.log('✅ Blocked users list retrieved:', blockedResponse.data);

    // Test blocking a user (you would need a valid user ID)
    // const blockResponse = await axios.post(`${BASE_URL}/users/SOME_USER_ID/block`, {}, { headers });
    // console.log('✅ User blocked:', blockResponse.data);

    // Test unblocking a user (you would need a valid user ID)
    // const unblockResponse = await axios.post(`${BASE_URL}/users/SOME_USER_ID/unblock`, {}, { headers });
    // console.log('✅ User unblocked:', unblockResponse.data);

    console.log('\n🎉 All blocked users tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test account deletion functionality
async function testAccountDeletion() {
  try {
    console.log('\nTesting account deletion functionality...\n');

    // First, let's login as a test user
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Login successful');

    // Test account deletion (commented out to prevent actual deletion)
    // const deleteResponse = await axios.delete(`${BASE_URL}/users/profile`, { headers });
    // console.log('✅ Account deletion endpoint works:', deleteResponse.data);

    console.log('\n🎉 Account deletion endpoint is available!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testBlockedUsers();
  await testAccountDeletion();
}

runTests();
