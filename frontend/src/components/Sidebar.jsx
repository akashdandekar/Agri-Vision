import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Wheat,
  CalendarCheck,
  Clock,
  CircleDollarSign,
  Building2,
  ListOrdered,
  FileBadge,
  CheckCircle2,
  BarChart3,
  Bell
} from 'lucide-react';

export default function Sidebar() {
  const { isFarmer, isAdmin } = useAuth();
  const { t } = useLanguage();

  const farmerNav = [
    { to: '/farmer/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/farmer/produce', label: t('my_produce'), icon: Wheat },
    { to: '/farmer/booking', label: t('book_slot'), icon: CalendarCheck },
    { to: '/farmer/queue', label: t('live_queue'), icon: Clock },
    { to: '/farmer/procurement', label: t('procurement'), icon: CircleDollarSign },
    { to: '/farmer/notifications', label: t('notifications'), icon: Bell }
  ];

  const adminNav = [
    { to: '/admin/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/admin/centres', label: t('centres'), icon: Building2 },
    { to: '/admin/bookings', label: t('bookings'), icon: ListOrdered },
    { to: '/admin/queue', label: t('live_queue'), icon: Clock },
    { to: '/admin/quality', label: t('quality_control'), icon: FileBadge },
    { to: '/admin/procurement', label: t('procurement'), icon: CheckCircle2 },
    { to: '/admin/payments', label: t('payments'), icon: CircleDollarSign },
    { to: '/admin/analytics', label: t('analytics'), icon: BarChart3 }
  ];

  const navItems = isFarmer ? farmerNav : (isAdmin ? adminNav : []);

  return (
    <aside style={{
      width: '260px',
      background: '#ffffff',
      borderRight: '1px solid var(--slate-200)',
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      minHeight: 'calc(100vh - 72px)'
    }}>
      <div style={{
        fontSize: '0.725rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#94a3b8',
        fontWeight: 800,
        padding: '0 0.75rem 0.5rem 0.75rem'
      }}>
        {isFarmer ? 'Farmer Operations' : 'Administration'}
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.7rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '0.925rem',
              fontWeight: 600,
              color: isActive ? '#065f46' : 'var(--slate-600)',
              background: isActive ? 'var(--primary-50)' : 'transparent',
              borderLeft: isActive ? '3.5px solid var(--primary-600)' : '3.5px solid transparent',
              transition: 'all 0.15s ease'
            })}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
}
