let io = null;

export const setIO = (socketIO) => {
  io = socketIO;
};

export const getIO = () => {
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export const emitToChat = (chatId, event, data) => {
  if (io) {
    io.to(`chat_${chatId}`).emit(event, data);
  }
};

export const joinChatRoom = (socket, chatId) => {
  if (socket && chatId) {
    socket.join(`chat_${chatId}`);
  }
};

export const leaveChatRoom = (socket, chatId) => {
  if (socket && chatId) {
    socket.leave(`chat_${chatId}`);
  }
};

export const joinUserRoom = (socket, userId) => {
  if (socket && userId) {
    socket.join(`user_${userId}`);
  }
};

export const leaveUserRoom = (socket, userId) => {
  if (socket && userId) {
    socket.leave(`user_${userId}`);
  }
}; 