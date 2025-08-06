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