import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const testMessageNotifications = async () => {
  try {
    console.log('🧪 Testing Message Notification System...\n');

    // Get some test users
    const users = await User.find().limit(3);
    if (users.length < 2) {
      console.log('❌ Need at least 2 users to test message notifications');
      return;
    }

    const [user1, user2] = users;
    console.log(`👤 User 1: ${user1.name} (${user1._id})`);
    console.log(`👤 User 2: ${user2.name} (${user2._id})\n`);

    // Create or get a personal chat between users
    let chat = await Chat.findOne({
      type: 'personal',
      participants: { $all: [user1._id, user2._id] }
    });

    if (!chat) {
      chat = new Chat({
        type: 'personal',
        participants: [user1._id, user2._id],
        name: `Chat between ${user1.name} and ${user2.name}`
      });
      await chat.save();
      console.log('✅ Created new personal chat');
    } else {
      console.log('✅ Found existing personal chat');
    }

    // Create a test message from user1 to user2
    const testMessage = new Message({
      chatId: chat._id,
      sender: user1._id,
      text: 'Hello! This is a test message for notification testing.',
      type: 'text',
      status: 'sent'
    });
    await testMessage.save();
    console.log('✅ Created test message');

    // Check if notification was created for user2
    const notification = await Notification.findOne({
      user: user2._id,
      type: 'message',
      'data.chatId': chat._id
    });

    if (notification) {
      console.log('✅ Notification created successfully!');
      console.log(`📧 Title: ${notification.title}`);
      console.log(`📝 Message: ${notification.message}`);
      console.log(`📅 Created: ${notification.createdAt}`);
    } else {
      console.log('❌ No notification found for user2');
    }

    // Check unread message count for user2
    const userChats = await Chat.find({
      participants: user2._id
    }).select('_id');

    const chatIds = userChats.map(chat => chat._id);
    const unreadCount = await Message.countDocuments({
      chatId: { $in: chatIds },
      sender: { $ne: user2._id },
      status: { $ne: 'read' }
    });

    console.log(`📊 Unread message count for ${user2.name}: ${unreadCount}`);

    // Clean up test data
    await Message.findByIdAndDelete(testMessage._id);
    await Notification.findOneAndDelete({
      user: user2._id,
      type: 'message',
      'data.chatId': chat._id
    });
    console.log('🧹 Cleaned up test data');

    console.log('\n✅ Message notification test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testMessageNotifications();
