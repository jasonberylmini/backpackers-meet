import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'http://localhost:5000/api';

async function testReportsAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Login as admin
    console.log('\n🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'admin@backpacker.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Admin login successful');

    // Test Flag Reports
    console.log('\n🚩 Testing Flag Reports...');
    
    // Get flag stats
    const flagStatsResponse = await axios.get(`${API_BASE_URL}/admin/flag-stats`, { headers });
    console.log('✅ Flag Stats:', flagStatsResponse.data);
    
    // Get all flags
    const flagsResponse = await axios.get(`${API_BASE_URL}/admin/flags`, { headers });
    console.log('✅ Flags found:', flagsResponse.data.flags.length);
    console.log('✅ Sample flag:', flagsResponse.data.flags[0] ? {
      type: flagsResponse.data.flags[0].flagType,
      reason: flagsResponse.data.flags[0].reason,
      targetName: flagsResponse.data.flags[0].targetId?.name || 'Unknown',
      reporterName: flagsResponse.data.flags[0].flaggedBy?.name || 'Unknown'
    } : 'No flags found');

    // Test Trip Reports
    console.log('\n🧳 Testing Trip Reports...');
    
    // Get trip stats
    const tripStatsResponse = await axios.get(`${API_BASE_URL}/admin/trip-stats`, { headers });
    console.log('✅ Trip Stats:', tripStatsResponse.data);
    
    // Get reported trips
    const tripsResponse = await axios.get(`${API_BASE_URL}/admin/reported-trips`, { headers });
    console.log('✅ Reported Trips found:', tripsResponse.data.trips.length);
    console.log('✅ Sample trip:', tripsResponse.data.trips[0] ? {
      destination: tripsResponse.data.trips[0].destination,
      creatorName: tripsResponse.data.trips[0].creator?.name || 'Unknown',
      status: tripsResponse.data.trips[0].status
    } : 'No trips found');

    // Test User Reports
    console.log('\n👤 Testing User Reports...');
    
    // Get user stats
    const userStatsResponse = await axios.get(`${API_BASE_URL}/admin/user-stats`, { headers });
    console.log('✅ User Stats:', userStatsResponse.data);
    
    // Get reported users
    const usersResponse = await axios.get(`${API_BASE_URL}/admin/reported-users`, { headers });
    console.log('✅ Reported Users found:', usersResponse.data.users.length);
    console.log('✅ Sample user:', usersResponse.data.users[0] ? {
      name: usersResponse.data.users[0].name,
      email: usersResponse.data.users[0].email,
      status: usersResponse.data.users[0].status
    } : 'No users found');

    // Test with filters
    console.log('\n🔍 Testing with filters...');
    
    // Test flag filters
    const filteredFlagsResponse = await axios.get(`${API_BASE_URL}/admin/flags?status=pending&severity=high`, { headers });
    console.log('✅ High priority pending flags:', filteredFlagsResponse.data.flags.length);
    
    // Test search
    const searchFlagsResponse = await axios.get(`${API_BASE_URL}/admin/flags?search=inappropriate`, { headers });
    console.log('✅ Flags with "inappropriate" in reason:', searchFlagsResponse.data.flags.length);

    console.log('\n🎉 All reports API tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Flag Reports: ${flagsResponse.data.flags.length} flags found`);
    console.log(`- Trip Reports: ${tripsResponse.data.trips.length} trips found`);
    console.log(`- User Reports: ${usersResponse.data.users.length} users found`);

  } catch (error) {
    console.error('❌ Error testing reports API:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testReportsAPI();
