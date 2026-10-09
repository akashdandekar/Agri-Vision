/**
 * 12-Hour AM/PM Time Formatter
 * Ensures all time displays strictly adhere to requirement:
 * 12-hour AM/PM format (e.g. '09:00 AM – 09:30 AM')
 */

export function formatTimeAmPm(timeStr) {
  if (!timeStr) return '';
  // If already in AM/PM format, return as is
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr;
  }

  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHour = hours < 10 ? '0' + hours : hours;
  return `${formattedHour}:${minutes} ${ampm}`;
}

export function formatSlotRangeAmPm(startStr, endStr) {
  if (!startStr || !endStr) return '';
  return `${formatTimeAmPm(startStr)} – ${formatTimeAmPm(endStr)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
