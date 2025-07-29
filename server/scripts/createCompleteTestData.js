import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Import all models
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Review from '../models/Review.js';
import Flag from '../models/Flag.js';
import AdminLog from '../models/AdminLog.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Expense from '../models/Expense.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const createCompleteTestData = async () => {
  try {
    console.log('🚀 Creating comprehensive test data for all schemas...');

    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...');
    await User.deleteMany({ email: { $regex: /@example\.com$/ } });
    await Trip.deleteMany({ destination: { $in: ['Paris', 'Tokyo', 'New York', 'London', 'Sydney', 'Rome', 'Barcelona', 'Amsterdam', 'Berlin', 'Prague'] } });
    await Review.deleteMany({});
    await Flag.deleteMany({});
    await AdminLog.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await Expense.deleteMany({});

    console.log('✅ Cleanup completed');

    // ===== CREATE USERS =====
    console.log('👥 Creating users...');
    
    // Admin users
    const adminUsers = [];
    const adminData = [
      { name: 'Jason Admin', email: 'jason@example.com', role: 'admin' },
      { name: 'Sarah Manager', email: 'sarah@example.com', role: 'admin' },
      { name: 'Mike Supervisor', email: 'mike@example.com', role: 'admin' }
    ];

    for (const admin of adminData) {
      const user = await User.create({
        ...admin,
        passwordHash: await bcrypt.hash('password123', 10),
        verificationStatus: 'verified',
        status: 'active',
        phone: '+1-555-010' + Math.floor(Math.random() * 10),
        location: ['New York', 'Los Angeles', 'Chicago'][Math.floor(Math.random() * 3)],
        bio: `Experienced ${admin.role} with passion for travel management`,
        profilePicture: `https://i.pravatar.cc/150?u=${admin.email}`,
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
        gender: ['male', 'female', 'other'][Math.floor(Math.random() * 3)],
        preferences: JSON.stringify({
          interests: ['adventure', 'culture', 'food', 'nature'],
          budget: 1000 + Math.floor(Math.random() * 4000),
          travelStyle: ['budget', 'luxury', 'backpacker', 'family'][Math.floor(Math.random() * 4)]
        })
      });
      adminUsers.push(user);
    }

    // Regular users
    const regularUsers = [];
    const userData = [
      { name: 'John Traveler', email: 'john@example.com' },
      { name: 'Jane Explorer', email: 'jane@example.com' },
      { name: 'Bob Adventurer', email: 'bob@example.com' },
      { name: 'Alice Wanderer', email: 'alice@example.com' },
      { name: 'Catty Nomad', email: 'catty@example.com' },
      { name: 'David Backpacker', email: 'david@example.com' },
      { name: 'Emma Tourist', email: 'emma@example.com' },
      { name: 'Frank Globetrotter', email: 'frank@example.com' },
      { name: 'Grace Voyager', email: 'grace@example.com' },
      { name: 'Henry Explorer', email: 'henry@example.com' }
    ];

    for (const user of userData) {
      const newUser = await User.create({
        ...user,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'traveler',
        verificationStatus: Math.random() > 0.3 ? 'verified' : 'pending',
        status: Math.random() > 0.1 ? 'active' : 'banned',
        phone: '+1-555-020' + Math.floor(Math.random() * 10),
        location: ['Paris', 'Tokyo', 'London', 'Sydney', 'Berlin', 'Rome', 'Barcelona', 'Amsterdam', 'Prague', 'Vienna'][Math.floor(Math.random() * 10)],
        bio: `Passionate traveler from ${user.name.split(' ')[1]}`,
        profilePicture: `https://i.pravatar.cc/150?u=${user.email}`,
        dateOfBirth: new Date(1990 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
        gender: ['male', 'female', 'other'][Math.floor(Math.random() * 3)],
        preferences: JSON.stringify({
          interests: ['adventure', 'culture', 'food', 'nature', 'history', 'art'],
          budget: 500 + Math.floor(Math.random() * 3000),
          travelStyle: ['budget', 'luxury', 'backpacker', 'family'][Math.floor(Math.random() * 4)]
        })
      });
      regularUsers.push(newUser);
    }

    console.log(`✅ Created ${adminUsers.length} admin users and ${regularUsers.length} regular users`);

    // ===== CREATE TRIPS =====
    console.log('✈️ Creating trips...');
    
    const trips = [];
    const tripData = [
      { destination: 'Paris', description: 'Romantic getaway in the City of Light', tripType: 'romantic', budget: 2500 },
      { destination: 'Tokyo', description: 'Cultural immersion in Japan', tripType: 'cultural', budget: 3000 },
      { destination: 'New York', description: 'Urban adventure in the Big Apple', tripType: 'adventure', budget: 2000 },
      { destination: 'London', description: 'Historical exploration of British capital', tripType: 'cultural', budget: 2800 },
      { destination: 'Sydney', description: 'Beach and city life in Australia', tripType: 'relaxation', budget: 3500 },
      { destination: 'Rome', description: 'Ancient history and Italian cuisine', tripType: 'cultural', budget: 2200 },
      { destination: 'Barcelona', description: 'Art and architecture in Catalonia', tripType: 'cultural', budget: 1800 },
      { destination: 'Amsterdam', description: 'Canal tours and Dutch culture', tripType: 'relaxation', budget: 1600 },
      { destination: 'Berlin', description: 'Modern history and vibrant nightlife', tripType: 'adventure', budget: 1400 },
      { destination: 'Prague', description: 'Medieval charm and Czech beer', tripType: 'cultural', budget: 1200 }
    ];

    for (let i = 0; i < tripData.length; i++) {
      const trip = await Trip.create({
        ...tripData[i],
        creator: regularUsers[i % regularUsers.length]._id,
        startDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: ['active', 'completed', 'cancelled', 'suspended'][Math.floor(Math.random() * 4)],
        maxMembers: 5 + Math.floor(Math.random() * 10),
        currentMembers: Math.floor(Math.random() * 5),
        tags: ['sightseeing', 'food', 'culture', 'adventure'].slice(0, 2 + Math.floor(Math.random() * 3)),
        images: [`https://picsum.photos/400/300?random=${i}`],
        requirements: ['Passport', 'Visa', 'Travel insurance'],
        itinerary: [
          { day: 1, activities: ['Arrival', 'Hotel check-in', 'Welcome dinner'] },
          { day: 2, activities: ['City tour', 'Museum visit', 'Local cuisine'] },
          { day: 3, activities: ['Shopping', 'Sightseeing', 'Farewell party'] }
        ]
      });
      trips.push(trip);
    }

    console.log(`✅ Created ${trips.length} trips`);

    // ===== CREATE REVIEWS =====
    console.log('⭐ Creating reviews...');
    
    const reviews = [];
    const reviewData = [
      { rating: 5, feedback: 'Amazing experience! Highly recommended for everyone.' },
      { rating: 4, feedback: 'Great trip with wonderful people. Would do it again!' },
      { rating: 3, feedback: 'Good experience overall, but some issues with accommodation.' },
      { rating: 5, feedback: 'Perfect trip! Everything was well organized.' },
      { rating: 2, feedback: 'Disappointing experience. Not worth the money.' },
      { rating: 4, feedback: 'Enjoyable trip with good company and beautiful destinations.' },
      { rating: 5, feedback: 'Exceptional service and unforgettable memories!' },
      { rating: 3, feedback: 'Average trip, could be better organized.' },
      { rating: 4, feedback: 'Nice experience, met some great people.' },
      { rating: 5, feedback: 'Outstanding trip! Exceeded all expectations.' }
    ];

    // Create unique review combinations using a systematic approach
    let reviewIndex = 0;
    const usedCombinations = new Set();
    
    // Create trip reviews with unique combinations
    for (let userIndex = 0; userIndex < regularUsers.length && reviewIndex < 15; userIndex++) {
      for (let tripIndex = 0; tripIndex < trips.length && reviewIndex < 15; tripIndex++) {
        const reviewer = regularUsers[userIndex]._id;
        const tripId = trips[tripIndex]._id;
        const combination = `trip_${reviewer}_${tripId}`;
        
        if (!usedCombinations.has(combination)) {
          usedCombinations.add(combination);
          
          const review = await Review.create({
            reviewer,
            reviewType: 'trip',
            tripId,
            reviewedUser: null,
            rating: reviewData[reviewIndex % reviewData.length].rating,
            feedback: reviewData[reviewIndex % reviewData.length].feedback,
            status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
            flagged: Math.random() > 0.8,
            tags: ['friendly', 'organized', 'fun', 'professional'].slice(0, Math.floor(Math.random() * 3) + 1)
          });
          reviews.push(review);
          reviewIndex++;
        }
      }
    }
    
    // Create user reviews with unique combinations
    for (let reviewerIndex = 0; reviewerIndex < regularUsers.length && reviewIndex < 30; reviewerIndex++) {
      for (let reviewedIndex = 0; reviewedIndex < regularUsers.length && reviewIndex < 30; reviewedIndex++) {
        if (reviewerIndex === reviewedIndex) continue; // Skip self-reviews
        
        const reviewer = regularUsers[reviewerIndex]._id;
        const reviewedUser = regularUsers[reviewedIndex]._id;
        const combination = `user_${reviewer}_${reviewedUser}`;
        
        if (!usedCombinations.has(combination)) {
          usedCombinations.add(combination);
          
          const review = await Review.create({
            reviewer,
            reviewType: 'user',
            tripId: null,
            reviewedUser,
            rating: reviewData[reviewIndex % reviewData.length].rating,
            feedback: reviewData[reviewIndex % reviewData.length].feedback,
            status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
            flagged: Math.random() > 0.8,
            tags: ['friendly', 'organized', 'fun', 'professional'].slice(0, Math.floor(Math.random() * 3) + 1)
          });
          reviews.push(review);
          reviewIndex++;
        }
      }
    }

    console.log(`✅ Created ${reviews.length} reviews`);

    // ===== CREATE FLAGS =====
    console.log('🚩 Creating flags...');
    
    const flags = [];
    const flagData = [
      { reason: 'Inappropriate content', severity: 'high' },
      { reason: 'Spam or misleading information', severity: 'medium' },
      { reason: 'Harassment or bullying', severity: 'high' },
      { reason: 'Fake or fraudulent content', severity: 'high' },
      { reason: 'Offensive language', severity: 'medium' },
      { reason: 'Inappropriate behavior', severity: 'medium' },
      { reason: 'Violation of community guidelines', severity: 'high' },
      { reason: 'Misleading information', severity: 'low' },
      { reason: 'Inappropriate images', severity: 'high' },
      { reason: 'Spam content', severity: 'low' }
    ];

    for (let i = 0; i < 25; i++) {
      const flagType = ['user', 'trip', 'review'][Math.floor(Math.random() * 3)];
      let targetId;
      
      if (flagType === 'user') {
        targetId = regularUsers[i % regularUsers.length]._id;
      } else if (flagType === 'trip') {
        targetId = trips[i % trips.length]._id;
      } else {
        targetId = reviews[i % reviews.length]._id;
      }

      const flag = await Flag.create({
        flaggedBy: regularUsers[(i + 1) % regularUsers.length]._id,
        flagType,
        targetId,
        reason: flagData[i % flagData.length].reason,
        severity: flagData[i % flagData.length].severity,
        status: ['open', 'resolved', 'dismissed'][Math.floor(Math.random() * 3)],
        adminNotes: `Additional details about the flag: ${flagData[i % flagData.length].reason}`
      });
      flags.push(flag);
    }

    console.log(`✅ Created ${flags.length} flags`);

    // ===== CREATE ADMIN LOGS =====
    console.log('📝 Creating admin logs...');
    
    const adminLogs = [];
    const logActions = [
      { action: 'banned user', reason: 'Violation of community guidelines' },
      { action: 'unbanned user', reason: 'Manual review cleared' },
      { action: 'verified user', reason: 'KYC documents approved' },
      { action: 'rejected user', reason: 'KYC document invalid' },
      { action: 'warned user', reason: 'First warning for inappropriate behavior' },
      { action: 'approved review', reason: 'Content meets guidelines' },
      { action: 'rejected review', reason: 'Inappropriate content' },
      { action: 'deleted review', reason: 'Spam content removed' },
      { action: 'deleted trip', reason: 'Inappropriate destination' },
      { action: 'suspended trip', reason: 'Under investigation' },
      { action: 'approved trip', reason: 'Trip meets guidelines' },
      { action: 'bulk verified KYC', reason: 'Bulk KYC verified - Manual review' },
      { action: 'resolved flag', reason: 'Flag resolved - action taken' },
      { action: 'dismissed flag', reason: 'Flag dismissed - no violation found' },
      { action: 'escalated flag', reason: 'Flag escalated for further review' }
    ];

    for (let i = 0; i < 50; i++) {
      const logAction = logActions[i % logActions.length];
      const admin = adminUsers[i % adminUsers.length];
      const targetUser = regularUsers[i % regularUsers.length];
      
      const timestamp = new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000));
      
      const log = await AdminLog.create({
        adminId: admin._id,
        action: logAction.action,
        reason: logAction.reason,
        targetUserId: targetUser._id,
        createdAt: timestamp,
        outcome: 'completed'
      });
      
      adminLogs.push(log);
    }

    console.log(`✅ Created ${adminLogs.length} admin logs`);

    // ===== CREATE POSTS =====
    console.log('📰 Creating posts...');
    
    const posts = [];
    const postData = [
      { title: 'Amazing trip to Paris!', content: 'Just returned from an incredible week in Paris. The Eiffel Tower was breathtaking at sunset!' },
      { title: 'Tokyo travel tips', content: 'Here are my top tips for traveling to Tokyo: always carry cash, learn basic Japanese phrases, and get a JR Pass.' },
      { title: 'Budget travel in Europe', content: 'How to travel Europe on a budget: stay in hostels, use budget airlines, and cook your own meals.' },
      { title: 'Solo travel safety', content: 'Important safety tips for solo travelers: always share your itinerary, stay in well-lit areas, and trust your instincts.' },
      { title: 'Best travel photography tips', content: 'Capture amazing travel photos with these tips: wake up early for golden hour, interact with locals, and tell a story.' },
      { title: 'Packing essentials', content: 'My must-have items for every trip: universal adapter, portable charger, travel pillow, and compression socks.' },
      { title: 'Cultural etiquette guide', content: 'Respect local customs: research before you go, dress appropriately, and learn basic greetings.' },
      { title: 'Travel budgeting 101', content: 'How to create and stick to a travel budget: track expenses, set daily limits, and prioritize experiences.' },
      { title: 'Digital nomad lifestyle', content: 'Working while traveling: find coworking spaces, maintain routines, and balance work with exploration.' },
      { title: 'Sustainable travel practices', content: 'Travel responsibly: reduce plastic use, support local businesses, and respect the environment.' }
    ];

    for (let i = 0; i < postData.length; i++) {
      const post = await Post.create({
        ...postData[i],
        author: regularUsers[i % regularUsers.length]._id,
        likes: [regularUsers[Math.floor(Math.random() * regularUsers.length)]._id, regularUsers[(Math.floor(Math.random() * regularUsers.length) + 1) % regularUsers.length]._id],
        country: ['France', 'Japan', 'UK', 'USA', 'Australia'][Math.floor(Math.random() * 5)],
        audience: Math.random() > 0.2 ? 'worldwide' : 'nearby'
      });
      posts.push(post);
    }

    console.log(`✅ Created ${posts.length} posts`);

    // ===== CREATE COMMENTS =====
    console.log('💬 Creating comments...');
    
    const comments = [];
    const commentData = [
      'Great post! Thanks for sharing these tips.',
      'I totally agree with your advice!',
      'This is really helpful information.',
      'I had a similar experience in that city.',
      'Thanks for the recommendations!',
      'I\'ll definitely try this on my next trip.',
      'This is exactly what I needed to know.',
      'Amazing photos! Where was this taken?',
      'I love your travel style!',
      'This brings back so many memories.'
    ];

    for (let i = 0; i < 40; i++) {
      const comment = await Comment.create({
        post: posts[i % posts.length]._id,
        author: regularUsers[i % regularUsers.length]._id,
        content: commentData[i % commentData.length],
        likes: Math.floor(Math.random() * 20)
      });
      comments.push(comment);
    }

    console.log(`✅ Created ${comments.length} comments`);

    // ===== CREATE CHATS =====
    console.log('💬 Creating chats...');
    
    const chats = [];
    for (let i = 0; i < 15; i++) {
      const participants = [
        regularUsers[i % regularUsers.length]._id,
        regularUsers[(i + 1) % regularUsers.length]._id
      ];
      
      const chat = await Chat.create({
        type: 'personal',
        participants,
        tripId: trips[i % trips.length]._id,
        lastMessage: {
          text: 'Hello! How are you?',
          sender: participants[0],
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        },
        isActive: Math.random() > 0.1
      });
      chats.push(chat);
    }

    console.log(`✅ Created ${chats.length} chats`);

    // ===== CREATE MESSAGES =====
    console.log('💬 Creating messages...');
    
    const messages = [];
    const messageData = [
      'Hey! Are you still planning to go on that trip?',
      'Yes, I\'m really excited about it!',
      'What time should we meet at the airport?',
      'I think 2 hours before departure should be good.',
      'Don\'t forget to bring your passport!',
      'Thanks for the reminder!',
      'How\'s the weather looking for our trip?',
      'It should be sunny and warm!',
      'Perfect! I can\'t wait to explore together.',
      'Me too! It\'s going to be amazing!'
    ];

    for (let i = 0; i < 60; i++) {
      const chat = chats[i % chats.length];
      const sender = chat.participants[Math.floor(Math.random() * chat.participants.length)];
      
      const message = await Message.create({
        chatId: chat._id,
        sender,
        text: messageData[i % messageData.length],
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        status: Math.random() > 0.3 ? 'read' : 'sent'
      });
      messages.push(message);
    }

    console.log(`✅ Created ${messages.length} messages`);

    // ===== CREATE NOTIFICATIONS =====
    console.log('🔔 Creating notifications...');
    
    const notifications = [];
    const notificationData = [
      { type: 'info', title: 'Trip Invitation', message: 'You\'ve been invited to join a trip!' },
      { type: 'info', title: 'New Review', message: 'Someone left you a review!' },
      { type: 'info', title: 'New Message', message: 'You have a new message!' },
      { type: 'system', title: 'Trip Update', message: 'Your trip details have been updated!' },
      { type: 'info', title: 'KYC Approved', message: 'Your KYC verification has been approved!' },
      { type: 'warning', title: 'KYC Rejected', message: 'Your KYC verification was rejected.' },
      { type: 'info', title: 'Flag Resolved', message: 'A flag you reported has been resolved!' },
      { type: 'system', title: 'Welcome!', message: 'Welcome to our travel community!' }
    ];

    for (let i = 0; i < 80; i++) {
      const notification = await Notification.create({
        user: regularUsers[i % regularUsers.length]._id,
        type: notificationData[i % notificationData.length].type,
        title: notificationData[i % notificationData.length].title,
        message: notificationData[i % notificationData.length].message,
        read: Math.random() > 0.4,
        relatedTrip: trips[i % trips.length]._id,
        sentBy: adminUsers[Math.floor(Math.random() * adminUsers.length)]._id
      });
      notifications.push(notification);
    }

    console.log(`✅ Created ${notifications.length} notifications`);

    // ===== CREATE EXPENSES =====
    console.log('💰 Creating expenses...');
    
    const expenses = [];
    const expenseData = [
      { category: 'accommodation', description: 'Hotel booking', amount: 150 },
      { category: 'transport', description: 'Flight tickets', amount: 300 },
      { category: 'food', description: 'Restaurant dinner', amount: 45 },
      { category: 'activities', description: 'Museum entrance', amount: 25 },
      { category: 'shopping', description: 'Souvenirs', amount: 80 },
      { category: 'transport', description: 'Taxi ride', amount: 30 },
      { category: 'food', description: 'Street food', amount: 15 },
      { category: 'activities', description: 'City tour', amount: 60 },
      { category: 'accommodation', description: 'Hostel booking', amount: 40 },
      { category: 'transport', description: 'Public transport', amount: 20 }
    ];

    for (let i = 0; i < 50; i++) {
      const expense = await Expense.create({
        ...expenseData[i % expenseData.length],
        groupId: trips[i % trips.length]._id,
        contributorId: regularUsers[i % regularUsers.length]._id,
        splitBetween: [regularUsers[i % regularUsers.length]._id, regularUsers[(i + 1) % regularUsers.length]._id],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        currency: ['USD', 'EUR', 'JPY', 'GBP', 'AUD'][Math.floor(Math.random() * 5)],
        receipt: `https://picsum.photos/200/150?random=${i + 200}`,
        status: ['pending', 'settled', 'disputed'][Math.floor(Math.random() * 3)]
      });
      expenses.push(expense);
    }

    console.log(`✅ Created ${expenses.length} expenses`);

    // ===== FINAL STATISTICS =====
    console.log('\n🎉 Complete test data creation finished!');
    console.log('\n📊 Database Statistics:');
    console.log(`👥 Users: ${adminUsers.length + regularUsers.length} (${adminUsers.length} admins, ${regularUsers.length} travelers)`);
    console.log(`✈️ Trips: ${trips.length}`);
    console.log(`⭐ Reviews: ${reviews.length}`);
    console.log(`🚩 Flags: ${flags.length}`);
    console.log(`📝 Admin Logs: ${adminLogs.length}`);
    console.log(`📰 Posts: ${posts.length}`);
    console.log(`💬 Comments: ${comments.length}`);
    console.log(`💬 Chats: ${chats.length}`);
    console.log(`💬 Messages: ${messages.length}`);
    console.log(`🔔 Notifications: ${notifications.length}`);
    console.log(`💰 Expenses: ${expenses.length}`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('Admin: jason@example.com / password123');
    console.log('User: john@example.com / password123');
    console.log('All users use password: password123');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
createCompleteTestData(); 