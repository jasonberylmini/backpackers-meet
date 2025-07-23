import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  budget: {
    type: Number,
    required: true
  },
  tripType: {
    type: String, // carpool, rental, public transport
    required: true
  },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  description: { type: String, default: '' },
  images: [String],
  location: {
    lat: Number,
    lng: Number
  },
  privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  deletedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expenses: [{
    description: String,
    amount: Number,
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  moderation: {
    notificationCount: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
