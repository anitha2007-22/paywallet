const db = require('../config/database');

let ioInstance = null;

const setIO = (io) => { ioInstance = io; };

const createNotification = async (userId, title, message, type = 'info', metadata = {}) => {
  try {
    const { rows: [notification] } = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, title, message, type, JSON.stringify(metadata)]
    );

    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

module.exports = { createNotification, setIO };