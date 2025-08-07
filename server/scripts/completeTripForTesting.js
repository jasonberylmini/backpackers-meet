import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function completeTripForTesting() {
  console.log('🔧 Completing Trip for Review Testing...\n');

  try {
    // Step 1: Login to get auth token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'sarah@expense-test.com', // Using the creator from the console data
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Get user's trips to find the Tokyo Explorer trip
    console.log('2. Fetching user trips...');
    const headers = { Authorization: `Bearer ${authToken}` };
    
    const tripsResponse = await axios.get(`${BASE_URL}/trips/mine`, { headers });
    const trips = tripsResponse.data;
    
    // Find the Tokyo Explorer trip
    const tokyoTrip = trips.find(trip => 
      trip.destination === 'Tokyo Explorer' || 
      trip.title === 'Tokyo Explorer'
    );
    
    if (!tokyoTrip) {
      console.log('❌ Tokyo Explorer trip not found in user trips');
      console.log('Available trips:', trips.map(t => ({ id: t._id, title: t.title || t.destination, status: t.status })));
      return;
    }
    
    console.log('✅ Found Tokyo Explorer trip:', tokyoTrip._id);
    console.log('   Current status:', tokyoTrip.status);
    console.log('   Start date:', tokyoTrip.startDate);
    console.log('   End date:', tokyoTrip.endDate);
    console.log('');

    // Step 3: Update trip status to completed
    console.log('3. Updating trip status to completed...');
    
    const updateResponse = await axios.put(`${BASE_URL}/trips/update/${tokyoTrip._id}`, {
      status: 'completed'
    }, { headers });
    
    console.log('✅ Trip status updated successfully');
    console.log('   New status:', updateResponse.data.status);
    console.log('');

    // Step 4: Verify the update
    console.log('4. Verifying trip status...');
    const verifyResponse = await axios.get(`${BASE_URL}/trips/${tokyoTrip._id}`, { headers });
    
    console.log('✅ Trip verification successful');
    console.log('   Final status:', verifyResponse.data.status);
    console.log('   Trip ID:', verifyResponse.data._id);
    console.log('   Destination:', verifyResponse.data.destination);
    console.log('');

    console.log('🎉 Trip completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to the Tokyo Explorer trip page');
    console.log('2. Click on the "Reviews" tab');
    console.log('3. You should now see review options available');
    console.log('4. Test the review functionality');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    console.error('Full error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Try using a different user account or check the login credentials');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on port 3000');
    }
  }
}

// Run the script
completeTripForTesting();
