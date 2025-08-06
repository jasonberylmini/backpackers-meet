import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { // The recipient
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: { // e.g., 'trip', 'message', 'expense', 'kyc', 'system', 'admin-message', 'invitation'
    type: String,
    required: true,
    enum: ['trip', 'message', 'expense', 'kyc', 'system', 'admin-message', 'warning', 'info', 'invitation'],
    default: 'info',
  },
  title: { // Short title for the notification
    type: String,
    required: true,
  },
  message: { // Main content/body
    type: String,
    required: true,
  },
  read: { // Has the user seen this notification?
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deliveryMethod: { type: String, enum: ['in-app', 'email', 'sms'], default: 'in-app' },
  expiry: { type: Date },
  batchId: { type: String },
  preferencesSnapshot: { type: Object },
  updatedAt: { type: Date, default: Date.now },
  // Additional data for rich notifications
  data: {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    tripName: String,
    chatId: String,
    amount: Number,
    currency: { type: String, default: 'INR' },
    actionUrl: String,
    imageUrl: String
  },
  // Optionally, link to related objects (e.g., flag, review, trip)
  relatedFlag: { type: mongoose.Schema.Types.ObjectId, ref: 'Flag' },
  relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  relatedReview: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  // Optionally, who sent it (admin or user)
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification; 