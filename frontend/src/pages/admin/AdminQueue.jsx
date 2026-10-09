import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Badge from '../../components/Badge';
import {
  Clock,
  CheckCircle2,
  PhoneCall,
  UserX,
  RefreshCw,
  Building2,
  AlertTriangle,
  Megaphone,
  ArrowRight
} from 'lucide-react';

export default function AdminQueue() {
  const { t } = useLanguage();
  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [counterNumber, setCounterNumber] = useState(1);

  const fetchCentres = async () => {
    try {
      const res = await api.get('/centres');
      if (res.data.success) {
        setCentres(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedCentreId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error fetching centres:', err.message);
    }
  };

  const fetchQueue = async () => {
    if (!selectedCentreId) return;
    try {
      const res = await api.get(`/queue/centre/${selectedCentreId}`, {
        params: { date: targetDate }
      });
      if (res.data.success) {
        setQueueData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching queue:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    if (selectedCentreId) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 5000); // 5s live sync
      return () => clearInterval(interval);
    }
  }, [selectedCentreId, targetDate]);

  // Operations:
  const handleCheckIn = async (bookingId) => {
    setActionLoading(true);
    try {
      const res = await api.post('/queue/checkin', { bookingId });
      if (res.data.success) {
        await fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallNext = async (bookingId) => {
    setActionLoading(true);
    try {
      const res = await api.post('/queue/call-next', {
        bookingId,
        counterNumber: parseInt(counterNumber, 10) || 1
      });
      if (res.data.success) {
        await fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Call next failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNoShow = async (bookingId) => {
    if (!window.confirm('Mark this farmer as No-Show? This will release their produce back to available.')) return;
    setActionLoading(true);
    try {
      const res = await api.post('/queue/no-show', {
        bookingId,
        reason: 'Did not arrive at counter when called'
      });
      if (res.data.success) {
        await fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark no show');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            Live Mandi Queue & Token Controller
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Call farmers to counters, perform gate check-ins, and manage operational priority
          </p>
        </div>

        {/* Centre & Date Pickers */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={selectedCentreId}
            onChange={(e) => setSelectedCentreId(e.target.value)}
            style={{ width: 'auto' }}
          >
            {centres.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{ width: 'auto' }}
          />

          <button onClick={fetchQueue} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-700)', textTransform: 'uppercase' }}>Currently Serving</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--amber-800)', marginTop: '0.2rem' }}>
            {queueData?.summary.currentToken || 'None'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--amber-600)' }}>
            {queueData?.summary.currentlyServingCount || 0} active at counters
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Waiting at Mandi</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-800)', marginTop: '0.2rem' }}>
            {queueData?.summary.waitingCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Checked-in tokens</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Completed Today</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#065f46', marginTop: '0.2rem' }}>
            {queueData?.summary.completedCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Intakes processed</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Assign Counter</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Counter #:</span>
            <input
              type="number"
              min="1"
              max={queueData?.centre?.activeCounters || 6}
              value={counterNumber}
              onChange={(e) => setCounterNumber(e.target.value)}
              className="form-input"
              style={{ width: '70px', padding: '0.35rem 0.5rem' }}
            />
          </div>
        </div>
      </div>

      {/* Queue Token Management Table */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Priority Token</th>
                <th>Slot Time</th>
                <th>Farmer Name</th>
                <th>Crop & Weight</th>
                <th>Counter</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                    Loading queue roster...
                  </td>
                </tr>
              ) : queueData?.queue?.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                    No tokens booked for this centre on {targetDate}.
                  </td>
                </tr>
              ) : (
                queueData?.queue?.map(entry => {
                  const isCheckedIn = !['BOOKED', 'CANCELLED', 'NO_SHOW'].includes(entry.queue_status);
                  const isEmergency = entry.booking_type === 'EMERGENCY';

                  return (
                    <tr key={entry.queue_id} style={{ background: isEmergency ? '#fff1f2' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: isEmergency ? '#e11d48' : 'var(--primary-700)' }}>
                            {entry.token_number}
                          </span>
                          {isEmergency && (
                            <span className="badge badge-emergency" style={{ fontSize: '0.65rem' }}>
                              Priority
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{entry.slot_display}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{entry.farmer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{entry.farmer_phone}</div>
                      </td>
                      <td>
                        <div>{entry.crop_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontWeight: 600 }}>
                          {entry.allocated_quantity_kg} kg
                        </div>
                      </td>
                      <td>
                        {entry.counter_assigned ? (
                          <span className="badge badge-info">Counter #{entry.counter_assigned}</span>
                        ) : (
                          <span style={{ color: 'var(--slate-400)', fontSize: '0.8rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <Badge status={entry.queue_status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          
                          {/* Gate Check-in */}
                          {entry.queue_status === 'BOOKED' && (
                            <button
                              onClick={() => handleCheckIn(entry.booking_id)}
                              disabled={actionLoading}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                              title="Mark Farmer Checked-in"
                            >
                              <CheckCircle2 size={14} color="var(--primary-600)" />
                              <span>Check-In</span>
                            </button>
                          )}

                          {/* Call Next to Counter */}
                          {['WAITING', 'CHECKED_IN'].includes(entry.queue_status) && (
                            <button
                              onClick={() => handleCallNext(entry.booking_id)}
                              disabled={actionLoading}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                              title="Call to Counter"
                            >
                              <Megaphone size={14} />
                              <span>Call Next</span>
                            </button>
                          )}

                          {/* Mark No Show */}
                          {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(entry.queue_status) && (
                            <button
                              onClick={() => handleMarkNoShow(entry.booking_id)}
                              disabled={actionLoading}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.5rem', color: 'var(--danger-500)' }}
                              title="Mark No-Show"
                            >
                              <UserX size={14} />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
