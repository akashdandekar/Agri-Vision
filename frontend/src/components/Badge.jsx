import React from 'react';

export default function Badge({ status, type }) {
  if (!status) return null;

  let badgeClass = 'badge badge-info';
  let label = status.replace(/_/g, ' ');

  if (type === 'urgency') {
    if (status === 'EMERGENCY') {
      return <span className="badge badge-emergency">🚨 Emergency</span>;
    }
    if (status === 'URGENT') {
      return <span className="badge badge-warning">⚡ Urgent</span>;
    }
    return <span className="badge badge-info">Normal</span>;
  }

  if (type === 'perishability') {
    if (status === 'HIGH') return <span className="badge badge-emergency">High Perishability</span>;
    if (status === 'MEDIUM') return <span className="badge badge-warning">Medium Perishability</span>;
    return <span className="badge badge-success">Low Perishability</span>;
  }

  // Booking & Queue Status
  switch (status) {
    case 'BOOKED':
      badgeClass = 'badge badge-info';
      break;
    case 'CHECKED_IN':
    case 'WAITING':
      badgeClass = 'badge badge-warning';
      break;
    case 'IN_PROGRESS':
    case 'QUALITY_TESTING':
    case 'PROCUREMENT':
      badgeClass = 'badge badge-info';
      break;
    case 'COMPLETED':
    case 'PASSED':
    case 'PAID':
      badgeClass = 'badge badge-success';
      break;
    case 'CANCELLED':
    case 'REJECTED':
    case 'NO_SHOW':
    case 'FAILED':
      badgeClass = 'badge badge-danger';
      break;
    case 'EMERGENCY':
      badgeClass = 'badge badge-emergency';
      break;
    default:
      badgeClass = 'badge badge-info';
  }

  return (
    <span className={badgeClass}>
      {label}
    </span>
  );
}
