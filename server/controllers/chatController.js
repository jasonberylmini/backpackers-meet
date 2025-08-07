import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Create or get personal chat between two users
export const createPersonalChat = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user.userId;

    if (currentUserId === otherUserId) {
      return res.status(400).json({ message: 'Cannot create chat with yourself.' });
    }

    // Check if other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if personal chat already exists
    let chat = await Chat.findOne({
      type: 'personal',
      participants: { $all: [currentUserId, otherUserId] }
    }).populate('participants', 'username name profileImage');

    if (!chat) {
      // Create new personal chat
      chat = new Chat({
        type: 'personal',
        participants: [currentUserId, otherUserId],
        name: `Chat with ${otherUser.username || otherUser.name}`
      });
      await chat.save();
      await chat.populate('participants', 'username name profileImage');
    }

    res.status(200).json({
      message: 'Personal chat created/found.',
      chat: {
        _id: chat._id,
        type: chat.type,
        name: chat.name,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        unreadCount: 0
      }
    });
  } catch (err) {
    logger.error('Create Personal Chat Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get or create group chat for a trip
export const getTripChat = async (req, res) => {
  try {
    const { tripId } = req.params;
    const currentUserId = req.user.userId;

    // Check if trip exists and user is a member
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const isMember = trip.creator.equals(currentUserId) || 
                    trip.members.some(memberId => memberId.equals(currentUserId));
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip.' });
    }

    // Get or create group chat
    let chat = await Chat.findOne({ type: 'group', tripId })
      .populate('participants', 'username name profileImage');
    
    if (!chat) {
      chat = new Chat({
        type: 'group',
        tripId,
        name: `${trip.destination} Trip Chat`,
        participants: [trip.creator, ...trip.members]
      });
      await chat.save();
      await chat.populate('participants', 'username name profileImage');
    }

    res.status(200).json({
      message: 'Trip chat found.',
      chat: {
        _id: chat._id,
        type: chat.type,
        name: chat.name,
        tripId: chat.tripId,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        unreadCount: 0
      }
    });
  } catch (err) {
    logger.error('Get Trip Chat Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's chats with unread counts
export const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Get all chats where user is a participant
    const chats = await Chat.find({
      participants: currentUserId
    }).populate('participants', 'username name profileImage')
      .populate('lastMessage.sender', 'username name profileImage')
      .populate('tripId', 'destination image')
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });

    // Calculate unread counts for each chat
    const chatsWithUnreadCounts = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          sender: { $ne: currentUserId },
          status: { $ne: 'read' }
        });

        return {
          _id: chat._id,
          type: chat.type,
          name: chat.name,
          tripId: chat.tripId,
          tripImage: chat.tripId?.image,
          participants: chat.participants,
          lastMessage: chat.lastMessage,
          unreadCount
        };
      })
    );

    res.status(200).json({
      message: 'User chats retrieved successfully.',
      chats: chatsWithUnreadCounts
    });
  } catch (err) {
    logger.error('Get User Chats Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message with support for replies and attachments
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, replyTo, attachments } = req.body;
    const currentUserId = req.user.userId;

    // Validate chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'You are not a participant in this chat.' });
    }

    // Create message
    const messageData = {
      chatId,
      sender: currentUserId,
      text: text || '',
      type: 'text',
      status: 'sent'
    };

    // Add reply reference if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (replyMessage && replyMessage.chatId.toString() === chatId) {
        messageData.replyTo = replyTo;
      }
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    const message = new Message(messageData);
    await message.save();

    // Populate sender and reply information
    await message.populate('sender', 'username name profileImage');
    if (message.replyTo) {
      await message.populate('replyTo', 'text sender');
      await message.populate('replyTo.sender', 'username name profileImage');
    }

    // Update chat's last message
    chat.lastMessage = {
      text: message.text,
      sender: message.sender._id,
      timestamp: message.sentAt
    };
    chat.updatedAt = new Date();
    await chat.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('newMessage', {
        chatId,
        message: {
          _id: message._id,
          text: message.text,
          sender: {
            _id: message.sender._id,
            username: message.sender.username,
            name: message.sender.name,
            profileImage: message.sender.profileImage
          },
          sentAt: message.sentAt,
          replyTo: message.replyTo,
          attachments: message.attachments,
          reactions: message.reactions || []
        }
      });
    }

    res.status(201).json({
      message: 'Message sent successfully.',
      message: {
        _id: message._id,
        text: message.text,
        sender: message.sender,
        sentAt: message.sentAt,
        replyTo: message.replyTo,
        attachments: message.attachments,
        reactions: message.reactions || []
      }
    });
  } catch (err) {
    logger.error('Send Message Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat messages with pagination
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user.userId;

    // Validate chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'You are not a participant in this chat.' });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalMessages = await Message.countDocuments({ chatId });

    // Get messages with pagination
    const messages = await Message.find({ chatId })
      .populate('sender', 'username name profileImage')
      .populate('replyTo', 'text sender')
      .populate('replyTo.sender', 'username name profileImage')
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark messages as read
    const unreadMessages = messages.filter(msg => 
      msg.sender._id.toString() !== currentUserId && msg.status !== 'read'
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(msg => msg._id) } },
        { status: 'read' }
      );
    }

    res.status(200).json({
      message: 'Messages retrieved successfully.',
      messages: messages.reverse(), // Return in chronological order
      hasMore: skip + messages.length < totalMessages,
      total: totalMessages,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    logger.error('Get Chat Messages Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageIds } = req.body;
    const currentUserId = req.user.userId;

    // Validate chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'You are not a participant in this chat.' });
    }

    // Mark messages as read
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        chatId,
        sender: { $ne: currentUserId }
      },
      { status: 'read' }
    );

    res.status(200).json({
      message: 'Messages marked as read successfully.'
    });
  } catch (err) {
    logger.error('Mark Messages as Read Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const currentUserId = req.user.userId;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    // Update message
    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(message.chatId.toString()).emit('messageEdited', {
        chatId: message.chatId,
        messageId: message._id,
        newText: text
      });
    }

    res.status(200).json({
      message: 'Message edited successfully.',
      message: {
        _id: message._id,
        text: message.text,
        isEdited: message.isEdited,
        editedAt: message.editedAt
      }
    });
  } catch (err) {
    logger.error('Edit Message Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.userId;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    const chatId = message.chatId;

    // Delete message
    await Message.findByIdAndDelete(messageId);

    // Update chat's last message if this was the last message
    const chat = await Chat.findById(chatId);
    if (chat && chat.lastMessage && chat.lastMessage.sender.toString() === messageId) {
      const lastMessage = await Message.findOne({ chatId }).sort({ sentAt: -1 });
      if (lastMessage) {
        chat.lastMessage = {
          text: lastMessage.text,
          sender: lastMessage.sender,
          timestamp: lastMessage.sentAt
        };
      } else {
        chat.lastMessage = null;
      }
      await chat.save();
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(chatId.toString()).emit('messageDeleted', {
        chatId,
        messageId: message._id
      });
    }

    res.status(200).json({
      message: 'Message deleted successfully.'
    });
  } catch (err) {
    logger.error('Delete Message Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add reaction to message
export const addMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user.userId;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Check if user is participant in the chat
    const chat = await Chat.findById(message.chatId);
    if (!chat || !chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'You are not a participant in this chat.' });
    }

    // Find existing reaction by this user
    const existingReactionIndex = message.reactions.findIndex(
      reaction => reaction.user.toString() === currentUserId
    );

    if (existingReactionIndex !== -1) {
      // Update existing reaction
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Remove reaction if same emoji
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingReactionIndex].emoji = emoji;
        message.reactions[existingReactionIndex].timestamp = new Date();
      }
    } else {
      // Add new reaction
      message.reactions.push({
        user: currentUserId,
        emoji,
        timestamp: new Date()
      });
    }

    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(message.chatId.toString()).emit('messageReaction', {
        chatId: message.chatId,
        messageId: message._id,
        userId: currentUserId,
        emoji
      });
    }

    res.status(200).json({
      message: 'Reaction updated successfully.',
      reactions: message.reactions
    });
  } catch (err) {
    logger.error('Add Message Reaction Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete chat
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.userId;

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    // Check if user is participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'You are not a participant in this chat.' });
    }

    // Delete all messages in the chat
    await Message.deleteMany({ chatId });

    // Delete the chat
    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({
      message: 'Chat deleted successfully.'
    });
  } catch (err) {
    logger.error('Delete Chat Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
