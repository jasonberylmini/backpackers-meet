import mongoose from 'mongoose';

const USER_REASONS = [
  'Fake Profile',
  'Inappropriate Behavior',
  'Spam or Scams',
  'Harassment or Abuse',
  'Impersonation',
  'Suspicious Activity'
];
const TRIP_REASONS = [
  'Fake or Misleading Trip Info',
  'Unsafe Meeting Location',
  'Offensive Trip Description',
  'Overpriced/Scammy Trip',
  'Violation of Rules'
];
const REVIEW_REASONS = [
  'Inappropriate Language',
  'Fake Review',
  'Harassment or Personal Attack',
  'Spam/Promotion'
];

const flagSchema = new mongoose.Schema({
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flagType: {
    type: String,
    enum: ['user', 'trip', 'review', 'post'], // 'post' must be included
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'dismissed', 'resolved'],
    default: 'open'
  },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  adminNotes: { type: String, default: '' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  actionTaken: { type: String, default: '' },
  history: [{
    status: String,
    changedAt: Date,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  updatedAt: { type: Date, default: Date.now },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Flag = mongoose.model('Flag', flagSchema);
export default Flag;
export { USER_REASONS, TRIP_REASONS, REVIEW_REASONS };
