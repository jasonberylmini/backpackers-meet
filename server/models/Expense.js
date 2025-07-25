import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  contributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: String,
  date: {
    type: Date,
    default: Date.now,
  },
  status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
  receipt: { type: String },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
