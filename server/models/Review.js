import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewType: {
    type: String,
    enum: ['trip', 'user'],
    required: true,
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  reviewedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  feedback: {
    type: String,
    required: true,
  },
  tags: [String],
  flagged: {
    type: Boolean,
    default: false,
  },
  moderation: {
    notificationCount: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminResponse: { type: String, default: '' },
  editHistory: [{
    feedback: String,
    editedAt: Date
  }],
  deletedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate reviews: one review per reviewer per trip/user
reviewSchema.index(
  { reviewer: 1, reviewType: 1, tripId: 1, reviewedUser: 1 },
  { unique: true, partialFilterExpression: { reviewType: { $in: ['trip', 'user'] } } }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
