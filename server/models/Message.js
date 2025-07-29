import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // Reference to chat (group or personal)
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  // Legacy support - keep tripId for backward compatibility
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message content
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Message type
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'expense', 'system'],
    default: 'text'
  },
  
  // Message status
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  },
  
  // Attachments (images, files, etc.)
  attachments: [{
    url: String,
    type: String, // 'image', 'file', 'document'
    name: String,
    size: Number
  }],
  
  // For location sharing
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  
  // For expense messages
  expense: {
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    amount: Number,
    description: String
  },
  
  // Message metadata
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: {
    type: Date
  },
  
  // For replies
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // For reactions
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // For system messages
  systemAction: {
    type: String,
    enum: ['user_joined', 'user_left', 'trip_updated', 'expense_added', 'expense_settled']
  },
  
  // Legacy fields for backward compatibility
  directToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  updatedAt: { type: Date, default: Date.now },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for efficient queries
messageSchema.index({ chatId: 1, sentAt: -1 });
messageSchema.index({ sender: 1, sentAt: -1 });
messageSchema.index({ tripId: 1, sentAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
