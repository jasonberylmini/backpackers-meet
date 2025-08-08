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
    default: null
  },

  idDocument: { type: String }, // file path to uploaded ID (image/pdf)
  idSelfie: { type: String },

  role: {
    type: String,
    enum: ['traveler', 'admin'],
    default: 'traveler'
  },

  status: {
    type: String,
    enum: ['active', 'banned', 'suspended'],
    default: 'active'
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

  profileImage: { type: String }, // file path or URL to profile image
  coverImage: { type: String, default: '' },

  moderation: {
    notificationCount: { type: Number, default: 0 },
    reported: { type: Boolean, default: false },
    reportedAt: { type: Date },
    reportReason: { type: String },
    bannedAt: { type: Date },
    unbannedAt: { type: Date },
    warnedAt: { type: Date },
    warningCount: { type: Number, default: 0 },
    warningReason: { type: String }
  },

  // For password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  bio: { type: String, default: '' },
  notificationPrefs: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  lastLogin: { type: Date },
  accountStatus: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  deletedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },

  createdAt: {
    type: Date,
    default: Date.now
  },
  dateOfBirth: { type: Date, default: null },
  username: { type: String, unique: true, sparse: true },
  country: { type: String, default: '' },
  instagram: { type: String, default: '' },
  languages: [{ type: String }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

});

const User = mongoose.model('User', userSchema);
export default User;
