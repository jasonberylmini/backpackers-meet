import mongoose from 'mongoose';
import Trip from '../models/Trip.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/backpacker';

async function checkTripStatus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const trips = await Trip.find({}).select('destination startDate endDate status');
    
    console.log(`Found ${trips.length} trips in database:`);
    
    trips.forEach(trip => {
      console.log(`- ${trip.destination}: ${trip.startDate} to ${trip.endDate} (Status: ${trip.status})`);
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`\nToday's date: ${today}`);
    
    const expiredTrips = trips.filter(trip => trip.endDate < today && trip.status === 'active');
    console.log(`\nExpired trips that should be marked as completed: ${expiredTrips.length}`);
    
    expiredTrips.forEach(trip => {
      console.log(`- ${trip.destination}: ${trip.endDate} (Status: ${trip.status})`);
    });

  } catch (error) {
    console.error('Error checking trip status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkTripStatus()
  .then(() => {
    console.log('Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });
