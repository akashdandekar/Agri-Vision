/**
 * Agricultural Quantity and Unit Conversion Utility
 * Standard Rule: 1 quintal = 100 kg
 */

export function convertToKg(quantity, unit) {
  const num = parseFloat(quantity) || 0;
  if (unit && unit.toLowerCase() === 'quintal') {
    return num * 100;
  }
  return num;
}

export function convertKgToQuintal(kg) {
  const num = parseFloat(kg) || 0;
  return num / 100;
}

export function formatQuantityWithUnit(quantity, unit) {
  const num = parseFloat(quantity) || 0;
  const cleanUnit = (unit && unit.toLowerCase() === 'kg') ? 'kg' : 'quintal';
  
  if (cleanUnit === 'quintal') {
    return `${num.toLocaleString('en-IN')} quintal (${(num * 100).toLocaleString('en-IN')} kg)`;
  }
  return `${num.toLocaleString('en-IN')} kg (${(num / 100).toFixed(2)} quintal)`;
}

export function formatCurrencyINR(amount) {
  const num = parseFloat(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
