import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function fixKYCStatus() {
  console.log('🔧 Fixing KYC Status for Users');
  console.log('================================');
  
  try {
    // Find users who have 'pending' status but no documents uploaded
    const usersToFix = await User.find({
      verificationStatus: 'pending',
      $or: [
        { idDocument: { $exists: false } },
        { idDocument: null },
        { idSelfie: { $exists: false } },
        { idSelfie: null }
      ]
    });
    
    console.log(`Found ${usersToFix.length} users with pending status but no documents`);
    
    if (usersToFix.length === 0) {
      console.log('✅ No users need fixing');
      return;
    }
    
    // Update these users to have null verificationStatus
    const result = await User.updateMany(
      {
        verificationStatus: 'pending',
        $or: [
          { idDocument: { $exists: false } },
          { idDocument: null },
          { idSelfie: { $exists: false } },
          { idSelfie: null }
        ]
      },
      { verificationStatus: null }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users`);
    
    // Show some examples of fixed users
    const fixedUsers = await User.find({ verificationStatus: null }).limit(5);
    console.log('\n📋 Examples of users with null status:');
    fixedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Status: ${user.verificationStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing KYC status:', error);
  }
}

async function main() {
  await connectDB();
  await fixKYCStatus();
  await mongoose.disconnect();
  console.log('\n✅ Script completed');
}

main().catch(console.error);
