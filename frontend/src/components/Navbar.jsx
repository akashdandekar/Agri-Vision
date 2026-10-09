import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { Sprout, Globe, Bell, LogOut, User, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isFarmer, isAdmin, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const navigate = useNavigate();

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' }
  ];

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 50, padding: '0.75rem 1.5rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(5,150,105,0.3)' }}>
            <Sprout size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{t('app_title')}</span>
              {isAdmin && (
                <span className="badge" style={{ backgroundColor: '#1e293b', color: '#f8fafc', fontSize: '0.65rem' }}>
                  ADMIN
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              {t('app_subtitle')}
            </div>
          </div>
        </Link>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Language Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowLangMenu(!showLangMenu); setShowNotifMenu(false); }}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              title={t('select_language')}
            >
              <Globe size={16} />
              <span>{languages.find(l => l.code === language)?.native || 'English'}</span>
            </button>

            {showLangMenu && (
              <div className="card" style={{ position: 'absolute', right: 0, top: '110%', width: '160px', padding: '0.5rem', zIndex: 100, boxShadow: 'var(--shadow-xl)' }}>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { changeLanguage(l.code); setShowLangMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      textAlign: 'left',
                      background: language === l.code ? 'var(--primary-50)' : 'transparent',
                      color: language === l.code ? 'var(--primary-700)' : 'var(--slate-700)',
                      fontWeight: language === l.code ? 700 : 500,
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>{l.native}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell (for logged in users) */}
          {isAuthenticated && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifMenu(!showNotifMenu); setShowLangMenu(false); }}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.65rem', position: 'relative' }}
                title={t('notifications')}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--danger-500)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(239,68,68,0.4)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifMenu && (
                <div className="card" style={{ position: 'absolute', right: 0, top: '110%', width: '320px', padding: '1rem', zIndex: 100, maxHeight: '380px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>{t('notifications')}</div>
                    <span className="badge badge-info">{unreadCount} new</span>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '8px',
                          marginBottom: '0.5rem',
                          background: n.is_read ? 'transparent' : 'var(--primary-50)',
                          borderLeft: n.is_read ? '2px solid transparent' : '3px solid var(--primary-600)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--slate-800)' }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>{n.message}</div>
                      </div>
                    ))
                  )}

                  {isFarmer && (
                    <button
                      onClick={() => { setShowNotifMenu(false); navigate('/farmer/notifications'); }}
                      className="btn btn-outline"
                      style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', marginTop: '0.5rem' }}
                    >
                      View All Notifications
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Profile / Login status */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                  {user?.fullName || user?.full_name}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                  {isFarmer ? 'Registered Farmer' : (user?.designation || 'Officer')}
                </div>
              </div>

              <button
                onClick={logout}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.75rem', color: 'var(--danger-600)' }}
                title={t('logout')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/farmer/login" className="btn btn-primary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}>
                <User size={15} />
                <span>{t('farmer_portal')}</span>
              </Link>
              <Link to="/admin/login" className="btn btn-secondary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}>
                <ShieldCheck size={15} />
                <span>{t('admin_portal')}</span>
              </Link>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
