import mongoose from 'mongoose';
import { generateUniqueUsername } from '../utils/usernameGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

const testUsernameGeneration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Test cases
    const testNames = [
      'John Traveler',
      'Sarah Manager',
      'Mike Supervisor',
      'Jane Explorer',
      'Bob Adventurer',
      'Alice Wanderer',
      'Catty Nomad',
      'David Backpacker',
      'Emma Wilson',
      'Tom Johnson'
    ];

    console.log('Testing username generation...\n');

    for (const name of testNames) {
      try {
        const username = await generateUniqueUsername(name);
        console.log(`Name: "${name}" -> Username: "${username}"`);
      } catch (error) {
        console.error(`Failed to generate username for "${name}":`, error.message);
      }
    }

    console.log('\nUsername generation test completed!');
  } catch (error) {
    console.error('Error testing username generation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the test
testUsernameGeneration(); 