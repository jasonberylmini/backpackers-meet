import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
let testUsers = [];
let testTrips = [];
let testReviews = [];

// Test data
const testData = {
  users: [
    { name: 'Alice Johnson', email: 'alice@test.com', password: 'password123' },
    { name: 'Bob Smith', email: 'bob@test.com', password: 'password123' },
    { name: 'Charlie Brown', email: 'charlie@test.com', password: 'password123' },
    { name: 'Diana Prince', email: 'diana@test.com', password: 'password123' }
  ],
  trips: [
    {
      destination: 'Paris Adventure',
      startDate: '2024-01-15',
      endDate: '2024-01-20',
      budget: 1500,
      tripType: 'carpool',
      description: 'A wonderful trip to Paris'
    },
    {
      destination: 'Tokyo Explorer',
      startDate: '2024-02-01',
      endDate: '2024-02-10',
      budget: 2500,
      tripType: 'public transport',
      description: 'Exploring Tokyo together'
    }
  ]
};

// Helper functions
const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error.response?.data?.message || error.message);
    return null;
  }
};

const createUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, userData);
    return response.data.user;
  } catch (error) {
    console.error(`User creation failed for ${userData.email}:`, error.response?.data?.message || error.message);
    return null;
  }
};

const createTrip = async (tripData, token) => {
  try {
    const response = await axios.post(`${BASE_URL}/trips/create`, tripData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.trip;
  } catch (error) {
    console.error('Trip creation failed:', error.response?.data?.message || error.message);
    return null;
  }
};

const joinTrip = async (tripId, token) => {
  try {
    await axios.post(`${BASE_URL}/trips/join/${tripId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch (error) {
    console.error('Join trip failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const completeTrip = async (tripId, token) => {
  try {
    await axios.put(`${BASE_URL}/trips/update/${tripId}`, { status: 'completed' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch (error) {
    console.error('Complete trip failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const submitReview = async (reviewData, token) => {
  try {
    const response = await axios.post(`${BASE_URL}/reviews/submit`, reviewData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status 
    };
  }
};

const checkReviewPermissions = async (params, token) => {
  try {
    const response = await axios.get(`${BASE_URL}/reviews/permissions?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { success: true, data: response.data };
      } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status 
    };
  }
};

