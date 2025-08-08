import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trip from '../models/Trip.js';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const testTripImages = async () => {
  try {
    console.log('\n🔍 Checking trips and their images...\n');
    
    // Get all trips
    const trips = await Trip.find({}).select('destination images creator members');
    
    if (trips.length === 0) {
      console.log('❌ No trips found in database');
      return;
    }
    
    console.log(`📊 Found ${trips.length} trips:`);
    
    trips.forEach((trip, index) => {
      console.log(`\n${index + 1}. Trip: ${trip.destination}`);
      console.log(`   ID: ${trip._id}`);
      console.log(`   Images: ${trip.images ? trip.images.length : 0} images`);
      if (trip.images && trip.images.length > 0) {
        console.log(`   First image: ${trip.images[0]}`);
      } else {
        console.log(`   No images found`);
      }
      console.log(`   Creator: ${trip.creator}`);
      console.log(`   Members: ${trip.members.length}`);
    });
    
    // Test with a specific trip
    const firstTrip = trips[0];
    if (firstTrip) {
      console.log(`\n🧪 Testing with first trip: ${firstTrip.destination}`);
      console.log(`   Trip ID: ${firstTrip._id}`);
      console.log(`   Has images: ${firstTrip.images ? 'Yes' : 'No'}`);
      console.log(`   Image count: ${firstTrip.images ? firstTrip.images.length : 0}`);
      if (firstTrip.images && firstTrip.images.length > 0) {
        console.log(`   First image path: ${firstTrip.images[0]}`);
        console.log(`   Full image URL: /uploads/${firstTrip.images[0].split('/').pop()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing trip images:', error);
  }
};

const main = async () => {
  await connectDB();
  await testTripImages();
  await mongoose.disconnect();
  console.log('\n✅ Test completed');
};

main();
