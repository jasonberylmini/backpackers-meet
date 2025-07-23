// Migration script to initialize new fields for all major models
// Run with: node server/scripts/migrations/initializeNewFields.js

import mongoose from 'mongoose';
import User from '../../models/User.js';
import Trip from '../../models/Trip.js';
import Review from '../../models/Review.js';
import Flag from '../../models/Flag.js';
import AdminLog from '../../models/AdminLog.js';
import Notification from '../../models/Notification.js';
import Message from '../../models/Message.js';
import Expense from '../../models/Expense.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/backpacker';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  let total = 0;

  // User
  const userRes = await User.updateMany(
    {},
    {
      $setOnInsert: {
        bio: '',
        notificationPrefs: { inApp: true, email: false, sms: false },
        accountStatus: 'active',
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Users updated:', userRes.nModified || userRes.modifiedCount);
  total += userRes.nModified || userRes.modifiedCount;

  // Trip
  const tripRes = await Trip.updateMany(
    {},
    {
      $setOnInsert: {
        status: 'active',
        description: '',
        images: [],
        privacy: 'public',
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Trips updated:', tripRes.nModified || tripRes.modifiedCount);
  total += tripRes.nModified || tripRes.modifiedCount;

  // Review
  const reviewRes = await Review.updateMany(
    {},
    {
      $setOnInsert: {
        status: 'pending',
        adminResponse: '',
        editHistory: [],
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Reviews updated:', reviewRes.nModified || reviewRes.modifiedCount);
  total += reviewRes.nModified || reviewRes.modifiedCount;

  // Flag
  const flagRes = await Flag.updateMany(
    {},
    {
      $setOnInsert: {
        severity: 'low',
        adminNotes: '',
        actionTaken: '',
        history: [],
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Flags updated:', flagRes.nModified || flagRes.modifiedCount);
  total += flagRes.nModified || flagRes.modifiedCount;

  // AdminLog
  const adminLogRes = await AdminLog.updateMany(
    {},
    {
      $setOnInsert: {
        outcome: '',
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('AdminLogs updated:', adminLogRes.nModified || adminLogRes.modifiedCount);
  total += adminLogRes.nModified || adminLogRes.modifiedCount;

  // Notification
  const notifRes = await Notification.updateMany(
    {},
    {
      $setOnInsert: {
        deliveryMethod: 'in-app',
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Notifications updated:', notifRes.nModified || notifRes.modifiedCount);
  total += notifRes.nModified || notifRes.modifiedCount;

  // Message
  const msgRes = await Message.updateMany(
    {},
    {
      $setOnInsert: {
        status: 'sent',
        attachments: [],
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Messages updated:', msgRes.nModified || msgRes.modifiedCount);
  total += msgRes.nModified || msgRes.modifiedCount;

  // Expense
  const expRes = await Expense.updateMany(
    {},
    {
      $setOnInsert: {
        status: 'pending',
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: false }
  );
  console.log('Expenses updated:', expRes.nModified || expRes.modifiedCount);
  total += expRes.nModified || expRes.modifiedCount;

  console.log('Migration complete. Total documents updated:', total);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 