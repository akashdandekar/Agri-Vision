import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import LiveQueueTracker from '../../components/LiveQueueTracker';
import Badge from '../../components/Badge';
import { Clock, RefreshCw, AlertCircle, Building2, Ticket } from 'lucide-react';

export default function FarmerQueue() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(searchParams.get('bookingId') || '');
  const [centreQueue, setCentreQueue] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch farmer bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/bookings/my');
        if (res.data.success) {
          const activeList = res.data.data.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status));
          setBookings(activeList);
          if (!selectedBookingId && activeList.length > 0) {
            setSelectedBookingId(activeList[0].id);
          }
        }
      } catch (err) {
        console.warn('Error fetching bookings:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const selectedBooking = bookings.find(b => String(b.id) === String(selectedBookingId));

  // 2. Fetch full centre queue when selected booking changes
  const fetchCentreQueue = async () => {
    if (!selectedBooking) return;
    try {
      const res = await api.get(`/queue/centre/${selectedBooking.centre_id}`, {
        params: { date: selectedBooking.booking_date }
      });
      if (res.data.success) {
        setCentreQueue(res.data);
      }
    } catch (err) {
      console.warn('Centre queue error:', err.message);
    }
  };

  useEffect(() => {
    if (selectedBooking) {
      fetchCentreQueue();
      const interval = setInterval(fetchCentreQueue, 5000); // 5 second sync
      return () => clearInterval(interval);
    }
  }, [selectedBookingId, selectedBooking?.centre_id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>{t('loading')}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <Clock size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          No Active Queue Registrations
        </h3>
        <p style={{ color: 'var(--slate-500)', margin: '0.5rem 0 1.5rem 0' }}>
          You do not have any active bookings scheduled. Book a slot to start tracking live queues.
        </p>
        <button onClick={() => navigate('/farmer/booking')} className="btn btn-primary">
          {t('book_slot')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header & Booking Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {t('live_queue')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Real-time procurement queue with multi-factor AI wait time estimation
          </p>
        </div>

        {bookings.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-600)' }}>Select Booking:</span>
            <select
              className="form-select"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
            >
              {bookings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.crop_name} ({b.token_number}) - {b.centre_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Live Queue Radar Card */}
      {selectedBooking && (
        <div style={{ marginBottom: '2rem' }}>
          <LiveQueueTracker
            bookingId={selectedBooking.id}
            onStatusChange={() => fetchCentreQueue()}
          />
        </div>
      )}

      {/* Centre Today's Queue Board */}
      {centreQueue && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                Centre Queue Board: {centreQueue.centre.name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Showing active tokens in scheduled sequence &bull; Active counters: {centreQueue.centre.activeCounters}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-success">Serving: {centreQueue.summary.currentlyServingCount}</span>
              <span className="badge badge-warning">Waiting: {centreQueue.summary.waitingCount}</span>
              <span className="badge badge-info">Completed: {centreQueue.summary.completedCount}</span>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Token #</th>
                  <th>Slot Time (12-hr)</th>
                  <th>Farmer</th>
                  <th>Crop & Weight</th>
                  <th>Counter</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {centreQueue.queue.map(entry => {
                  const isMyToken = selectedBooking?.token_number === entry.token_number;

                  return (
                    <tr
                      key={entry.queue_id}
                      style={{
                        backgroundColor: isMyToken ? 'var(--primary-50)' : 'transparent',
                        fontWeight: isMyToken ? 700 : 400
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: isMyToken ? 'var(--primary-700)' : 'var(--slate-800)' }}>
                            {entry.token_number}
                          </span>
                          {entry.booking_type === 'EMERGENCY' && (
                            <span className="badge badge-emergency" style={{ fontSize: '0.65rem' }}>Priority</span>
                          )}
                          {isMyToken && (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>YOU</span>
                          )}
                        </div>
                      </td>
                      <td>{entry.slot_display}</td>
                      <td>{entry.farmer_name}</td>
                      <td>{entry.crop_name} ({entry.allocated_quantity_kg} kg)</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
