import mongoose from 'mongoose';
import User from '../models/User.js';
import Review from '../models/Review.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fixFriendsCount() {
  try {
    console.log('🔍 Checking Friends Count Issue...\n');

    // Get all users
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    // Check which users have friends array
    let usersWithFriends = 0;
    let usersWithoutFriends = 0;
    
    for (const user of users) {
      if (user.friends && Array.isArray(user.friends)) {
        usersWithFriends++;
        console.log(`${user.name}: ${user.friends.length} friends`);
      } else {
        usersWithoutFriends++;
        console.log(`${user.name}: No friends array`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Users with friends array: ${usersWithFriends}`);
    console.log(`- Users without friends array: ${usersWithoutFriends}`);

    // Check for user reviews
    const userReviews = await Review.find({ 
      reviewType: 'user', 
      status: 'approved' 
    }).populate('reviewer', 'name').populate('reviewedUser', 'name');
    
    console.log(`\n📝 Found ${userReviews.length} approved user reviews`);
    
    if (userReviews.length > 0) {
      console.log('\nUser Reviews:');
      userReviews.forEach(review => {
        console.log(`- ${review.reviewer.name} reviewed ${review.reviewedUser.name}`);
      });
    }

    // Fix users without friends array
    if (usersWithoutFriends > 0) {
      console.log('\n🔧 Fixing users without friends array...');
      
      for (const user of users) {
        if (!user.friends || !Array.isArray(user.friends)) {
          await User.findByIdAndUpdate(user._id, {
            $set: { friends: [] }
          });
          console.log(`✅ Fixed ${user.name}`);
        }
      }
    }

    // Re-process user reviews to add friends
    if (userReviews.length > 0) {
      console.log('\n🔄 Re-processing user reviews to add friends...');
      
      for (const review of userReviews) {
        try {
          // Add reviewedUser to reviewer's friends list
          await User.findByIdAndUpdate(review.reviewer._id, {
            $addToSet: { friends: review.reviewedUser._id }
          });
          
          // Add reviewer to reviewedUser's friends list
          await User.findByIdAndUpdate(review.reviewedUser._id, {
            $addToSet: { friends: review.reviewer._id }
          });
          
          console.log(`✅ Added friendship between ${review.reviewer.name} and ${review.reviewedUser.name}`);
        } catch (error) {
          console.error(`❌ Error adding friendship: ${error.message}`);
        }
      }
    }

    // Final check
    console.log('\n📊 Final Friends Count:');
    const updatedUsers = await User.find();
    for (const user of updatedUsers) {
      const friendCount = user.friends && Array.isArray(user.friends) ? user.friends.length : 0;
      console.log(`${user.name}: ${friendCount} friends`);
    }

    console.log('\n🎉 Friends count fix completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixFriendsCount(); 