import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trip from '../models/Trip.js';
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

const testChatResponse = async () => {
  try {
    console.log('\n🔍 Testing chat response for trip chats...\n');
    
    // Get a trip with images
    const trip = await Trip.findOne({ images: { $exists: true, $ne: [] } }).select('destination images creator members');
    
    if (!trip) {
      console.log('❌ No trip with images found');
      return;
    }
    
    console.log(`📋 Testing with trip: ${trip.destination}`);
    console.log(`   Trip ID: ${trip._id}`);
    console.log(`   Images: ${trip.images.length} images`);
    console.log(`   First image: ${trip.images[0]}`);
    
    // Find or create chat for this trip
    let chat = await Chat.findOne({ type: 'group', tripId: trip._id })
      .populate('participants', 'username name profileImage');
    
    if (!chat) {
      console.log('   Creating new chat for this trip...');
      chat = new Chat({
        type: 'group',
        tripId: trip._id,
        name: `${trip.destination} Trip Chat`,
        participants: [trip.creator, ...trip.members]
      });
      await chat.save();
      await chat.populate('participants', 'username name profileImage');
    }
    
    console.log(`   Chat ID: ${chat._id}`);
    console.log(`   Chat name: ${chat.name}`);
    
    // Simulate the getTripChat response
    const response = {
      message: 'Trip chat found.',
      chat: {
        _id: chat._id,
        type: chat.type,
        name: chat.name,
        tripId: chat.tripId,
        tripImage: trip.images && trip.images.length > 0 ? trip.images[0] : null,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        unreadCount: 0
      }
    };
    
    console.log('\n📤 Simulated API Response:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n🔍 Key fields:');
    console.log(`   tripImage: ${response.chat.tripImage}`);
    console.log(`   tripImage type: ${typeof response.chat.tripImage}`);
    console.log(`   tripImage truthy: ${!!response.chat.tripImage}`);
    
    // Test the getTripImageUrl logic
    const tripImage = response.chat.tripImage;
    if (tripImage) {
      let finalUrl;
      if (tripImage.startsWith('http://') || tripImage.startsWith('https://')) {
        finalUrl = tripImage;
      } else {
        const filename = tripImage.includes('uploads') ? tripImage.split(/[/\\]/).pop() : tripImage;
        finalUrl = `/uploads/${filename}`;
      }
      console.log(`\n🧪 Frontend URL construction:`);
      console.log(`   Original: ${tripImage}`);
      console.log(`   Final URL: ${finalUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing chat response:', error);
  }
};

const main = async () => {
  await connectDB();
  await testChatResponse();
  await mongoose.disconnect();
  console.log('\n✅ Test completed');
};

main();
