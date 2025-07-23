import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import dotenv from 'dotenv';
dotenv.config();

async function fixTrips() {
  await mongoose.connect(process.env.MONGODB_URI);
  const trips = await Trip.find();
  let fixed = 0;
  for (const trip of trips) {
    if (!Array.isArray(trip.members)) {
      trip.members = [];
    }
    if (!trip.members.map(id => id.toString()).includes(trip.creator.toString())) {
      trip.members.push(trip.creator);
      try {
        await trip.save();
        console.log(`Fixed trip ${trip._id}`);
        fixed++;
      } catch (err) {
        console.error(`Failed to save trip ${trip._id}:`, err);
      }
    }
  }
  console.log(`Done! Fixed ${fixed} trips.`);
  process.exit(0);
}

fixTrips(); 