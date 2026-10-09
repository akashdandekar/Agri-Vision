import React from 'react';
import { formatTimeAmPm, formatDate } from '../utils/timeFormatter';
import { formatQuantityWithUnit } from '../utils/unitConverter';
import { Ticket, MapPin, Calendar, Clock, Wheat, CheckCircle2, ShieldAlert } from 'lucide-react';
import Badge from './Badge';

export default function TokenCard({ booking }) {
  if (!booking) return null;

  const isEmergency = booking.booking_type === 'EMERGENCY';

  return (
    <div className="digital-token-ticket" style={{
      background: isEmergency
        ? 'linear-gradient(135deg, #881337, #9f1239, #e11d48)'
        : 'linear-gradient(135deg, #064e3b, #047857, #059669)',
      boxShadow: isEmergency ? '0 10px 25px -5px rgba(225, 29, 72, 0.4)' : 'var(--shadow-emerald)'
    }}>
      {/* Perforated ticket edge top styling */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255, 255, 255, 0.3)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Ticket size={20} color="#fef08a" />
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)' }}>
              Official Digital Token Pass
            </span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
            {booking.booking_reference}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          {isEmergency ? (
            <span className="badge badge-emergency" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              🚨 Emergency Priority
            </span>
          ) : (
            <Badge status={booking.status} />
          )}
        </div>
      </div>

      {/* Main Token Hero Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 1.5rem 0' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Token Number
          </div>
          <div className="token-number-hero">
            {booking.token_number || 'T001'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Allocated Slot</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              {booking.slot_display || booking.display_time || '09:00 AM – 09:30 AM'}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(0, 0, 0, 0.15)', padding: '1rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BuildingPin />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>Centre</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{booking.centre_name}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} color="rgba(255,255,255,0.8)" />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>Date</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatDate(booking.booking_date)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wheat size={16} color="rgba(255,255,255,0.8)" />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>Crop & Quantity</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {booking.crop_name} ({booking.allocated_quantity_kg} kg)
            </div>
          </div>
        </div>
      </div>

      {/* Digital Verification Barcode Simulator */}
      <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle2 size={14} color="#34d399" />
          <span>Verified Mandi Slot Allocation</span>
        </div>
        <div style={{ letterSpacing: '0.25em', fontFamily: 'monospace', fontWeight: 700 }}>
          ||| |||| || ||||| |||| ||
        </div>
      </div>
    </div>
  );
}

function BuildingPin() {
  return <MapPin size={16} color="rgba(255,255,255,0.8)" />;
}
