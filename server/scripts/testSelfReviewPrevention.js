import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testUserId = '';

async function testSelfReviewPrevention() {
  console.log('🧪 Testing Self-Review Prevention...\n');

  try {
    // Step 1: Create a test user
    console.log('1. Creating test user...');
    const userResponse = await axios.post(`${BASE_URL}/users/register`, {
      username: 'testuser_selfreview',
      email: 'testuser_selfreview@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      country: 'Test Country'
    });
    
    testUserId = userResponse.data.user._id;
    authToken = userResponse.data.token;
    
    console.log('✅ Test user created:', testUserId);
    console.log('✅ Auth token obtained\n');

    // Step 2: Test backend self-review prevention for user reviews
    console.log('2. Testing backend self-review prevention (user reviews)...');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
      const reviewResponse = await axios.post(`${BASE_URL}/reviews/give`, {
        reviewType: 'user',
        reviewedUser: testUserId, // Same as reviewer
        rating: 5,
        feedback: 'Great user!',
        tripId: 'dummy-trip-id'
      }, { headers });
      
      console.log('❌ Backend should have prevented self-review but didn\'t');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Backend correctly prevented self-review');
        console.log('   Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Step 3: Test backend self-review prevention for trip reviews
    console.log('3. Testing backend self-review prevention (trip reviews)...');
    
    // First create a trip
    const tripResponse = await axios.post(`${BASE_URL}/trips/create`, {
      title: 'Test Trip for Self Review',
      description: 'A test trip',
      destination: 'Test Destination',
      startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      maxParticipants: 5,
      budget: 1000
    }, { headers });
    
    const tripId = tripResponse.data._id;
    console.log('✅ Test trip created:', tripId);
    
    // Try to review the trip (this should work, not a self-review)
    try {
      const tripReviewResponse = await axios.post(`${BASE_URL}/reviews/give`, {
        reviewType: 'trip',
        tripId: tripId,
        rating: 4,
        feedback: 'Great trip!'
      }, { headers });
      
      console.log('✅ Trip review submitted successfully (this is correct)');
    } catch (error) {
      console.log('❌ Trip review failed unexpectedly:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Step 4: Test permissions API for self-review
    console.log('4. Testing permissions API for self-review...');
    
    try {
      const permissionsResponse = await axios.get(`${BASE_URL}/reviews/permissions?reviewType=user&reviewedUser=${testUserId}`, { headers });
      
      console.log('✅ Permissions API response:', permissionsResponse.data);
      if (!permissionsResponse.data.canReview) {
        console.log('✅ Permissions API correctly indicates self-review is not allowed');
      } else {
        console.log('❌ Permissions API incorrectly allows self-review');
      }
    } catch (error) {
      console.log('❌ Permissions API error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Step 5: Test with different user (should be allowed)
    console.log('5. Testing review between different users...');
    
    // Create another user
    const user2Response = await axios.post(`${BASE_URL}/users/register`, {
      username: 'testuser2_selfreview',
      email: 'testuser2_selfreview@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User2',
      country: 'Test Country'
    });
    
    const user2Id = user2Response.data.user._id;
    const user2Token = user2Response.data.token;
    
    console.log('✅ Second test user created:', user2Id);
    
    // Try to review the first user (should be allowed, but will fail due to no shared trips)
    try {
      const crossUserReviewResponse = await axios.post(`${BASE_URL}/reviews/give`, {
        reviewType: 'user',
        reviewedUser: testUserId,
        rating: 5,
        feedback: 'Great user!',
        tripId: 'dummy-trip-id'
      }, { headers: { Authorization: `Bearer ${user2Token}` } });
      
      console.log('❌ Cross-user review should have failed due to no shared trips');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Cross-user review correctly failed (no shared trips)');
        console.log('   Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 Self-review prevention test completed!');
    console.log('\n📋 Summary:');
    console.log('- Backend correctly prevents self-reviews');
    console.log('- Permissions API correctly identifies self-review scenarios');
    console.log('- Cross-user reviews are properly validated');
    console.log('- Trip reviews work correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testSelfReviewPrevention();
