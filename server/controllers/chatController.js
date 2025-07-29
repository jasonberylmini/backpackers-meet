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
    });

    if (!chat) {
      // Create new personal chat
      chat = new Chat({
        type: 'personal',
        participants: [currentUserId, otherUserId],
        name: `Chat with ${otherUser.name}`
      });
      await chat.save();
    }

    res.status(200).json({
      message: 'Personal chat created/found.',
      chat: {
        _id: chat._id,
        type: chat.type,
        name: chat.name,
        participants: chat.participants,
        lastMessage: chat.lastMessage
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
    let chat = await Chat.findOne({ type: 'group', tripId });
    
    if (!chat) {
      chat = new Chat({
        type: 'group',
        tripId,
        name: `${trip.destination} Trip Chat`,
        participants: [trip.creator, ...trip.members]
      });
      await chat.save();
    }

    res.status(200).json({
      message: 'Trip chat found.',
      chat: {
        _id: chat._id,
        type: chat.type,
        name: chat.name,
        tripId: chat.tripId,
        lastMessage: chat.lastMessage
      }
    });
  } catch (err) {
    logger.error('Get Trip Chat Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's chats (both personal and group)
export const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Get personal chats where user is a participant
    const personalChats = await Chat.find({
      type: 'personal',
      participants: currentUserId
    }).populate('participants', 'name email profileImage');

    // Get group chats for trips where user is a member
    const userTrips = await Trip.find({
      $or: [
        { creator: currentUserId },
        { members: currentUserId }
      ]
    }).select('_id');

    const tripIds = userTrips.map(trip => trip._id);
    const groupChats = await Chat.find({
      type: 'group',
      tripId: { $in: tripIds }
    }).populate('tripId', 'destination startDate');

    // Combine and sort by last message timestamp
    const allChats = [...personalChats, ...groupChats].sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt;
      const bTime = b.lastMessage?.timestamp || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });

    // Apply pagination
    const total = allChats.length;
    const paginatedChats = allChats.slice(skip, skip + Number(limit));

    res.status(200).json({
      chats: paginatedChats,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    logger.error('Get User Chats Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message to chat
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, type = 'text', replyTo, attachments, location, expenseData } = req.body;
    const senderId = req.user.userId;

    if (!text && type === 'text') {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    // Check if chat exists and user has access
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    // Check permissions
    if (chat.type === 'personal') {
      if (!chat.participants.includes(senderId)) {
        return res.status(403).json({ message: 'You are not a participant in this chat.' });
      }
    } else if (chat.type === 'group') {
      const trip = await Trip.findById(chat.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found.' });
      }
      
      const isMember = trip.creator.equals(senderId) || 
                      trip.members.some(memberId => memberId.equals(senderId));
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this trip.' });
      }
    }

    // Create message
    const messageData = {
      chatId,
      sender: senderId,
      text,
      type,
      replyTo
    };

    // Add tripId for backward compatibility
    if (chat.type === 'group') {
      messageData.tripId = chat.tripId;
    }

    // Handle attachments
    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    // Handle location
    if (location) {
      messageData.location = location;
    }

    // Handle expense message
    if (type === 'expense' && expenseData) {
      // Create expense record
      const expense = new Expense({
        groupId: chat.tripId,
        contributorId: senderId,
        amount: expenseData.amount,
        description: expenseData.description,
        category: expenseData.category || 'other',
        currency: expenseData.currency || 'USD',
        splitBetween: expenseData.splitBetween || [],
        location: expenseData.location,
        tags: expenseData.tags || []
      });
      
      await expense.save();
      
      messageData.expense = {
        expenseId: expense._id,
        amount: expense.amount,
        description: expense.description
      };
    }

    const message = new Message(messageData);
    await message.save();

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        text: text.substring(0, 100), // Truncate for preview
        sender: senderId,
        timestamp: new Date()
      },
      updatedAt: new Date()
    });

    // Populate sender info for response
    await message.populate('sender', 'name email profileImage');

    res.status(201).json({
      message: 'Message sent successfully.',
      messageData: message
    });
  } catch (err) {
    logger.error('Send Message Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages for a chat
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const currentUserId = req.user.userId;

    // Check if chat exists and user has access
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    // Check permissions
    if (chat.type === 'personal') {
      if (!chat.participants.includes(currentUserId)) {
        return res.status(403).json({ message: 'You are not a participant in this chat.' });
      }
    } else if (chat.type === 'group') {
      const trip = await Trip.findById(chat.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found.' });
      }
      
      const isMember = trip.creator.equals(currentUserId) || 
                      trip.members.some(memberId => memberId.equals(currentUserId));
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this trip.' });
      }
    }

    // Build query
    const query = { chatId };
    if (before) {
      query.sentAt = { $lt: new Date(before) };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const messages = await Message.find(query)
      .populate('sender', 'name email profileImage')
      .populate('replyTo', 'text sender')
      .populate('expense.expenseId')
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Message.countDocuments({ chatId });

    res.status(200).json({
      messages: messages.reverse(), // Return in chronological order
      total,
      page: Number(page),
      limit: Number(limit)
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
    const currentUserId = req.user.userId;

    // Update all unread messages in this chat for this user
    const result = await Message.updateMany(
      { 
        chatId, 
        sender: { $ne: currentUserId }, // Not sent by current user
        status: { $ne: 'read' }
      },
      { status: 'read' }
    );

    res.status(200).json({
      message: 'Messages marked as read.',
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    logger.error('Mark Messages Read Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a message (only sender can delete)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (!message.sender.equals(currentUserId)) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      message: 'Message deleted successfully.'
    });
  } catch (err) {
    logger.error('Delete Message Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
