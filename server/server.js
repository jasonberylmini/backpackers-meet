import dotenv from 'dotenv';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import userRoutes from './routes/userRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import flagRoutes from './routes/flagRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import postRoutes from './routes/postRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import User from './models/User.js'; // Added for /test-user-profile endpoint
import verifyToken from './middlewares/authMiddleware.js'; // Added for /test-user-profile endpoint
import { setIO } from './utils/socketManager.js';

dotenv.config();
// Environment variable checks
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not set in environment variables.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in environment variables.');
  process.exit(1);
}

// Ensure uploads directory exists
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const app = express();

// Serve uploads directory statically
app.use('/uploads', express.static(path.resolve('uploads')));

// CORS configuration
app.use(cors({
  origin: '*', // TODO: restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Middleware to parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000); // 30 seconds
  next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Mount all route files
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('🚀 Server is running!');
});

// Test uploads directory
app.get('/test-uploads', (req, res) => {
  try {
    const uploadsPath = path.resolve('uploads');
    const files = fs.readdirSync(uploadsPath);
    res.json({
      message: 'Uploads directory is accessible',
      path: uploadsPath,
      files: files,
      fileCount: files.length
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error accessing uploads directory',
      error: error.message
    });
  }
});

// Test current user profile data
app.get('/test-user-profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'Current user profile data',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        profileImageType: typeof user.profileImage,
        coverImageType: typeof user.coverImage,
        profileImageTruthy: !!user.profileImage,
        coverImageTruthy: !!user.coverImage
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user profile',
      error: error.message
    });
  }
});

// --- SOCKET.IO INTEGRATION ---
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

// Set the global IO instance
setIO(io);

// Store connected users
const connectedUsers = new Map(); // socketId -> { userId, name, rooms }

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userName = decoded.name;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userName} (${socket.userId})`);
  
  // Store user connection
  connectedUsers.set(socket.id, {
    userId: socket.userId,
    name: socket.userName,
    rooms: new Set()
  });

  // Join user's personal room for notifications
  socket.join(`user_${socket.userId}`);

  // Admin-specific room management
  socket.on('joinAdminRoom', () => {
    socket.join('admin_room');
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.rooms.add('admin_room');
    }
    console.log(`👨‍💼 Admin ${socket.userName} joined admin room`);
  });

  socket.on('leaveAdminRoom', () => {
    socket.leave('admin_room');
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.rooms.delete('admin_room');
    }
    console.log(`👨‍💼 Admin ${socket.userName} left admin room`);
  });

  // Join a chat room (trip or personal)
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.rooms.add(roomId);
    }
    console.log(`👥 ${socket.userName} joined room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('userJoined', {
      userId: socket.userId,
      name: socket.userName,
      timestamp: new Date()
    });
  });

  // Leave a chat room
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.rooms.delete(roomId);
    }
    console.log(`👋 ${socket.userName} left room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('userLeft', {
      userId: socket.userId,
      name: socket.userName,
      timestamp: new Date()
    });
  });

  // Send message to a room
  socket.on('sendMessage', (data) => {
    const { roomId, text, type = 'text', replyTo, attachments } = data;
    
    const messageData = {
      roomId,
      sender: {
        id: socket.userId,
        name: socket.userName
      },
      text,
      type,
      replyTo,
      attachments,
      timestamp: new Date()
    };

    // Broadcast to room
    io.to(roomId).emit('receiveMessage', messageData);
    console.log(`💬 ${socket.userName} sent message to ${roomId}: ${text.substring(0, 50)}...`);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { roomId, isTyping } = data;
    socket.to(roomId).emit('userTyping', {
      userId: socket.userId,
      name: socket.userName,
      isTyping,
      timestamp: new Date()
    });
  });

  // Mark messages as read
  socket.on('markAsRead', (data) => {
    const { roomId, messageIds } = data;
    socket.to(roomId).emit('messagesRead', {
      userId: socket.userId,
      messageIds,
      timestamp: new Date()
    });
  });

  // Expense events
  socket.on('expenseAdded', (data) => {
    const { tripId, expense } = data;
    io.to(`trip_${tripId}`).emit('newExpense', {
      tripId,
      expense,
      addedBy: {
        id: socket.userId,
        name: socket.userName
      },
      timestamp: new Date()
    });
  });

  socket.on('expenseSettled', (data) => {
    const { tripId, expenseId } = data;
    io.to(`trip_${tripId}`).emit('expenseSettled', {
      tripId,
      expenseId,
      settledBy: {
        id: socket.userId,
        name: socket.userName
      },
      timestamp: new Date()
    });
  });

  // Trip events
  socket.on('tripUpdated', (data) => {
    const { tripId, updates } = data;
    io.to(`trip_${tripId}`).emit('tripUpdated', {
      tripId,
      updates,
      updatedBy: {
        id: socket.userId,
        name: socket.userName
      },
      timestamp: new Date()
    });
  });

  // Online status
  socket.on('setOnlineStatus', (data) => {
    const { status } = data;
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.status = status;
    }
    
    // Notify all rooms the user is in
    if (user && user.rooms) {
      user.rooms.forEach(roomId => {
        socket.to(roomId).emit('userStatusChanged', {
          userId: socket.userId,
          name: socket.userName,
          status,
          timestamp: new Date()
        });
      });
    }
  });

  // Get online users in a room
  socket.on('getOnlineUsers', (roomId) => {
    const onlineUsers = [];
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    
    if (roomSockets) {
      roomSockets.forEach(socketId => {
        const user = connectedUsers.get(socketId);
        if (user) {
          onlineUsers.push({
            userId: user.userId,
            name: user.name,
            status: user.status || 'online'
          });
        }
      });
    }
    
    socket.emit('onlineUsers', { roomId, users: onlineUsers });
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Notify all rooms the user was in
      user.rooms.forEach(roomId => {
        socket.to(roomId).emit('userDisconnected', {
          userId: socket.userId,
          name: socket.userName,
          timestamp: new Date()
        });
      });
      
      // Remove from connected users
      connectedUsers.delete(socket.id);
    }
    
    console.log(`❌ User disconnected: ${socket.userName} (${socket.userId})`);
  });
});

// Admin-specific event emitters (to be called from controllers)
export const emitAdminEvent = (event, data) => {
  io.to('admin_room').emit(event, {
    ...data,
    timestamp: new Date()
  });
};

export const emitNewFlag = (flag) => {
  emitAdminEvent('newFlag', flag);
};

export const emitFlagResolved = (flagId, reason) => {
  emitAdminEvent('flagResolved', { flagId, reason });
};

export const emitNewKYCRequest = (kycRequest) => {
  emitAdminEvent('newKYCRequest', kycRequest);
};

export const emitKYCProcessed = (kycId, status, user) => {
  emitAdminEvent('kycProcessed', { kycId, status, user });
};

export const emitNewReview = (review) => {
  emitAdminEvent('newReview', review);
};

export const emitReviewFlagged = (reviewId, reason) => {
  emitAdminEvent('reviewFlagged', { reviewId, reason });
};

export const emitNewTrip = (trip) => {
  emitAdminEvent('newTrip', trip);
};

export const emitTripUpdated = (tripId, destination, updates) => {
  emitAdminEvent('tripUpdated', { tripId, destination, updates });
};

export const emitNewLog = (log) => {
  emitAdminEvent('newLog', log);
};

export const emitAdminNotification = (title, message, type = 'info') => {
  emitAdminEvent('adminNotification', { title, message, type });
};

// Start the server
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server ready for real-time connections`);
});
