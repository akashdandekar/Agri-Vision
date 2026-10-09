import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrencyINR } from '../../utils/unitConverter';
import Badge from '../../components/Badge';
import { CircleDollarSign, CheckCircle2, Clock, AlertCircle, RefreshCw, Send } from 'lucide-react';

export default function AdminPayments() {
  const { t } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Update Form
  const [status, setStatus] = useState('PAID');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('DBT transfer credited directly to farmer Bank Account via PFMS');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPayments = async () => {
    try {
      // Query bookings and payments via admin bookings or payments endpoint
      const res = await api.get('/admin/bookings', { params: { status: 'ALL' } });
      if (res.data.success) {
        // Find bookings that have payment data
        const withPayments = res.data.data.filter(b => b.payment_status || b.procurement_status === 'COMPLETED');
        setPayments(withPayments);
      }
    } catch (err) {
      console.warn('Error fetching payments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const openUpdateModal = (item) => {
    setSelectedPayment(item);
    setStatus(item.payment_status === 'PENDING' ? 'PROCESSING' : 'PAID');
    setReferenceNumber(`DBT-KS-${Date.now().toString().slice(-8)}`);
    setRemarks('DBT settlement successfully credited via RBI NEFT/RTGS gateway');
    setSuccessMsg('');
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setSubmitting(true);

    try {
      // Get payment ID for this booking
      const payRes = await api.get(`/payments/booking/${selectedPayment.id}`);
      if (payRes.data.success && payRes.data.data) {
        const paymentId = payRes.data.data.id;

        await api.put(`/payments/${paymentId}/status`, {
          status,
          referenceNumber,
          remarks
        });

        setSuccessMsg(`Payment updated to ${status} for ${selectedPayment.farmer_name}! Farmer notified.`);
        setSelectedPayment(null);
        await fetchPayments();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            Direct Benefit Transfer (DBT) Clearing Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Verify procurement amounts, release DBT bank transactions, and monitor payment statuses
          </p>
        </div>

        <button onClick={fetchPayments} className="btn btn-secondary">
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {/* Payments List Table */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Farmer Name</th>
                <th>Phone</th>
                <th>Crop & Net Weight</th>
                <th>Payable Amount</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                    No procurement payments recorded yet. Complete procurement to generate DBT orders.
                  </td>
                </tr>
              ) : (
                payments.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div><code>{item.booking_reference}</code></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Token: <strong>{item.token_number}</strong></div>
                    </td>
                    <td><strong>{item.farmer_name}</strong></td>
                    <td>{item.farmer_phone}</td>
                    <td>{item.crop_name} ({item.allocated_quantity_kg} kg)</td>
                    <td>
                      <strong style={{ fontSize: '1.05rem', color: '#065f46' }}>
                        {item.payment_amount ? formatCurrencyINR(item.payment_amount) : (item.total_procurement_value ? formatCurrencyINR(item.total_procurement_value) : 'Pending')}
                      </strong>
                    </td>
                    <td>
                      <Badge status={item.payment_status || 'PENDING'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openUpdateModal(item)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Send size={13} />
                        <span>Update Status</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Payment Modal */}
      {selectedPayment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                Update DBT Payment Status
              </h3>
              <button onClick={() => setSelectedPayment(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                &times;
              </button>
            </div>

            <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--slate-200)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Farmer:</span>
                <strong>{selectedPayment.farmer_name} ({selectedPayment.farmer_phone})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Produce & Quantity:</span>
                <strong>{selectedPayment.crop_name} ({selectedPayment.allocated_quantity_kg} kg)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-500)' }}>Settlement Amount:</span>
                <strong style={{ color: '#065f46', fontSize: '1.1rem' }}>
                  {formatCurrencyINR(selectedPayment.payment_amount || selectedPayment.total_procurement_value || 0)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleUpdatePayment}>
              
              <div className="form-group">
                <label className="form-label">Payment Status *</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PROCESSING">PROCESSING (Banking Gateway In Flight)</option>
                  <option value="PAID">PAID (Credited Successfully via DBT)</option>
                  <option value="FAILED">FAILED (Account / IFSC Verification Issue)</option>
                  <option value="PENDING">PENDING (Awaiting Approval)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">DBT Transaction Reference ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Officer Remarks</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setSelectedPayment(null)} className="btn btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Updating...' : 'Commit Status & Send Notification'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
