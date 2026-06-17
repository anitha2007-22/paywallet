import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const socketRef = useRef(null);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications?limit=30');
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unread_count);
    } catch { /* ignore */ }
  }, [user]);

  // Connect Socket.IO
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io('https://paywallet-backend-skwj.onrender.com', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));

    socket.on('notification:new', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);

      // In-app toast
      toast(notif.message, {
        icon: notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : notif.type === 'fraud_alert' ? '🚨' : 'ℹ️',
        duration: 5000,
      });

      // Browser push notification
      if (Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/favicon.svg',
          tag: notif.id,
        });
      }
    });

    socket.on('money:received', ({ amount, from, reference }) => {
      toast.success(`💸 ₹${Number(amount).toLocaleString('en-IN')} received from ${from}`, { duration: 6000 });
    });

    socket.on('wallet:frozen', () => {
      toast.error('🔒 Your wallet has been frozen. Contact support.', { duration: 8000 });
    });

    socket.on('wallet:unfrozen', () => {
      toast.success('🔓 Your wallet is active again!', { duration: 6000 });
    });

    fetchNotifications();

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user, fetchNotifications]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const deleteNotification = async (id) => {
    try {
      const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, fetchNotifications,
      markRead, markAllRead, deleteNotification,
      socket: socketRef.current,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);