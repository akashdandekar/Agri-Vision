import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrencyINR } from '../../utils/unitConverter';
import { BarChart3, TrendingUp, Wheat, CircleDollarSign, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics');
        if (res.data.success) {
          setAnalytics(res.data.data);
        }
      } catch (err) {
        console.warn('Analytics fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>{t('loading')}</div>;
  }

  const trend = analytics?.dailyBookingsTrend || [];
  const crops = analytics?.cropDistribution || [];
  const payments = analytics?.paymentStats || [];
  const quality = analytics?.qualityStats || [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          Procurement Intelligence & System Analytics
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          Real-time metrics on procurement velocity, crop distributions, quality pass rates, and DBT liquidity
        </p>
      </div>

      {/* Grid of Analytical Breakdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 1. Daily Booking Volumes Trend */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <TrendingUp size={20} color="var(--primary-600)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              Booking Volume Trend (Last 7 Days)
            </h3>
          </div>

          {trend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
              No recent bookings data recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trend.map((d, idx) => (
                <div key={idx} style={{ background: 'var(--slate-50)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <strong>{d.booking_date}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                      Total: <strong>{d.total_bookings} bookings</strong> ({parseFloat(d.total_kg).toLocaleString('en-IN')} kg)
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, d.total_bookings * 20)}%`, height: '100%', background: 'var(--primary-600)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Crop Distribution Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Wheat size={20} color="var(--amber-600)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              Procured Crop Volume Breakdown
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {crops.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{c.crop_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                    {c.booking_count} farmer bookings
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#065f46' }}>
                    {parseFloat(c.total_kg).toLocaleString('en-IN')} kg
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                    {(parseFloat(c.total_kg) / 100).toFixed(1)} quintal
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Payment Liquidity & Quality Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Payment Summary */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <CircleDollarSign size={20} color="var(--primary-700)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              DBT Bank Liquidity Status
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {payments.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--slate-800)' }}>{p.status}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{p.count} transactions</div>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: p.status === 'PAID' ? '#065f46' : 'var(--amber-700)' }}>
                  {formatCurrencyINR(p.total_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Grade Distribution */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={20} color="var(--primary-600)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              Quality Inspection Grades
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quality.map((q, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{q.grade.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Certified standard batches</div>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                  {q.count}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
