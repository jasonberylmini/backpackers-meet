// Simple Socket.IO test script
// Run with: node test-socket.js

import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'test-token' }
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  
  // Join a test room
  socket.emit('joinRoom', 'test-room-123');
  
  // Send a test message
  setTimeout(() => {
    socket.emit('sendMessage', {
      roomId: 'test-room-123',
      text: 'Hello from test script!'
    });
  }, 1000);
});

socket.on('receiveMessage', (data) => {
  console.log('📨 Received message:', data);
});

socket.on('userJoined', (data) => {
  console.log('👥 User joined:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('🔴 Connection error:', error);
});

// Keep the script running
setTimeout(() => {
  console.log('Test completed');
  socket.disconnect();
  process.exit(0);
}, 5000); 