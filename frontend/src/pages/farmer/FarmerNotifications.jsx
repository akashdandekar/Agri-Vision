import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export default function FarmerNotifications() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { t } = useLanguage();

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {t('notifications')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            System alerts, token announcements, and DBT payment transfer updates
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notifications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
            <Bell size={40} style={{ margin: '0 auto 1rem auto' }} />
            <div>No notifications yet. Alerts will appear here in real-time.</div>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className="card"
              onClick={() => markAsRead(n.id)}
              style={{
                cursor: 'pointer',
                borderLeft: n.is_read ? '4px solid var(--slate-200)' : '4px solid var(--primary-600)',
                background: n.is_read ? '#ffffff' : 'var(--primary-50)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--slate-800)' }}>
                  {n.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  <Clock size={13} />
                  <span>{new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                {n.message}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
