import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatTimeAmPm } from '../../utils/timeFormatter';
import { Building2, Plus, Edit2, Clock, Users, Wheat, AlertTriangle, ShieldCheck } from 'lucide-react';
import Badge from '../../components/Badge';

export default function AdminCentres() {
  const { t } = useLanguage();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);

  const [formData, setFormData] = useState({
    centreCode: '',
    name: '',
    location: '',
    district: '',
    state: 'Maharashtra',
    operatingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    openingTime: '08:00:00',
    closingTime: '18:00:00',
    slotDurationMinutes: 30,
    maxFarmersPerDay: 80,
    maxProduceKgPerDay: 20000,
    maxFarmersPerSlot: 8,
    maxProduceKgPerSlot: 2000,
    emergencyFarmerQuota: 10,
    emergencyProduceKgQuota: 2500,
    activeCounters: 3,
    avgProcessingMins: 15
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCentres = async () => {
    try {
      const res = await api.get('/centres?status=ALL');
      if (res.data.success) {
        setCentres(res.data.data);
      }
    } catch (err) {
      console.warn('Centres fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  const openAddModal = () => {
    setEditingCentre(null);
    setFormData({
      centreCode: '',
      name: '',
      location: '',
      district: '',
      state: 'Maharashtra',
      operatingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
      openingTime: '08:00:00',
      closingTime: '18:00:00',
      slotDurationMinutes: 30,
      maxFarmersPerDay: 80,
      maxProduceKgPerDay: 20000,
      maxFarmersPerSlot: 8,
      maxProduceKgPerSlot: 2000,
      emergencyFarmerQuota: 10,
      emergencyProduceKgQuota: 2500,
      activeCounters: 3,
      avgProcessingMins: 15
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingCentre(c);
    setFormData({
      centreCode: c.centre_code,
      name: c.name,
      location: c.location,
      district: c.district,
      state: c.state,
      operatingDays: c.operating_days,
      openingTime: c.opening_time,
      closingTime: c.closing_time,
      slotDurationMinutes: c.slot_duration_minutes,
      maxFarmersPerDay: c.max_farmers_per_day,
      maxProduceKgPerDay: c.max_produce_kg_per_day,
      maxFarmersPerSlot: c.max_farmers_per_slot,
      maxProduceKgPerSlot: c.max_produce_kg_per_slot,
      emergencyFarmerQuota: c.emergency_farmer_quota,
      emergencyProduceKgQuota: c.emergency_produce_kg_quota,
      activeCounters: c.active_counters,
      avgProcessingMins: c.avg_processing_mins
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingCentre) {
        const res = await api.put(`/centres/${editingCentre.id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          await fetchCentres();
        }
      } else {
        const res = await api.post('/centres', formData);
        if (res.data.success) {
          setShowModal(false);
          await fetchCentres();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save centre.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            Procurement Centre Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Configure operating hours, slot intervals, daily capacities, and emergency reserved quotas
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Centre</span>
        </button>
      </div>

      {/* Centres List Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {centres.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                      {c.name}
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                    📍 {c.location}, {c.district} ({c.state})
                  </div>
                </div>
                <span className="badge badge-info">{c.centre_code}</span>
              </div>

              <div style={{ background: 'var(--slate-50)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--slate-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                  <Clock size={15} color="var(--primary-600)" />
                  <span>Hours: <strong>{c.operating_hours_display || `${formatTimeAmPm(c.opening_time)} – ${formatTimeAmPm(c.closing_time)}`}</strong></span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Slot Interval: <strong>{c.slot_duration_minutes} mins</strong> &bull; Counters: <strong>{c.active_counters} active</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--primary-50)', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--primary-100)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--primary-700)', fontWeight: 700, textTransform: 'uppercase' }}>Daily Max Limits</div>
                  <div style={{ fontWeight: 800, color: 'var(--primary-800)', marginTop: '0.2rem' }}>
                    {c.max_farmers_per_day} farmers
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)' }}>
                    {parseFloat(c.max_produce_kg_per_day).toLocaleString('en-IN')} kg
                  </div>
                </div>

                <div style={{ background: '#fffbeb', padding: '0.65rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Emergency Quota</div>
                  <div style={{ fontWeight: 800, color: '#92400e', marginTop: '0.2rem' }}>
                    {c.emergency_farmer_quota} farmers
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                    {parseFloat(c.emergency_produce_kg_quota).toLocaleString('en-IN')} kg
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => openEditModal(c)}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <Edit2 size={15} />
              <span>Configure Centre & Capacities</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add / Edit Centre Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                {editingCentre ? `Edit ${editingCentre.name}` : 'Create Procurement Centre'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                &times;
              </button>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Centre Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. MH-PUN-02"
                    value={formData.centreCode}
                    onChange={(e) => setFormData({ ...formData, centreCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Centre Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Baramati APMC Mandi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Location Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Opening Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.openingTime}
                    onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Closing Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.closingTime}
                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Slot Duration (Mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.slotDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, slotDurationMinutes: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--slate-200)', margin: '1rem 0', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                  Capacity Limits (Farmers & Produce kg)
                </div>

                <div className="grid-4">
                  <div className="form-group">
                    <label className="form-label">Max Farmers/Day</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.maxFarmersPerDay}
                      onChange={(e) => setFormData({ ...formData, maxFarmersPerDay: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max kg/Day</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.maxProduceKgPerDay}
                      onChange={(e) => setFormData({ ...formData, maxProduceKgPerDay: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Farmers/Slot</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.maxFarmersPerSlot}
                      onChange={(e) => setFormData({ ...formData, maxFarmersPerSlot: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max kg/Slot</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.maxProduceKgPerSlot}
                      onChange={(e) => setFormData({ ...formData, maxProduceKgPerSlot: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Emergency Farmer Quota</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.emergencyFarmerQuota}
                      onChange={(e) => setFormData({ ...formData, emergencyFarmerQuota: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Produce kg Quota</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.emergencyProduceKgQuota}
                      onChange={(e) => setFormData({ ...formData, emergencyProduceKgQuota: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Active Counters</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.activeCounters}
                      onChange={(e) => setFormData({ ...formData, activeCounters: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
