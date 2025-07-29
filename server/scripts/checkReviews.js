import mongoose from 'mongoose';
import Review from '../models/Review.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkReviews() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const reviews = await Review.find()
      .populate('reviewer', 'name email')
      .populate('reviewedUser', 'name email')
      .populate('tripId', 'destination');
    
    console.log(`\n📊 Review Statistics:`);
    console.log(`Total reviews: ${reviews.length}`);
    
    if (reviews.length === 0) {
      console.log('\n❌ No reviews found in database!');
      console.log('This is why you see "No reviews found" in the admin panel.');
      console.log('\nTo test the review moderation, you need to:');
      console.log('1. Create some users');
      console.log('2. Create some trips');
      console.log('3. Have users submit reviews');
      console.log('4. Then the reviews will appear in the admin panel');
    } else {
      console.log('\n✅ Reviews found:');
      reviews.forEach((review, index) => {
        console.log(`${index + 1}. ${review.reviewer?.name || 'Unknown'} → ${review.targetUser?.name || review.targetTrip?.destination || 'Unknown'} (${review.rating}★) - Status: ${review.status} - Flagged: ${review.flagged}`);
      });
    }
    
    // Check status distribution
    const statusCounts = await Review.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📈 Status Distribution:');
    statusCounts.forEach(status => {
      console.log(`- ${status._id || 'No status'}: ${status.count}`);
    });
    
    // Check flagged reviews
    const flaggedCount = await Review.countDocuments({ flagged: true });
    console.log(`\n🚩 Flagged reviews: ${flaggedCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkReviews(); 