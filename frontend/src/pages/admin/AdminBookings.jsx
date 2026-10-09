import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Badge from '../../components/Badge';
import { ListOrdered, Search, Filter, Calendar, Building2, Eye, ShieldAlert } from 'lucide-react';

export default function AdminBookings() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [centreFilter, setCentreFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Details Modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchCentres = async () => {
    try {
      const res = await api.get('/centres');
      if (res.data.success) {
        setCentres(res.data.data);
      }
    } catch (err) {
      console.warn('Error fetching centres:', err.message);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (centreFilter !== 'ALL') params.centreId = centreFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.bookingType = typeFilter;
      if (dateFilter) params.date = dateFilter;
      if (search) params.search = search;

      const res = await api.get('/admin/bookings', { params });
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.warn('Bookings error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [centreFilter, statusFilter, typeFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings();
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
          Mandi Booking Register
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          Inspect all scheduled, checked-in, and fulfilled bookings across procurement centres
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Search Farmer / Token</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--slate-400)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Name, phone, ref, token..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Centre Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Procurement Centre</label>
              <select
                className="form-select"
                value={centreFilter}
                onChange={(e) => setCentreFilter(e.target.value)}
              >
                <option value="ALL">All Centres</option>
                {centres.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Intake Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="BOOKED">BOOKED</option>
                <option value="CHECKED_IN">CHECKED_IN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="QUALITY_TESTING">QUALITY_TESTING</option>
                <option value="PROCUREMENT">PROCUREMENT</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </select>
            </div>

            {/* Booking Type Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Booking Type</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Types</option>
                <option value="REGULAR">Regular Allocation</option>
                <option value="EMERGENCY">Emergency Priority</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Apply Filters
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Booking Ref</th>
              <th>Date & Slot</th>
              <th>Farmer</th>
              <th>Phone</th>
              <th>Crop & Quantity</th>
              <th>Centre</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
                  No bookings found matching filters.
                </td>
              </tr>
            ) : (
              bookings.map(b => (
                <tr key={b.id}>
                  <td>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary-700)' }}>
                      {b.token_number || 'T--'}
                    </strong>
                  </td>
                  <td><code>{b.booking_reference}</code></td>
                  <td>
                    <div>{b.booking_date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{b.slot_display}</div>
                  </td>
                  <td><strong>{b.farmer_name}</strong></td>
                  <td>{b.farmer_phone}</td>
                  <td>
                    {b.crop_name} (<strong>{b.allocated_quantity_kg} kg</strong>)
                  </td>
                  <td>{b.centre_name}</td>
                  <td>
                    <Badge status={b.booking_type} type="urgency" />
                  </td>
                  <td>
                    <Badge status={b.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem' }}
                      title="Inspect Details"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                  Booking: {selectedBooking.booking_reference}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  Token Pass: <strong>{selectedBooking.token_number}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>Farmer</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.farmer_name}</div>
                <div>{selectedBooking.farmer_phone}</div>
              </div>
              <div>
                <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>Centre & Slot</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.centre_name}</div>
                <div>{selectedBooking.booking_date} ({selectedBooking.slot_display})</div>
              </div>
              <div>
                <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>Crop & Weight</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.crop_name}</div>
                <div>{selectedBooking.allocated_quantity_kg} kg ({selectedBooking.quantity_input} {selectedBooking.unit})</div>
              </div>
              <div>
                <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>Booking Type & Priority</div>
                <Badge status={selectedBooking.booking_type} type="urgency" />
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>Priority Score: {selectedBooking.priority_score}</div>
              </div>
            </div>

            <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Procurement & Payment Lifecycle:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Quality Inspection:</span>
                <Badge status={selectedBooking.quality_status || 'PENDING'} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Procurement Status:</span>
                <Badge status={selectedBooking.procurement_status || 'PENDING'} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>DBT Payment:</span>
                <Badge status={selectedBooking.payment_status || 'PENDING'} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
