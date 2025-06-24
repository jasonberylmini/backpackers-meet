// server/models/SystemReport.js
import mongoose from 'mongoose';

const systemReportSchema = new mongoose.Schema({
  reportType: { type: String, required: true }, // e.g., 'flag', 'trip', 'user'
  generatedFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // flexible for any content
  createdAt: { type: Date, default: Date.now },
});

const SystemReport = mongoose.model('SystemReport', systemReportSchema);
export default SystemReport;
