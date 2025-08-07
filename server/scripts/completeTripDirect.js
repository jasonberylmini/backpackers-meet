import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Trip model
import Trip from '../models/Trip.js';

async function completeTripDirect() {
  console.log('🔧 Completing Trip Directly in Database...\n');

  try {
    // Find the Tokyo Explorer trip
    const trip = await Trip.findOne({
      destination: 'Tokyo Explorer'
    });

    if (!trip) {
      console.log('❌ Tokyo Explorer trip not found');
      
      // List all trips to help identify
      const allTrips = await Trip.find({}).select('destination title status startDate endDate');
      console.log('Available trips:');
      allTrips.forEach((t, i) => {
        console.log(`${i + 1}. ${t.destination || t.title} - Status: ${t.status} (${t.startDate} to ${t.endDate})`);
      });
      return;
    }

    console.log('✅ Found Tokyo Explorer trip:');
    console.log('   ID:', trip._id);
    console.log('   Current status:', trip.status);
    console.log('   Start date:', trip.startDate);
    console.log('   End date:', trip.endDate);
    console.log('');

    // Update the trip status
    trip.status = 'completed';
    await trip.save();

    console.log('✅ Trip status updated successfully!');
    console.log('   New status:', trip.status);
    console.log('');

    console.log('🎉 Trip completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to the Tokyo Explorer trip page');
    console.log('2. Click on the "Reviews" tab');
    console.log('3. You should now see review options available');
    console.log('4. Test the review functionality');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
completeTripDirect();
