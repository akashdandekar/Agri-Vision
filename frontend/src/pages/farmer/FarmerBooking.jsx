import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatTimeAmPm } from '../../utils/timeFormatter';
import {
  CalendarCheck,
  Building2,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wheat,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import Badge from '../../components/Badge';

export default function FarmerBooking() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Master data
  const [produceList, setProduceList] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);

  // User selections
  const [selectedProduceId, setSelectedProduceId] = useState('');
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    // Tomorrow or today
    return new Date().toISOString().split('T')[0];
  });

  // Slot and capacity details
  const [slotsData, setSlotsData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [fetchingSlots, setFetchingSlots] = useState(false);

  // Emergency booking state
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Fetch initial produce and centres
  useEffect(() => {
    const initData = async () => {
      try {
        const [prodRes, cenRes] = await api.all([
          api.get('/produce'),
          api.get('/centres')
        ]);

        if (prodRes.data.success) {
          const available = prodRes.data.data.filter(p => p.status === 'AVAILABLE');
          setProduceList(available);
          if (available.length > 0) {
            setSelectedProduceId(available[0].id);
          }
        }
        if (cenRes.data.success) {
          setCentres(cenRes.data.data);
          if (cenRes.data.data.length > 0) {
            setSelectedCentreId(cenRes.data.data[0].id);
          }
        }
      } catch (err) {
        console.warn('Initialization error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Fetch slots and smart recommendation when centre, date, or produce changes
  useEffect(() => {
    if (!selectedCentreId || !bookingDate) return;

    const selectedProduce = produceList.find(p => String(p.id) === String(selectedProduceId));
    const qtyKg = selectedProduce ? selectedProduce.quantity_kg : 1000;

    const fetchSlotsAndRecommendation = async () => {
      setFetchingSlots(true);
      setError('');
      try {
        // 1. Fetch all slots with remaining capacity
        const slotsRes = await api.get(`/slots/centre/${selectedCentreId}`, {
          params: { date: bookingDate, produceQuantityKg: qtyKg }
        });

        if (slotsRes.data.success) {
          setSlotsData(slotsRes.data);
        }

        // 2. Fetch smart slot recommendation
        if (selectedProduce) {
          const recRes = await api.get('/slots/recommend', {
            params: {
              centreId: selectedCentreId,
              date: bookingDate,
              produceQuantityKg: qtyKg,
              urgency: selectedProduce.urgency,
              perishability: selectedProduce.perishability
            }
          });

          if (recRes.data.success && recRes.data.data) {
            setRecommendation(recRes.data.data);
            if (recRes.data.data.recommendedSlot) {
              setSelectedSlotId(recRes.data.data.recommendedSlot.slotId);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching slots:', err.message);
      } finally {
        setFetchingSlots(false);
      }
    };

    fetchSlotsAndRecommendation();
  }, [selectedCentreId, bookingDate, selectedProduceId]);

  const selectedProduce = produceList.find(p => String(p.id) === String(selectedProduceId));
  const selectedCentre = centres.find(c => String(c.id) === String(selectedCentreId));

  // Determine emergency eligibility
  const isEmergencyEligible = selectedProduce && (
    selectedProduce.perishability === 'HIGH' &&
    (selectedProduce.urgency === 'EMERGENCY' || selectedProduce.urgency === 'URGENT')
  );

  const handleBooking = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isEmergencyMode) {
        // Emergency booking endpoint
        const res = await api.post('/bookings/emergency', {
          produceId: selectedProduceId,
          centreId: selectedCentreId,
          bookingDate,
          reason: emergencyReason || 'Perishable produce emergency allocation'
        });

        if (res.data.success) {
          setBookingSuccess(res.data.data);
        }
      } else {
        // Regular booking endpoint
        if (!selectedSlotId) {
          setError('Please select an available time slot.');
          setSubmitting(false);
          return;
        }

        const res = await api.post('/bookings/regular', {
          produceId: selectedProduceId,
          centreId: selectedCentreId,
          slotId: selectedSlotId,
          bookingDate
        });

        if (res.data.success) {
          setBookingSuccess(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>{t('loading')}</div>;
  }

  // Booking Confirmation View
  if (bookingSuccess) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '0 1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', borderTop: '5px solid var(--primary-600)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            Booking Confirmed!
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--slate-600)', margin: '0.5rem 0 1.5rem 0' }}>
            Your digital procurement pass has been generated and locked in permanent storage.
          </p>

          <div style={{ background: 'var(--slate-50)', padding: '1.25rem', borderRadius: '12px', textAlign: 'left', marginBottom: '2rem', border: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>Digital Token</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--primary-700)' }}>{bookingSuccess.tokenNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>Booking Reference</span>
              <strong style={{ fontSize: '0.9rem' }}>{bookingSuccess.bookingRef}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>Procurement Centre</span>
              <strong style={{ fontSize: '0.9rem' }}>{bookingSuccess.centreName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>Time Slot (12-hr AM/PM)</span>
              <strong style={{ fontSize: '0.9rem' }}>{bookingSuccess.slotDisplay}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>Crop Quantity</span>
              <strong style={{ fontSize: '0.9rem' }}>{bookingSuccess.cropName} ({bookingSuccess.quantityKg} kg)</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/farmer/dashboard')}
              className="btn btn-primary"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate(`/farmer/queue?bookingId=${bookingSuccess.bookingId}`)}
              className="btn btn-secondary"
            >
              Track Live Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          {t('book_slot')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          Schedule mandi intake with capacity balancing and smart waiting-time allocation
        </p>
      </div>

      {produceList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Wheat size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-700)' }}>
            No Available Produce Found
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: '0.5rem 0 1.5rem 0' }}>
            Please add your harvest produce first before booking a procurement slot.
          </p>
          <button onClick={() => navigate('/farmer/produce')} className="btn btn-primary">
            Go to My Produce
          </button>
        </div>
      ) : (
        <form onSubmit={handleBooking}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Left Card: Produce & Centre Selection */}
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1.25rem' }}>
                1. Select Produce & Location
              </h3>

              {/* Crop Selector */}
              <div className="form-group">
                <label className="form-label">{t('crop_name')} *</label>
                <select
                  className="form-select"
                  value={selectedProduceId}
                  onChange={(e) => setSelectedProduceId(e.target.value)}
                  required
                >
                  {produceList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.crop_name} - {p.quantity_input} {p.unit} ({p.quantity_kg} kg) [{p.perishability} Perishability]
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduce && (
                <div style={{ background: 'var(--slate-50)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--slate-200)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Weight normalized:</span>
                    <strong>{selectedProduce.quantity_kg} kg ({selectedProduce.quantity_input} {selectedProduce.unit})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Crop Urgency:</span>
                    <Badge status={selectedProduce.urgency} type="urgency" />
                  </div>
                </div>
              )}

              {/* Centre Selector */}
              <div className="form-group">
                <label className="form-label">{t('select_centre')} *</label>
                <select
                  className="form-select"
                  value={selectedCentreId}
                  onChange={(e) => setSelectedCentreId(e.target.value)}
                  required
                >
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district}, {c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selector */}
              <div className="form-group">
                <label className="form-label">{t('select_date')} *</label>
                <input
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              {/* Centre Capacity Visualizer */}
              {slotsData?.centre && (
                <div style={{ background: 'var(--primary-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--primary-100)', marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Centre Capacity on {bookingDate}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-600)' }}>Farmers Remaining:</span>
                    <strong>{slotsData.centre.dailyFarmersRemaining} / {slotsData.centre.dailyMaxFarmers} farmers</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--slate-600)' }}>Produce Remaining:</span>
                    <strong>{slotsData.centre.dailyKgRemaining.toLocaleString('en-IN')} / {slotsData.centre.dailyMaxKg.toLocaleString('en-IN')} kg</strong>
                  </div>
                </div>
              )}

            </div>

            {/* Right Card: Smart Recommendation & Slot Selection */}
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1.25rem' }}>
                2. Time Window (12-Hour AM/PM)
              </h3>

              {/* Smart Slot Recommendation Banner */}
              {recommendation?.recommendedSlot && !isEmergencyMode && (
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                  border: '1.5px solid #10b981',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('smart_recommendation')}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                      {recommendation.recommendedSlot.displayTime}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                      Optimal intake throughput &bull; Balanced counter capacity
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotId(recommendation.recommendedSlot.slotId)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    Select
                  </button>
                </div>
              )}

              {/* Slot Grid Selection */}
              <label className="form-label">{t('select_slot')}</label>
              
              {fetchingSlots ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>
                  Loading available time slots...
                </div>
              ) : slotsData?.slots?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger-500)' }}>
                  No operational slots configured for this date.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.65rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {slotsData?.slots?.map(slot => {
                    const isSelected = String(slot.id) === String(selectedSlotId);
                    const isRecommended = recommendation?.recommendedSlot?.slotId === slot.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.canAccommodate || isEmergencyMode}
                        onClick={() => setSelectedSlotId(slot.id)}
                        style={{
                          padding: '0.75rem 0.5rem',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                          background: isSelected ? 'var(--primary-50)' : (slot.canAccommodate ? '#ffffff' : '#f1f5f9'),
                          color: slot.canAccommodate ? 'var(--slate-800)' : '#94a3b8',
                          cursor: slot.canAccommodate && !isEmergencyMode ? 'pointer' : 'not-allowed',
                          textAlign: 'center',
                          position: 'relative',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isRecommended && (
                          <span style={{ position: 'absolute', top: '-6px', right: '4px', background: '#059669', color: '#fff', fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                            BEST
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {slot.displayTime}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: slot.canAccommodate ? 'var(--slate-500)' : 'var(--danger-500)', marginTop: '0.2rem' }}>
                          {slot.canAccommodate ? `${slot.farmersAvailable} slots left` : 'FULL'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Emergency Booking Accordion / Option */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--slate-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} color={isEmergencyEligible ? '#f43f5e' : 'var(--slate-400)'} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isEmergencyEligible ? '#9f1239' : 'var(--slate-600)' }}>
                      {t('emergency_booking')}
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    id="emergencyToggle"
                    checked={isEmergencyMode}
                    disabled={!isEmergencyEligible}
                    onChange={(e) => setIsEmergencyMode(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: isEmergencyEligible ? 'pointer' : 'not-allowed' }}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', lineHeight: 1.4 }}>
                  {t('emergency_disclaimer')}
                  {!isEmergencyEligible && (
                    <span style={{ color: 'var(--amber-700)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                      ⚠️ Currently selected produce does not qualify for Emergency Quota (requires High Perishability and Emergency Urgency).
                    </span>
                  )}
                </div>

                {isEmergencyMode && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <textarea
                      rows="2"
                      className="form-textarea"
                      placeholder="Specify emergency reason (e.g. Ripe tomato harvest prone to decay within 24 hours)..."
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

            </div>

          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Submission Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => navigate('/farmer/dashboard')}
              className="btn btn-secondary"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || (!selectedSlotId && !isEmergencyMode)}
              className={isEmergencyMode ? 'btn btn-amber' : 'btn btn-primary'}
              style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
            >
              {submitting ? 'Allocating Slot...' : (isEmergencyMode ? 'Confirm Emergency Priority Booking' : t('confirm'))}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
