import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  passwordHash: { type: String, required: true },

  phone: { type: String },

  gender: { type: String },

  preferences: { type: String },

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },

  idDocument: { type: String }, // file path to uploaded ID (image/pdf)

  role: {
    type: String,
    enum: ['traveler', 'admin'],
    default: 'traveler'
  },

  isBanned: {
    type: Boolean,
    default: false
  },

  joinedGroups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    }
  ],

  averageRating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
export default User;
