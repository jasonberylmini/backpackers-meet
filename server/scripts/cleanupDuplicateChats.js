import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const cleanupDuplicateChats = async () => {
  try {
    console.log('\n🧹 Starting duplicate chat cleanup...\n');
    
    // Get all personal chats
    const allChats = await Chat.find({ type: 'personal' })
      .populate('participants', '_id name username');
    
    console.log(`📊 Found ${allChats.length} total personal chats`);
    
    // Group chats by participant pairs
    const chatGroups = new Map();
    
    allChats.forEach(chat => {
      if (chat.participants && chat.participants.length === 2) {
        // Sort participant IDs to create consistent key
        const participantIds = chat.participants.map(p => p._id.toString()).sort();
        const key = participantIds.join('_');
        
        if (!chatGroups.has(key)) {
          chatGroups.set(key, []);
        }
        chatGroups.get(key).push(chat);
      }
    });
    
    console.log(`📋 Found ${chatGroups.size} unique participant pairs`);
    
    let totalRemoved = 0;
    let totalKept = 0;
    
    // Process each group
    for (const [key, chats] of chatGroups) {
      if (chats.length > 1) {
        console.log(`\n🔍 Found ${chats.length} duplicate chats for participants: ${key}`);
        
        // Sort by creation date (keep the oldest one)
        chats.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        const toKeep = chats[0];
        const toRemove = chats.slice(1);
        
        console.log(`   Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
        console.log(`   Removing: ${toRemove.length} duplicates`);
        
        // Remove duplicates
        for (const chat of toRemove) {
          console.log(`   - Removing chat: ${chat._id}`);
          await Chat.findByIdAndDelete(chat._id);
          totalRemoved++;
        }
        
        totalKept++;
      } else {
        totalKept++;
      }
    }
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Kept: ${totalKept} chats`);
    console.log(`   Removed: ${totalRemoved} duplicates`);
    console.log(`   Total: ${totalKept + totalRemoved} chats processed`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

const main = async () => {
  await connectDB();
  await cleanupDuplicateChats();
  await mongoose.disconnect();
  console.log('\n✅ Script completed');
};

main();
