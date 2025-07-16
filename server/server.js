import dotenv from 'dotenv';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import userRoutes from './routes/userRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import flagRoutes from './routes/flagRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

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

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Middleware to parse JSON
app.use(express.json());

// Mount all route files
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/expenses', expenseRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('🚀 Server is running!');
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
