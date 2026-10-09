import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import TokenCard from '../../components/TokenCard';
import LiveQueueTracker from '../../components/LiveQueueTracker';
import Badge from '../../components/Badge';
import { Wheat, CalendarCheck, Clock, CircleDollarSign, Plus, ArrowRight, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [produceList, setProduceList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, produceRes] = await api.all([
        api.get('/bookings/my'),
        api.get('/produce')
      ]);

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.data);
      }
      if (produceRes.data.success) {
        setProduceList(produceRes.data.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Find most relevant active booking (not cancelled or completed)
  const activeBooking = bookings.find(b =>
    !['CANCELLED', 'NO_SHOW'].includes(b.status)
  ) || bookings[0];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b, #047857)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: 'var(--shadow-emerald)'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a7f3d0', fontWeight: 700, marginBottom: '0.25rem' }}>
            Namaste, Annadata
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
            {user?.fullName || user?.full_name}
          </h1>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '0.35rem' }}>
            📍 {user?.village || 'Baramati'}, {user?.district || 'Pune'} ({user?.state || 'Maharashtra'}) &bull; Mobile: {user?.phone}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/farmer/booking" className="btn btn-amber">
            <CalendarCheck size={18} />
            <span>{t('book_slot')}</span>
          </Link>
          <Link to="/farmer/produce" className="btn" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
            <Plus size={18} />
            <span>{t('add_produce')}</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Active Booking & Live Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Left Column: Digital Token Card & Details */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              Current Active Pass
            </h3>
            {activeBooking && (
              <span style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                Ref: {activeBooking.booking_reference}
              </span>
            )}
          </div>

          {activeBooking ? (
            <TokenCard booking={activeBooking} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <Wheat size={42} color="var(--slate-400)" style={{ margin: '0 auto 1rem auto' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                No Active Booking Found
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: '0.5rem 0 1.5rem 0' }}>
                You have not booked a procurement slot yet. Add your crop and schedule a convenient slot to eliminate mandi waiting!
              </p>
              <Link to="/farmer/booking" className="btn btn-primary">
                Book Your First Slot
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Live Queue Radar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              {t('live_queue')}
            </h3>
            {activeBooking && (
              <Link to={`/farmer/queue?bookingId=${activeBooking.id}`} style={{ fontSize: '0.825rem', color: 'var(--primary-700)', fontWeight: 700, textDecoration: 'none' }}>
                Full Screen View &rarr;
              </Link>
            )}
          </div>

          {activeBooking ? (
            <LiveQueueTracker bookingId={activeBooking.id} onStatusChange={() => {}} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <Clock size={42} color="var(--slate-400)" style={{ margin: '0 auto 1rem auto' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                Queue Tracker Offline
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.5rem' }}>
                Book an active slot to view real-time token queues and AI waiting time predictions.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Produce Inventory & Recent Bookings Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* My Registered Crops */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              {t('my_produce')} ({produceList.length})
            </h3>
            <Link to="/farmer/produce" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              Manage Crops
            </Link>
          </div>

          {produceList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-400)' }}>
              No produce records registered. Click Add Produce to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {produceList.slice(0, 4).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '0.95rem' }}>{p.crop_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      Quantity: <strong style={{ color: 'var(--slate-700)' }}>{p.quantity_input} {p.unit}</strong> ({p.quantity_kg} kg)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge status={p.perishability} type="perishability" />
                    <Badge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Procurement & Payment Tracking summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              {t('procurement')} & DBT Status
            </h3>
            <Link to="/farmer/procurement" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              View Receipts
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bookings.slice(0, 3).map(b => (
              <div key={b.id} style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>
                    {b.crop_name}
                  </span>
                  <Badge status={b.payment_status || 'PENDING'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                  <span>Token: <strong>{b.token_number}</strong> &bull; {b.allocated_quantity_kg} kg</span>
                  <span>Amount: <strong style={{ color: '#065f46' }}>{b.payment_amount ? `₹${parseFloat(b.payment_amount).toLocaleString('en-IN')}` : 'Calculating...'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
