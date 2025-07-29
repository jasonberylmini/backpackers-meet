import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  // Chat type: 'group' (trip-based) or 'personal' (direct message)
  type: {
    type: String,
    enum: ['group', 'personal'],
    required: true
  },
  
  // For group chats - reference to trip
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  
  // For personal chats - participants
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Chat metadata
  name: {
    type: String,
    default: function() {
      return this.type === 'group' ? 'Trip Chat' : 'Direct Message';
    }
  },
  
  // Last message info for preview
  lastMessage: {
    text: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  },
  
  // Chat settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  // For group chats - who can send messages
  permissions: {
    type: String,
    enum: ['all', 'admin_only', 'verified_only'],
    default: 'all'
  },
  
  // Muted users
  mutedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient queries
chatSchema.index({ type: 1, tripId: 1 });
chatSchema.index({ type: 1, participants: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat; 