import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrencyINR } from '../../utils/unitConverter';
import Badge from '../../components/Badge';
import { CircleDollarSign, FileBadge, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export default function FarmerProcurement() {
  const { t } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, bookRes] = await api.all([
          api.get('/payments/my'),
          api.get('/bookings/my')
        ]);

        if (payRes.data.success) {
          setPayments(payRes.data.data);
        }
        if (bookRes.data.success) {
          setBookings(bookRes.data.data);
        }
      } catch (err) {
        console.warn('Procurement fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>{t('loading')}</div>;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          {t('procurement')} & DBT Statements
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          Inspect official crop quality test results, weighment receipts, and direct bank transfers
        </p>
      </div>

      {/* Procurement & Quality Records List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {bookings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
            No procurement records found. Complete a booking to see testing and payment details.
          </div>
        ) : (
          bookings.map(b => (
            <div key={b.id} className="card" style={{ borderLeft: '5px solid var(--primary-600)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                      {b.crop_name}
                    </span>
                    <span className="badge badge-info">{b.booking_reference}</span>
                    <span className="badge badge-success">Token {b.token_number}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                    Centre: {b.centre_name} &bull; Date: {b.booking_date} ({b.slot_display})
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Badge status={b.status} />
                </div>
              </div>

              {/* Three-column Workflow Inspection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                
                {/* 1. Quality Test Section */}
                <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                    <FileBadge size={18} color="var(--primary-600)" />
                    <span>Quality Testing</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Result Status:</span>
                    <Badge status={b.quality_status || 'PENDING'} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Grade Awarded:</span>
                    <strong>{b.quality_grade ? b.quality_grade.replace(/_/g, ' ') : 'Pending testing'}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '0.5rem' }}>
                    Standard: Permissible moisture ≤ 12%. Purity ≥ 98%.
                  </div>
                </div>

                {/* 2. Procurement Weighbridge Section */}
                <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={18} color="var(--primary-600)" />
                    <span>Digital Weighment</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Procured Weight:</span>
                    <strong>{b.net_procured_kg ? `${b.net_procured_kg} kg` : `${b.allocated_quantity_kg} kg (scheduled)`}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Procurement Status:</span>
                    <Badge status={b.procurement_status || 'PENDING'} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Valuation:</span>
                    <strong style={{ color: '#065f46' }}>
                      {b.total_procurement_value ? formatCurrencyINR(b.total_procurement_value) : 'Calculated post-test'}
                    </strong>
                  </div>
                </div>

                {/* 3. DBT Bank Payment Section */}
                <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                    <CircleDollarSign size={18} color="var(--primary-600)" />
                    <span>DBT Bank Transfer</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Payment Status:</span>
                    <Badge status={b.payment_status || 'PENDING'} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Amount:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#065f46' }}>
                      {b.payment_amount ? formatCurrencyINR(b.payment_amount) : 'Pending finalization'}
                    </strong>
                  </div>
                  {b.payment_reference && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.4rem', wordBreak: 'break-all' }}>
                      Ref: <code>{b.payment_reference}</code>
                    </div>
                  )}
                </div>

              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
