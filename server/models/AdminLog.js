// server/models/AdminLog.js
import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  targetReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  targetFlagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flag' },
  reason: { type: String },
  outcome: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);
export default AdminLog;
