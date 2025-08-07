import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/backpacker';

async function autoCompleteExpiredTrips() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Find trips that are still active but have passed their end date
    // We need to compare the end date with today's date
    const expiredTrips = await Trip.find({
      status: 'active',
      endDate: { $lt: today }
    });

    console.log(`Today's date: ${today}`);
    console.log(`Found ${expiredTrips.length} trips with end date before today`);

    // Log the trips that were found
    expiredTrips.forEach(trip => {
      console.log(`- ${trip.destination}: ${trip.startDate} to ${trip.endDate} (Status: ${trip.status})`);
    });

    if (expiredTrips.length === 0) {
      logger.info('No expired trips found to auto-complete');
      console.log('No expired trips found to auto-complete');
      return;
    }

    logger.info(`Found ${expiredTrips.length} expired trips to auto-complete`);
    console.log(`Found ${expiredTrips.length} expired trips to auto-complete`);

    // Update each expired trip
    const updatePromises = expiredTrips.map(async (trip) => {
      trip.status = 'completed';
      trip.moderation.completedAt = new Date();
      await trip.save();
      
      logger.info(`Auto-completed trip: ${trip.destination} (ID: ${trip._id})`);
      return trip;
    });

    await Promise.all(updatePromises);

    logger.info(`Successfully auto-completed ${expiredTrips.length} trips`);
  } catch (error) {
    logger.error('Error auto-completing trips:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoCompleteExpiredTrips()
    .then(() => {
      logger.info('Auto-complete script finished');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Auto-complete script failed:', error);
      process.exit(1);
    });
}

export default autoCompleteExpiredTrips;
