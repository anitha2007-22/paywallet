import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/helpers';

const TYPE_ICON  = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌', fraud_alert: '🚨' };
const TYPE_COLOR = {
  success:     'bg-accent-50 dark:bg-accent-900/20 border-accent-100 dark:border-accent-800/30',
  info:        'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800/30',
  warning:     'bg-warning-50 dark:bg-warning-900/20 border-warning-100 dark:border-warning-800/30',
  error:       'bg-danger-50 dark:bg-danger-900/20 border-danger-100 dark:border-danger-800/30',
  fraud_alert: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-muted">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary btn-sm">
            ✓ Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-5xl mb-3">🔔</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
          <p className="text-sm text-muted mt-1">You have no notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id}
              className={`card p-4 border flex gap-4 items-start transition-all duration-200 animate-fade-in ${
                !n.is_read ? TYPE_COLOR[n.type] || TYPE_COLOR.info : ''
              } ${!n.is_read ? 'ring-1 ring-inset ring-primary-200 dark:ring-primary-800/30' : ''}`}>
              <div className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || 'ℹ️'}</div>
              <div className="flex-1 min-w-0" onClick={() => !n.is_read && markRead(n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-muted mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-muted mt-2">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)}
                    className="text-xs text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                    Read
                  </button>
                )}
                <button onClick={() => deleteNotification(n.id)}
                  className="text-xs text-slate-400 hover:text-danger-500 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}