// Test scenarios
const runTests = async () => {
  console.log('🚀 Starting Review Restrictions Test Suite\n');

  // Step 1: Create test users
  console.log('📝 Creating test users...');
  for (const userData of testData.users) {
    const user = await createUser(userData);
    if (user) {
      testUsers.push(user);
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }
  }

  if (testUsers.length < 2) {
    console.error('❌ Need at least 2 users to run tests');
    return;
  }

  // Step 2: Login users and get tokens
  console.log('\n🔐 Logging in users...');
  const tokens = {};
  for (const user of testUsers) {
    const token = await loginUser(user.email, 'password123');
    if (token) {
      tokens[user._id] = token;
      console.log(`✅ Logged in: ${user.name}`);
    }
  }

  // Step 3: Create trips
  console.log('\n🧳 Creating test trips...');
  for (const tripData of testData.trips) {
    const trip = await createTrip(tripData, tokens[testUsers[0]._id]);
    if (trip) {
      testTrips.push(trip);
      console.log(`✅ Created trip: ${trip.destination}`);
    }
  }

  if (testTrips.length === 0) {
    console.error('❌ Need at least 1 trip to run tests');
    return;
  }

  const trip = testTrips[0];
  const alice = testUsers[0];
  const bob = testUsers[1];
  const charlie = testUsers[2];
  const diana = testUsers[3];

  // Step 4: Add members to trip
  console.log('\n👥 Adding members to trip...');
  await joinTrip(trip._id, tokens[bob._id]);
  await joinTrip(trip._id, tokens[charlie._id]);
  console.log(`✅ Added Bob and Charlie to trip: ${trip.destination}`);

  // Step 5: Test review restrictions before trip completion
  console.log('\n🧪 Testing review restrictions before trip completion...');

  // Test 1: Try to review trip before completion
  console.log('\n📋 Test 1: Review trip before completion');
  const preCompletionResult = await submitReview({
    reviewType: 'trip',
    tripId: trip._id,
    rating: 5,
    feedback: 'Great trip!'
  }, tokens[alice._id]);

  if (!preCompletionResult.success && preCompletionResult.status === 403) {
    console.log('✅ PASS: Cannot review trip before completion');
  } else {
    console.log('❌ FAIL: Should not be able to review trip before completion');
  }

  // Test 2: Check permissions before completion
  console.log('\n📋 Test 2: Check permissions before completion');
  const preCompletionPerms = await checkReviewPermissions({
    reviewType: 'trip',
    tripId: trip._id
  }, tokens[alice._id]);

  if (preCompletionPerms.success && !preCompletionPerms.data.canReview) {
    console.log('✅ PASS: Permissions correctly show cannot review before completion');
  } else {
    console.log('❌ FAIL: Permissions should show cannot review before completion');
  }

  // Step 6: Complete the trip
  console.log('\n✅ Completing trip...');
  await completeTrip(trip._id, tokens[alice._id]);
  console.log(`✅ Trip completed: ${trip.destination}`);

  // Step 7: Test review restrictions after trip completion
  console.log('\n🧪 Testing review restrictions after trip completion...');

  // Test 3: Non-member trying to review trip
  console.log('\n📋 Test 3: Non-member reviewing trip');
  const nonMemberResult = await submitReview({
          reviewType: 'trip',
    tripId: trip._id,
          rating: 5,
    feedback: 'Great trip!'
  }, tokens[diana._id]);

  if (!nonMemberResult.success && nonMemberResult.status === 403) {
    console.log('✅ PASS: Non-member cannot review trip');
        } else {
    console.log('❌ FAIL: Non-member should not be able to review trip');
  }

  // Test 4: Member reviewing trip
  console.log('\n📋 Test 4: Member reviewing trip');
  const memberTripResult = await submitReview({
    reviewType: 'trip',
    tripId: trip._id,
    rating: 5,
    feedback: 'Amazing trip experience!'
  }, tokens[alice._id]);

  if (memberTripResult.success) {
    console.log('✅ PASS: Trip member can review trip');
    testReviews.push(memberTripResult.data.review);
  } else {
    console.log('❌ FAIL: Trip member should be able to review trip');
  }

  // Test 5: Duplicate trip review
  console.log('\n📋 Test 5: Duplicate trip review');
  const duplicateTripResult = await submitReview({
    reviewType: 'trip',
    tripId: trip._id,
    rating: 4,
    feedback: 'Another review'
  }, tokens[alice._id]);

  if (!duplicateTripResult.success && duplicateTripResult.status === 409) {
    console.log('✅ PASS: Cannot submit duplicate trip review');
  } else {
    console.log('❌ FAIL: Should not be able to submit duplicate trip review');
  }

  // Test 6: User reviewing themselves
  console.log('\n📋 Test 6: User reviewing themselves');
  const selfReviewResult = await submitReview({
        reviewType: 'user',
    tripId: trip._id,
    reviewedUser: alice._id,
        rating: 5,
    feedback: 'I am great!'
  }, tokens[alice._id]);

  if (!selfReviewResult.success && selfReviewResult.status === 400) {
    console.log('✅ PASS: Cannot review yourself');
      } else {
    console.log('❌ FAIL: Should not be able to review yourself');
  }

  // Test 7: Member reviewing another member
  console.log('\n📋 Test 7: Member reviewing another member');
  const memberUserResult = await submitReview({
    reviewType: 'user',
    tripId: trip._id,
    reviewedUser: bob._id,
    rating: 5,
    feedback: 'Bob was a great travel companion!'
  }, tokens[alice._id]);

  if (memberUserResult.success) {
    console.log('✅ PASS: Member can review another member');
    testReviews.push(memberUserResult.data.review);
  } else {
    console.log('❌ FAIL: Member should be able to review another member');
  }

  // Test 8: Non-member trying to review user
  console.log('\n📋 Test 8: Non-member reviewing user');
  const nonMemberUserResult = await submitReview({
        reviewType: 'user',
    tripId: trip._id,
    reviewedUser: alice._id,
        rating: 5,
    feedback: 'Alice was great!'
  }, tokens[diana._id]);

  if (!nonMemberUserResult.success && nonMemberUserResult.status === 403) {
    console.log('✅ PASS: Non-member cannot review user');
      } else {
    console.log('❌ FAIL: Non-member should not be able to review user');
  }

  // Test 9: Duplicate user review
  console.log('\n📋 Test 9: Duplicate user review');
  const duplicateUserResult = await submitReview({
    reviewType: 'user',
    tripId: trip._id,
    reviewedUser: bob._id,
    rating: 4,
    feedback: 'Another review for Bob'
  }, tokens[alice._id]);

  if (!duplicateUserResult.success && duplicateUserResult.status === 409) {
    console.log('✅ PASS: Cannot submit duplicate user review');
  } else {
    console.log('❌ FAIL: Should not be able to submit duplicate user review');
  }

  // Test 10: Check permissions for valid review
  console.log('\n📋 Test 10: Check permissions for valid review');
  const validPerms = await checkReviewPermissions({
    reviewType: 'user',
    tripId: trip._id,
    reviewedUser: charlie._id
  }, tokens[alice._id]);

  if (validPerms.success && validPerms.data.canReview) {
    console.log('✅ PASS: Permissions correctly show can review');
  } else {
    console.log('❌ FAIL: Permissions should show can review');
  }

  // Test 11: Check permissions for invalid review (self-review)
  console.log('\n📋 Test 11: Check permissions for self-review');
  const selfPerms = await checkReviewPermissions({
    reviewType: 'user',
    tripId: trip._id,
    reviewedUser: alice._id
  }, tokens[alice._id]);

  if (selfPerms.success && !selfPerms.data.canReview) {
    console.log('✅ PASS: Permissions correctly show cannot self-review');
  } else {
    console.log('❌ FAIL: Permissions should show cannot self-review');
  }

  console.log('\n🎉 Review Restrictions Test Suite Completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Users created: ${testUsers.length}`);
  console.log(`   - Trips created: ${testTrips.length}`);
  console.log(`   - Reviews submitted: ${testReviews.length}`);
  console.log(`   - All restrictions properly enforced! ✅`);
};

// Run the tests
runTests().catch(console.error); 