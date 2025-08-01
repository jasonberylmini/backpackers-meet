import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const fixImagePaths = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users with profileImage or coverImage
    const users = await User.find({
      $or: [
        { profileImage: { $exists: true, $ne: null, $ne: '' } },
        { coverImage: { $exists: true, $ne: null, $ne: '' } }
      ]
    });

    console.log(`Found ${users.length} users with images to fix`);

    for (const user of users) {
      let updated = false;
      const updates = {};

      // Fix profileImage
      if (user.profileImage && user.profileImage.includes('uploads')) {
        const filename = user.profileImage.split(/[/\\]/).pop();
        updates.profileImage = filename;
        console.log(`Fixing profileImage for ${user.name}: ${user.profileImage} -> ${filename}`);
        updated = true;
      }

      // Fix coverImage
      if (user.coverImage && user.coverImage.includes('uploads')) {
        const filename = user.coverImage.split(/[/\\]/).pop();
        updates.coverImage = filename;
        console.log(`Fixing coverImage for ${user.name}: ${user.coverImage} -> ${filename}`);
        updated = true;
      }

      if (updated) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log(`Updated user: ${user.name}`);
      }
    }

    console.log('Image path fixing completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing image paths:', error);
    process.exit(1);
  }
};

fixImagePaths(); 