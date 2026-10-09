import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Wheat, Plus, Trash2, Edit2, AlertCircle, Info, Calendar } from 'lucide-react';
import Badge from '../../components/Badge';

export default function FarmerProduce() {
  const { t } = useLanguage();
  const [produce, setProduce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    unit: 'quintal', // 'kg' or 'quintal'
    harvestDate: new Date().toISOString().split('T')[0],
    perishability: 'MEDIUM',
    urgency: 'NORMAL',
    description: ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProduce = async () => {
    try {
      const res = await api.get('/produce');
      if (res.data.success) {
        setProduce(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch produce:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduce();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      cropName: '',
      quantity: '',
      unit: 'quintal',
      harvestDate: new Date().toISOString().split('T')[0],
      perishability: 'MEDIUM',
      urgency: 'NORMAL',
      description: ''
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      cropName: item.crop_name,
      quantity: item.quantity_input,
      unit: item.unit,
      harvestDate: item.harvest_date,
      perishability: item.perishability,
      urgency: item.urgency,
      description: item.description || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this produce record?')) return;
    try {
      await api.delete(`/produce/${id}`);
      setProduce(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete produce.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingItem) {
        const res = await api.put(`/produce/${editingItem.id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          await fetchProduce();
        }
      } else {
        const res = await api.post('/produce', formData);
        if (res.data.success) {
          setShowModal(false);
          await fetchProduce();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save produce.');
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time quintal/kg calculation feedback
  const rawQty = parseFloat(formData.quantity) || 0;
  const normalizedKg = formData.unit === 'quintal' ? rawQty * 100 : rawQty;
  const normalizedQuintal = formData.unit === 'kg' ? (rawQty / 100).toFixed(2) : rawQty;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {t('my_produce')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Register your harvest yield in kilograms or quintals (1 quintal = 100 kg)
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>{t('add_produce')}</span>
        </button>
      </div>

      {/* Produce List Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>{t('crop_name')}</th>
              <th>Farmer Quantity</th>
              <th>Capacity Equivalent (kg)</th>
              <th>Harvest Date</th>
              <th>Perishability</th>
              <th>Urgency</th>
              <th>{t('status')}</th>
              <th style={{ textAlign: 'right' }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {produce.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                  No produce registered. Click "Add New Produce" to get started.
                </td>
              </tr>
            ) : (
              produce.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{item.crop_name}</div>
                    {item.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{item.description}</div>
                    )}
                  </td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: 'var(--slate-700)' }}>
                      {item.quantity_input} {item.unit}
                    </strong>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontWeight: 700 }}>
                      {item.quantity_kg} kg
                    </span>
                  </td>
                  <td>{item.harvest_date}</td>
                  <td>
                    <Badge status={item.perishability} type="perishability" />
                  </td>
                  <td>
                    <Badge status={item.urgency} type="urgency" />
                  </td>
                  <td>
                    <Badge status={item.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.status === 'AVAILABLE' ? (
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem' }}
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', color: 'var(--danger-500)' }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Locked ({item.status})</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Produce Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                {editingItem ? 'Edit Produce' : t('add_produce')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
              >
                &times;
              </button>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className="form-label">{t('crop_name')} *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sharbati Wheat, Soybean JS 335, Tomato"
                  value={formData.cropName}
                  onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
                  required
                />
              </div>

              {/* Quantity and Unit Selection */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{t('quantity')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Enter quantity amount"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('unit')} *</label>
                  <select
                    className="form-select"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="quintal">Quintal (q)</option>
                    <option value="kg">Kilogram (kg)</option>
                  </select>
                </div>
              </div>

              {/* Live Conversion Banner */}
              {rawQty > 0 && (
                <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} color="var(--primary-600)" />
                  <div>
                    Equivalent normalized capacity:{' '}
                    <strong>{normalizedKg.toLocaleString('en-IN')} kg</strong>{' '}
                    ({normalizedQuintal} quintal) &bull; Standard: 1 quintal = 100 kg
                  </div>
                </div>
              )}

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">{t('harvest_date')} *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('perishability')} *</label>
                  <select
                    className="form-select"
                    value={formData.perishability}
                    onChange={(e) => setFormData({ ...formData, perishability: e.target.value })}
                  >
                    <option value="LOW">Low (Grains, Pulses)</option>
                    <option value="MEDIUM">Medium (Oilseeds)</option>
                    <option value="HIGH">High (Tomatoes, Veggies)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('urgency')} *</label>
                  <select
                    className="form-select"
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency (Perishable)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('description')}</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  placeholder="Variety, moisture percentage, bagging details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Saving...' : t('save')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
