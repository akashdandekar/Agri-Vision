import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrencyINR } from '../../utils/unitConverter';
import Badge from '../../components/Badge';
import {
  Users,
  CalendarCheck,
  Clock,
  CheckCircle2,
  CircleDollarSign,
  AlertTriangle,
  Building2,
  ArrowRight,
  TrendingUp,
  FileBadge
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/admin/overview');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Overview fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>{t('loading')}</div>;
  }

  const stats = data?.stats;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Admin Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700, marginBottom: '0.25rem' }}>
            Mandi Administration Command Centre
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            {user?.fullName || user?.full_name}
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
            Employee ID: <strong>{user?.employeeId || user?.employee_id || 'EMP-KS-101'}</strong> &bull; {user?.designation || 'Senior Officer'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/queue" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
            <Clock size={16} />
            <span>Live Queue Console</span>
          </Link>
          <Link to="/admin/procurement" className="btn btn-amber" style={{ padding: '0.65rem 1.25rem' }}>
            <CheckCircle2 size={16} />
            <span>Digital Weighbridge</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        
        {/* Total Farmers */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary-600)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Total Farmers</span>
            <Users size={18} color="var(--primary-600)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {stats?.totalFarmers || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.2rem' }}>Registered growers</div>
        </div>

        {/* Today's Bookings */}
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Today's Bookings</span>
            <CalendarCheck size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {stats?.todayBookings || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.2rem' }}>Scheduled intakes</div>
        </div>

        {/* Active Queue */}
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Active Queue</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309' }}>
            {stats?.activeQueue || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.2rem' }}>Farmers at mandi</div>
        </div>

        {/* Emergency Bookings */}
        <div className="card" style={{ borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9f1239', textTransform: 'uppercase' }}>Emergency Quota</span>
            <AlertTriangle size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#9f1239' }}>
            {stats?.emergencyBookingsToday || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '0.2rem' }}>Perishable priority</div>
        </div>

      </div>

      {/* Centre Utilization Overview */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              Procurement Centre Capacity Utilization (Today)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
              Capacity tracking across both farmer count and produce metric weight (kg)
            </p>
          </div>
          <Link to="/admin/centres" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            Manage Centres
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {data?.centreUtilization?.map(c => (
            <div key={c.id} style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--slate-800)' }}>
                  {c.name}
                </span>
                <span className="badge badge-info">{c.code}</span>
              </div>

              {/* Farmer Capacity Bar */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-600)', marginBottom: '0.25rem' }}>
                  <span>Farmer Headcount: <strong>{c.bookedFarmers} / {c.maxFarmers}</strong></span>
                  <strong>{c.farmerUtilizationPercent}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, c.farmerUtilizationPercent)}%`, height: '100%', background: 'var(--primary-600)', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Produce kg Capacity Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-600)', marginBottom: '0.25rem' }}>
                  <span>Produce Weight: <strong>{c.bookedKg.toLocaleString('en-IN')} / {c.maxKg.toLocaleString('en-IN')} kg</strong></span>
                  <strong>{c.kgUtilizationPercent}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, c.kgUtilizationPercent)}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bookings Queue Feed */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              Today's Live Intake Roster
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
              Ordered by priority, slot time, and sequence token
            </p>
          </div>
          <Link to="/admin/bookings" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            View Full Register
          </Link>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Booking Ref</th>
                <th>Farmer Name</th>
                <th>Phone</th>
                <th>Crop & Quantity</th>
                <th>Centre</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentBookings?.map(b => (
                <tr key={b.id}>
                  <td>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary-700)' }}>
                      {b.token_number || 'T--'}
                    </strong>
                  </td>
                  <td><code>{b.booking_reference}</code></td>
                  <td><strong>{b.farmer_name}</strong></td>
                  <td>{b.farmer_phone}</td>
                  <td>{b.crop_name} ({b.allocated_quantity_kg} kg)</td>
                  <td>{b.centre_name}</td>
                  <td>
                    <Badge status={b.booking_type} type="urgency" />
                  </td>
                  <td>
                    <Badge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
