import mongoose from 'mongoose';
import Trip from '../models/Trip.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/backpacker';

async function fixTripStatus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`Today's date: ${today}`);

    // Find all trips marked as completed
    const completedTrips = await Trip.find({ status: 'completed' });
    console.log(`Found ${completedTrips.length} trips marked as completed`);

    let fixedCount = 0;

    for (const trip of completedTrips) {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      
      // Check if the trip should actually be completed based on dates
      if (endDate > now) {
        // Trip end date is in the future, so it shouldn't be marked as completed
        console.log(`Fixing trip: ${trip.destination} (${trip.startDate} to ${trip.endDate})`);
        console.log(`  - Current status: ${trip.status}`);
        console.log(`  - End date: ${endDate.toISOString().split('T')[0]}`);
        console.log(`  - Today: ${today}`);
        
        // Determine correct status based on dates
        let correctStatus = 'active';
        if (now < startDate) {
          correctStatus = 'upcoming';
        } else if (now >= startDate && now <= endDate) {
          correctStatus = 'active';
        } else {
          correctStatus = 'completed';
        }
        
        if (correctStatus !== trip.status) {
          trip.status = correctStatus;
          if (correctStatus !== 'completed') {
            trip.moderation.completedAt = undefined;
          }
          await trip.save();
          console.log(`  - Fixed status to: ${correctStatus}`);
          fixedCount++;
        }
      } else {
        console.log(`Trip ${trip.destination} is correctly marked as completed (end date: ${trip.endDate})`);
      }
    }

    console.log(`\nFixed ${fixedCount} trips with incorrect status`);
    console.log('Trip status fix completed');

  } catch (error) {
    console.error('Error fixing trip status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixTripStatus()
  .then(() => {
    console.log('Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
