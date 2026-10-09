import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Badge from '../../components/Badge';
import { FileBadge, CheckCircle2, XCircle, Search, Clock, AlertCircle } from 'lucide-react';

export default function AdminQuality() {
  const { t } = useLanguage();
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [testForm, setTestForm] = useState({
    status: 'PASSED',
    grade: 'GRADE_A',
    moisturePercentage: '10.5',
    foreignMatterPercentage: '0.4',
    remarks: 'Crop meets MSP FAQ quality specifications'
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await api.get('/admin/bookings', {
        params: { status: 'ALL' }
      });
      if (res.data.success) {
        // Filter bookings that are either in IN_PROGRESS, QUALITY_TESTING, or CHECKED_IN
        const candidates = res.data.data.filter(b =>
          ['IN_PROGRESS', 'QUALITY_TESTING', 'WAITING', 'CHECKED_IN'].includes(b.status)
        );
        setActiveBookings(candidates);
        if (candidates.length > 0 && !selectedBooking) {
          setSelectedBooking(candidates[0]);
        }
      }
    } catch (err) {
      console.warn('Quality fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStartTesting = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      await api.post('/quality/start', { bookingId: selectedBooking.id });
      setSuccessMsg(`Quality inspection started for Token ${selectedBooking.token_number}`);
      await fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start testing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      const res = await api.post('/quality/submit', {
        bookingId: selectedBooking.id,
        status: testForm.status,
        grade: testForm.status === 'REJECTED' ? 'REJECTED' : testForm.grade,
        moisturePercentage: parseFloat(testForm.moisturePercentage) || null,
        foreignMatterPercentage: parseFloat(testForm.foreignMatterPercentage) || null,
        remarks: testForm.remarks
      });

      if (res.data.success) {
        setSuccessMsg(`Quality test recorded as ${testForm.status}! Produce routed to next stage.`);
        setSelectedBooking(null);
        await fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit test result');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          Crop Quality Testing & Grading Terminal
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          Inspect moisture levels, foreign matter percentages, and issue Grade A/B/C certifications
        </p>
      </div>

      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left: Queue of Bookings Awaiting Quality Testing */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1rem' }}>
            Awaiting Quality Inspection ({activeBookings.length})
          </h3>

          {activeBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              No farmers currently waiting in queue for quality testing.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '550px', overflowY: 'auto' }}>
              {activeBookings.map(b => {
                const isSelected = selectedBooking?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedBooking(b); setSuccessMsg(''); }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                      background: isSelected ? 'var(--primary-50)' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                        {b.token_number}
                      </span>
                      <Badge status={b.status} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>
                      {b.farmer_name} &bull; {b.crop_name} ({b.allocated_quantity_kg} kg)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                      {b.centre_name} &bull; Slot: {b.slot_display}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Inspection Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1rem' }}>
            Quality Assessment Certificate
          </h3>

          {selectedBooking ? (
            <div>
              
              {/* Selected Candidate Info Banner */}
              <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--slate-200)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Token / Booking:</span>
                  <strong>{selectedBooking.token_number} ({selectedBooking.booking_reference})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Farmer:</span>
                  <strong>{selectedBooking.farmer_name} ({selectedBooking.farmer_phone})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Crop & Scheduled Weight:</span>
                  <strong>{selectedBooking.crop_name} ({selectedBooking.allocated_quantity_kg} kg)</strong>
                </div>
              </div>

              {selectedBooking.status !== 'QUALITY_TESTING' && (
                <button
                  type="button"
                  onClick={handleStartTesting}
                  disabled={submitting}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginBottom: '1.25rem' }}
                >
                  <Clock size={16} />
                  <span>Mark Testing in Progress (Notify Farmer)</span>
                </button>
              )}

              <form onSubmit={handleSubmitResult}>
                
                {/* Result Status: PASSED / REJECTED */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Inspection Verdict *</label>
                    <select
                      className="form-select"
                      value={testForm.status}
                      onChange={(e) => setTestForm({ ...testForm, status: e.target.value })}
                    >
                      <option value="PASSED">PASSED (Accept for Procurement)</option>
                      <option value="REJECTED">REJECTED (Does Not Meet Standards)</option>
                    </select>
                  </div>

                  {testForm.status === 'PASSED' && (
                    <div className="form-group">
                      <label className="form-label">Grade Certification *</label>
                      <select
                        className="form-select"
                        value={testForm.grade}
                        onChange={(e) => setTestForm({ ...testForm, grade: e.target.value })}
                      >
                        <option value="GRADE_A">Grade A (Premium)</option>
                        <option value="GRADE_B">Grade B (Standard MSP FAQ)</option>
                        <option value="GRADE_C">Grade C (Permissible Discount)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Moisture Content (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="e.g. 10.5"
                      value={testForm.moisturePercentage}
                      onChange={(e) => setTestForm({ ...testForm, moisturePercentage: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Foreign Matter (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="e.g. 0.4"
                      value={testForm.foreignMatterPercentage}
                      onChange={(e) => setTestForm({ ...testForm, foreignMatterPercentage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Inspector Remarks / Observation</label>
                  <textarea
                    rows="2"
                    className="form-textarea"
                    value={testForm.remarks}
                    onChange={(e) => setTestForm({ ...testForm, remarks: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={testForm.status === 'PASSED' ? 'btn btn-primary' : 'btn btn-danger'}
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  {submitting ? 'Recording...' : (testForm.status === 'PASSED' ? 'Pass & Route to Digital Weighbridge' : 'Reject Produce & Release Slot')}
                </button>

              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              Select a candidate token from the queue on the left to begin quality inspection.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
