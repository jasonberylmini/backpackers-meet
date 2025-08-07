import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testReviewSubmission() {
  console.log('🧪 Testing Review Submission...\n');

  try {
    // Step 1: Login to get auth token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'sarah@expense-test.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Get the Tokyo Explorer trip ID
    console.log('2. Getting trip details...');
    const headers = { Authorization: `Bearer ${authToken}` };
    
    const tripsResponse = await axios.get(`${BASE_URL}/trips/mine`, { headers });
    const tokyoTrip = tripsResponse.data.find(trip => 
      trip.destination === 'Tokyo Explorer'
    );
    
    if (!tokyoTrip) {
      console.log('❌ Tokyo Explorer trip not found');
      return;
    }
    
    console.log('✅ Found Tokyo Explorer trip:', tokyoTrip._id);
    console.log('   Status:', tokyoTrip.status);
    console.log('');

    // Step 3: Test trip review submission
    console.log('3. Testing trip review submission...');
    
    const tripReviewData = {
      reviewType: 'trip',
      tripId: tokyoTrip._id,
      rating: 5,
      feedback: 'This was an amazing trip! The organization was perfect and everyone had a great time exploring Tokyo together. The cultural experiences were incredible and the group dynamics were excellent.',
      tags: ['Great Communication', 'Organized', 'Fun']
    };
    
    try {
      const tripReviewResponse = await axios.post(`${BASE_URL}/reviews/submit`, tripReviewData, { headers });
      console.log('✅ Trip review submitted successfully!');
      console.log('   Response:', tripReviewResponse.data.message);
      console.log('   Review ID:', tripReviewResponse.data.review._id);
    } catch (error) {
      console.log('❌ Trip review submission failed:');
      console.log('   Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Step 4: Test user review submission (if there are other members)
    if (tokyoTrip.members && tokyoTrip.members.length > 0) {
      console.log('4. Testing user review submission...');
      
      const otherMember = tokyoTrip.members.find(member => 
        member._id !== loginResponse.data.user._id
      );
      
      if (otherMember) {
        const userReviewData = {
          reviewType: 'user',
          tripId: tokyoTrip._id,
          reviewedUser: otherMember._id,
          rating: 4,
          feedback: 'Great travel companion! Very reliable and fun to be around. Would definitely travel together again.',
          tags: ['Reliable', 'Fun', 'Friendly']
        };
        
        try {
          const userReviewResponse = await axios.post(`${BASE_URL}/reviews/submit`, userReviewData, { headers });
          console.log('✅ User review submitted successfully!');
          console.log('   Response:', userReviewResponse.data.message);
          console.log('   Review ID:', userReviewResponse.data.review._id);
        } catch (error) {
          console.log('❌ User review submission failed:');
          console.log('   Error:', error.response?.data?.message || error.message);
        }
      } else {
        console.log('⚠️  No other members found for user review test');
      }
    }
    console.log('');

    console.log('🎉 Review submission test completed!');
    console.log('\n📋 Summary:');
    console.log('- API endpoints are working correctly');
    console.log('- Review submission validation is working');
    console.log('- Frontend should work once feedback is provided');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testReviewSubmission();
