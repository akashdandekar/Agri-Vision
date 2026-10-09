import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrencyINR } from '../../utils/unitConverter';
import Badge from '../../components/Badge';
import { CheckCircle2, Scale, Calculator, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminProcurement() {
  const { t } = useLanguage();
  const [candidates, setCandidates] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Weighbridge Inputs
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [ratePerKg, setRatePerKg] = useState('48.92');
  const [notes, setNotes] = useState('Weighment certified at APMC Scale Bridge #1');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/admin/bookings', { params: { status: 'ALL' } });
      if (res.data.success) {
        // Bookings that have passed quality test and ready for procurement
        const list = res.data.data.filter(b =>
          b.status === 'PROCUREMENT' || (b.quality_status === 'PASSED' && b.status !== 'COMPLETED')
        );
        setCandidates(list);
        if (list.length > 0 && !selectedBooking) {
          setSelectedBooking(list[0]);
          setDefaultRate(list[0].crop_name);
        }
      }
    } catch (err) {
      console.warn('Error fetching candidates:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultRate = (cropName) => {
    const lower = cropName.toLowerCase();
    if (lower.includes('soybean')) setRatePerKg('48.92');
    else if (lower.includes('wheat')) setRatePerKg('24.25');
    else if (lower.includes('paddy') || lower.includes('rice')) setRatePerKg('23.00');
    else if (lower.includes('chana') || lower.includes('gram')) setRatePerKg('54.40');
    else if (lower.includes('tomato')) setRatePerKg('18.50');
    else setRatePerKg('45.00');
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleSelect = (b) => {
    setSelectedBooking(b);
    setDefaultRate(b.crop_name);
    setGrossWeight((parseFloat(b.allocated_quantity_kg) + 2100).toString());
    setTareWeight('2100');
    setSuccessMsg('');
  };

  // Weight calculations
  const gross = parseFloat(grossWeight) || 0;
  const tare = parseFloat(tareWeight) || 0;
  const netWeight = (gross > tare && tare > 0) ? (gross - tare) : (parseFloat(selectedBooking?.allocated_quantity_kg) || 0);
  const rate = parseFloat(ratePerKg) || 0;
  const totalAmount = netWeight * rate;

  const handleFinalizeProcurement = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSubmitting(true);

    try {
      const res = await api.post('/procurement/complete', {
        bookingId: selectedBooking.id,
        grossWeightKg: gross > 0 ? gross : null,
        tareWeightKg: tare > 0 ? tare : null,
        netProcuredKg: netWeight,
        ratePerKg: rate,
        notes
      });

      if (res.data.success) {
        setSuccessMsg(`Procurement completed for Token ${selectedBooking.token_number}! Amount: ${formatCurrencyINR(totalAmount)}. DBT payment queued.`);
        setSelectedBooking(null);
        await fetchCandidates();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete procurement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          Digital Weighbridge & Procurement Settlement
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          Final weighment verification, MSP valuation calculation, and digital DBT disbursement triggering
        </p>
      </div>

      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left: Candidate Queue */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1rem' }}>
            Ready for Weighment & Procurement ({candidates.length})
          </h3>

          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              No bookings currently awaiting procurement weighment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '550px', overflowY: 'auto' }}>
              {candidates.map(b => {
                const isSelected = selectedBooking?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelect(b)}
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
                      <span className="badge badge-success">Quality Passed</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>
                      {b.farmer_name} &bull; {b.crop_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                      Scheduled: <strong>{b.allocated_quantity_kg} kg</strong> &bull; {b.centre_name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Weighbridge Entry Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1rem' }}>
            Weighbridge Scale Certificate
          </h3>

          {selectedBooking ? (
            <form onSubmit={handleFinalizeProcurement}>
              
              {/* Farmer Info Callout */}
              <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--slate-200)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Token / Farmer:</span>
                  <strong>{selectedBooking.token_number} &bull; {selectedBooking.farmer_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Crop:</span>
                  <strong>{selectedBooking.crop_name} (Quality Grade: {selectedBooking.quality_grade || 'Grade A'})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Booking Scheduled:</span>
                  <strong>{selectedBooking.allocated_quantity_kg} kg</strong>
                </div>
              </div>

              {/* Weighbridge inputs */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Gross Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Vehicle + Produce (kg)"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tare Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Empty Vehicle (kg)"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Calculated Net Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={netWeight}
                    readOnly
                    style={{ background: '#f8fafc', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Procurement Rate (₹/kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Valuation Hero Callout */}
              <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1.5px solid #10b981', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Mandi Settlement Payable to Farmer
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#064e3b', lineHeight: 1.15, marginTop: '0.35rem' }}>
                  {formatCurrencyINR(totalAmount)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem' }}>
                  Calculated as {netWeight.toLocaleString('en-IN')} kg &times; ₹{rate}/kg
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Scale Notes / Weighment Bridge ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || netWeight <= 0}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
              >
                {submitting ? 'Finalizing Procurement...' : 'Complete Procurement & Issue DBT Order'}
              </button>

            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              Select a quality-passed token from the queue on the left to record digital weighment.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
