import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  // Group/Trip reference
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  
  // Who paid for this expense
  contributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Expense details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // Expense category
  category: {
    type: String,
    enum: ['transport', 'accommodation', 'food', 'activities', 'shopping', 'other'],
    default: 'other'
  },
  
  // Currency (default to USD)
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  
  // Date of expense
  date: {
    type: Date,
    default: Date.now,
  },
  
  // Expense status
  status: { 
    type: String, 
    enum: ['pending', 'settled', 'disputed'], 
    default: 'pending' 
  },
  
  // Receipt image
  receipt: { 
    type: String 
  },
  
  // Who should split this expense (default: all trip members)
  splitBetween: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Split type (auto or manual)
  splitType: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  
  // Individual shares (calculated)
  shares: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt: Date
  }],
  
  // Settlement details
  settlements: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: Date,
    method: String // 'cash', 'transfer', 'app'
  }],
  
  // Location where expense occurred
  location: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Tags for easy filtering
  tags: [String],
  
  // Notes
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Related chat message
  chatMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes for efficient queries
expenseSchema.index({ groupId: 1, date: -1 });
expenseSchema.index({ contributorId: 1, date: -1 });
expenseSchema.index({ status: 1, groupId: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
