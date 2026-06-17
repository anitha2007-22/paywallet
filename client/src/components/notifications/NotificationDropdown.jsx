import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { timeAgo } from '../../utils/helpers';

const TYPE_ICON = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌', fraud_alert: '🚨' };

export default function NotificationDropdown({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const recent = notifications.slice(0, 6);

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 animate-slide-down overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-danger-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
        {recent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-1">🔔</p>
            <p className="text-xs text-muted">No notifications yet</p>
          </div>
        ) : recent.map((n) => (
          <div key={n.id}
            onClick={() => { markRead(n.id); }}
            className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
            <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || 'ℹ️'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {n.title}
              </p>
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
              <p className="text-[10px] text-muted mt-1">{timeAgo(n.created_at)}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-3">
        <button
          onClick={() => { navigate('/notifications'); onClose(); }}
          className="w-full text-center text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 py-1">
          View all notifications →
        </button>
      </div>
    </div>
  );
}