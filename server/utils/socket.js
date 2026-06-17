let ioInstance = null;

const setIO = (io) => { ioInstance = io; };

const emitToUser = (userId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

module.exports = { setIO, emitToUser, emitToAll };