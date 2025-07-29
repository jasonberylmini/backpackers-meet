import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Admin-specific state
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [liveFlags, setLiveFlags] = useState([]);
  const [liveKYCRequests, setLiveKYCRequests] = useState([]);
  const [liveReviews, setLiveReviews] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);
  const [liveLogs, setLiveLogs] = useState([]);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, skipping socket connection');
      return;
    }

    // Create socket connection with authentication
    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      setIsConnected(false);
      setCurrentRoom(null);
      setOnlineUsers([]);
      setTypingUsers([]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // User events
    newSocket.on('userJoined', (data) => {
      console.log(`${data.name} joined the room`);
      // You can add toast notification here
    });

    newSocket.on('userLeft', (data) => {
      console.log(`${data.name} left the room`);
      // You can add toast notification here
    });

    newSocket.on('userDisconnected', (data) => {
      console.log(`${data.name} disconnected`);
      // You can add toast notification here
    });

    // Typing events
    newSocket.on('userTyping', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    });

    // Online users
    newSocket.on('onlineUsers', (data) => {
      setOnlineUsers(data.users);
    });

    // Admin-specific events
    newSocket.on('newFlag', (data) => {
      console.log('🚩 New flag received:', data);
      setLiveFlags(prev => [data, ...prev]);
      toast.success(`New flag: ${data.reason}`, {
        icon: '🚩',
        duration: 4000,
      });
    });

    newSocket.on('flagResolved', (data) => {
      console.log('✅ Flag resolved:', data);
      setLiveFlags(prev => prev.filter(flag => flag._id !== data.flagId));
      toast.success(`Flag resolved: ${data.reason}`, {
        icon: '✅',
        duration: 3000,
      });
    });

    newSocket.on('newKYCRequest', (data) => {
      console.log('📋 New KYC request:', data);
      setLiveKYCRequests(prev => [data, ...prev]);
      toast.success(`New KYC request from ${data.user.name}`, {
        icon: '📋',
        duration: 4000,
      });
    });

    newSocket.on('kycProcessed', (data) => {
      console.log('✅ KYC processed:', data);
      setLiveKYCRequests(prev => prev.filter(kyc => kyc._id !== data.kycId));
      toast.success(`KYC ${data.status} for ${data.user.name}`, {
        icon: data.status === 'approved' ? '✅' : '❌',
        duration: 3000,
      });
    });

    newSocket.on('newReview', (data) => {
      console.log('⭐ New review:', data);
      setLiveReviews(prev => [data, ...prev]);
      toast.success(`New review: ${data.rating}★`, {
        icon: '⭐',
        duration: 3000,
      });
    });

    newSocket.on('reviewFlagged', (data) => {
      console.log('🚩 Review flagged:', data);
      setLiveReviews(prev => prev.map(review => 
        review._id === data.reviewId 
          ? { ...review, flagged: true }
          : review
      ));
      toast.error(`Review flagged: ${data.reason}`, {
        icon: '🚩',
        duration: 4000,
      });
    });

    newSocket.on('newTrip', (data) => {
      console.log('🧳 New trip:', data);
      setLiveTrips(prev => [data, ...prev]);
      toast.success(`New trip: ${data.destination}`, {
        icon: '🧳',
        duration: 3000,
      });
    });

    newSocket.on('tripUpdated', (data) => {
      console.log('🔄 Trip updated:', data);
      setLiveTrips(prev => prev.map(trip => 
        trip._id === data.tripId 
          ? { ...trip, ...data.updates }
          : trip
      ));
      toast.info(`Trip updated: ${data.destination}`, {
        icon: '🔄',
        duration: 3000,
      });
    });

    newSocket.on('newLog', (data) => {
      console.log('📝 New admin log:', data);
      setLiveLogs(prev => [data, ...prev]);
      toast.success(`Admin action: ${data.action}`, {
        icon: '📝',
        duration: 3000,
      });
    });

    newSocket.on('adminNotification', (data) => {
      console.log('🔔 Admin notification:', data);
      setAdminNotifications(prev => [data, ...prev]);
      toast(data.message, {
        icon: data.type === 'warning' ? '⚠️' : data.type === 'error' ? '❌' : 'ℹ️',
        duration: 5000,
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Socket methods
  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('joinRoom', roomId);
      setCurrentRoom(roomId);
      
      // Get online users in the room
      setTimeout(() => {
        socket.emit('getOnlineUsers', roomId);
      }, 100);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leaveRoom', roomId);
      setCurrentRoom(null);
      setOnlineUsers([]);
      setTypingUsers([]);
    }
  };

  const sendMessage = (messageData) => {
    if (socket && isConnected) {
      socket.emit('sendMessage', messageData);
    }
  };

  const startTyping = () => {
    if (socket && isConnected && currentRoom) {
      socket.emit('typing', { roomId: currentRoom, isTyping: true });
    }
  };

  const stopTyping = () => {
    if (socket && isConnected && currentRoom) {
      socket.emit('typing', { roomId: currentRoom, isTyping: false });
    }
  };

  const markAsRead = (messageIds) => {
    if (socket && isConnected && currentRoom) {
      socket.emit('markAsRead', { roomId: currentRoom, messageIds });
    }
  };

  const setOnlineStatus = (status) => {
    if (socket && isConnected) {
      socket.emit('setOnlineStatus', { status });
    }
  };

  const notifyExpenseAdded = (tripId, expense) => {
    if (socket && isConnected) {
      socket.emit('expenseAdded', { tripId, expense });
    }
  };

  const notifyExpenseSettled = (tripId, expenseId) => {
    if (socket && isConnected) {
      socket.emit('expenseSettled', { tripId, expenseId });
    }
  };

  const notifyTripUpdate = (tripId, updates) => {
    if (socket && isConnected) {
      socket.emit('tripUpdated', { tripId, updates });
    }
  };

  // Admin-specific methods
  const joinAdminRoom = () => {
    if (socket && isConnected) {
      socket.emit('joinAdminRoom');
      console.log('👨‍💼 Joined admin room');
    }
  };

  const leaveAdminRoom = () => {
    if (socket && isConnected) {
      socket.emit('leaveAdminRoom');
      console.log('👨‍💼 Left admin room');
    }
  };

  const clearAdminNotifications = () => {
    setAdminNotifications([]);
  };

  const clearLiveData = (type) => {
    switch (type) {
      case 'flags':
        setLiveFlags([]);
        break;
      case 'kyc':
        setLiveKYCRequests([]);
        break;
      case 'reviews':
        setLiveReviews([]);
        break;
      case 'trips':
        setLiveTrips([]);
        break;
      case 'logs':
        setLiveLogs([]);
        break;
      default:
        break;
    }
  };

  const value = {
    socket,
    isConnected,
    currentRoom,
    onlineUsers,
    typingUsers,
    adminNotifications,
    liveFlags,
    liveKYCRequests,
    liveReviews,
    liveTrips,
    liveLogs,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    setOnlineStatus,
    notifyExpenseAdded,
    notifyExpenseSettled,
    notifyTripUpdate,
    joinAdminRoom,
    leaveAdminRoom,
    clearAdminNotifications,
    clearLiveData,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 