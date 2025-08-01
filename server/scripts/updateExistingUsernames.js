import mongoose from 'mongoose';
import User from '../models/User.js';
import { generateUniqueUsername } from '../utils/usernameGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

const updateExistingUsernames = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users without a username
    const usersWithoutUsername = await User.find({ 
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    });

    console.log(`Found ${usersWithoutUsername.length} users without username`);

    if (usersWithoutUsername.length === 0) {
      console.log('All users already have usernames!');
      return;
    }

    // Update each user with a generated username
    for (const user of usersWithoutUsername) {
      try {
        const username = await generateUniqueUsername(user.name);
        await User.findByIdAndUpdate(user._id, { username });
        console.log(`Updated user ${user.name} (${user.email}) with username: ${username}`);
      } catch (error) {
        console.error(`Failed to update user ${user.name} (${user.email}):`, error.message);
      }
    }

    console.log('Username update process completed!');
  } catch (error) {
    console.error('Error updating usernames:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
updateExistingUsernames(); 