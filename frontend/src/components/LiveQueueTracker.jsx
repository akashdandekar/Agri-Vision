import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Clock, Users, Sparkles, CheckCircle2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function LiveQueueTracker({ bookingId, onStatusChange }) {
  const { t } = useLanguage();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStatus = async () => {
    if (!bookingId) return;
    try {
      const res = await api.get(`/queue/status/${bookingId}`);
      if (res.data.success) {
        setQueueData(res.data.data);
        setLastUpdated(new Date());
        if (onStatusChange) {
          onStatusChange(res.data.data.queueStatus);
        }
      }
    } catch (err) {
      console.warn('Queue status sync warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Live update polling every 5 seconds as specified
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleSelfCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await api.post('/queue/checkin', { bookingId });
      if (res.data.success) {
        await fetchStatus();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading && !queueData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--primary-600)' }} />
        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--slate-500)' }}>
          Connecting to Live Queue Engine...
        </div>
      </div>
    );
  }

  if (!queueData) return null;

  const isCheckedIn = !['BOOKED', 'CANCELLED', 'NO_SHOW'].includes(queueData.queueStatus);
  const isTurn = queueData.peopleAhead === 0 || queueData.queueStatus === 'IN_PROGRESS';

  return (
    <div className="card" style={{ border: '2px solid var(--primary-100)', background: '#ffffff', position: 'relative' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--slate-800)' }}>
            Live Queue Radar
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'var(--slate-100)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            Auto-sync: 5s
          </span>
        </div>

        <button onClick={fetchStatus} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} title="Refresh Queue">
          <RefreshCw size={14} />
          <span>Sync</span>
        </button>
      </div>

      {/* Main KPI Queue Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Your Token */}
        <div style={{ background: 'var(--primary-50)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--primary-100)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-700)', textTransform: 'uppercase' }}>
            {t('token_no')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-800)', lineHeight: 1.1 }}>
            {queueData.farmerToken}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', marginTop: '0.2rem' }}>
            Your ID
          </div>
        </div>

        {/* Current Serving */}
        <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '12px', border: '1px solid #fef3c7' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-700)', textTransform: 'uppercase' }}>
            {t('current_token')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--amber-800)', lineHeight: 1.1 }}>
            {queueData.currentToken}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--amber-600)', marginTop: '0.2rem' }}>
            {queueData.counterAssigned ? `Counter #${queueData.counterAssigned}` : 'At Gate'}
          </div>
        </div>

        {/* People Ahead */}
        <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-600)', textTransform: 'uppercase' }}>
            {t('people_ahead')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: isTurn ? '#059669' : 'var(--slate-800)', lineHeight: 1.1 }}>
            {queueData.peopleAhead}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Farmers before you
          </div>
        </div>

        {/* AI Estimated Wait */}
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
            <Sparkles size={14} color="#16a34a" />
            <span>AI Wait Est.</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#166534', lineHeight: 1.1 }}>
            {queueData.estimatedWaitMinutes} <span style={{ fontSize: '1rem', fontWeight: 600 }}>mins</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#15803d', marginTop: '0.2rem' }}>
            AI confidence: {queueData.aiConfidence ? `${(queueData.aiConfidence * 100).toFixed(0)}%` : 'Active'}
          </div>
        </div>

      </div>

      {/* Queue Status Callout */}
      <div style={{
        padding: '1rem',
        borderRadius: '12px',
        background: isTurn ? '#ecfdf5' : '#f8fafc',
        border: isTurn ? '1.5px solid #10b981' : '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isTurn ? '#065f46' : 'var(--slate-800)' }}>
            Status: <span style={{ textTransform: 'uppercase' }}>{queueData.queueStatus.replace(/_/g, ' ')}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '0.15rem' }}>
            {queueData.queueStatus === 'BOOKED' && 'Please check in when you arrive at the procurement centre.'}
            {queueData.queueStatus === 'WAITING' && 'You are checked in. Please wait for your token to be called.'}
            {queueData.queueStatus === 'IN_PROGRESS' && `Please proceed immediately to Counter #${queueData.counterAssigned || 1}!`}
            {queueData.queueStatus === 'QUALITY_TESTING' && 'Crop quality assessment in progress.'}
            {queueData.queueStatus === 'PROCUREMENT' && 'Digital weighment & intake in progress.'}
            {queueData.queueStatus === 'COMPLETED' && 'Procurement finished. Payment processing.'}
          </div>
        </div>

        {/* Self Check-in button */}
        {!isCheckedIn && (
          <button
            onClick={handleSelfCheckIn}
            disabled={checkingIn}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.875rem' }}
          >
            <CheckCircle2 size={16} />
            <span>{checkingIn ? 'Checking in...' : t('check_in_btn')}</span>
          </button>
        )}
      </div>

    </div>
  );
}
