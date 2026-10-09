const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Predicts estimated waiting time in minutes using Python AI service
 * Falls back safely to statistical model if service is unreachable
 */
async function predictWaitTime({
  farmersAhead = 0,
  avgProcessingMins = 15.0,
  activeCounters = 3,
  produceQuantityKg = 1000.0,
  urgency = 'NORMAL',
  perishability = 'MEDIUM',
  hourOfDay = new Date().getHours()
}) {
  const farmersAheadCount = Math.max(0, parseInt(farmersAhead, 10) || 0);
  const counters = Math.max(1, parseInt(activeCounters, 10) || 3);
  const avgMins = Math.max(5, parseFloat(avgProcessingMins) || 15.0);
  const produceKg = Math.max(50, parseFloat(produceQuantityKg) || 1000.0);

  // 1. Try communicating with Python AI service
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/predict`,
      {
        farmers_ahead: farmersAheadCount,
        avg_processing_mins: avgMins,
        active_counters: counters,
        produce_quantity_kg: produceKg,
        urgency,
        perishability,
        hour_of_day: hourOfDay
      },
      { timeout: 2500 }
    );

    if (response.data && response.data.status === 'success' && response.data.data) {
      return {
        estimatedWaitMinutes: response.data.data.estimated_wait_minutes,
        source: 'AI_MODEL',
        confidence: response.data.data.confidence_score,
        factors: response.data.data.factors
      };
    }
  } catch (error) {
    // Silent failover to statistical fallback as required by system spec
    // Never expose technical AI errors to the farmer
  }

  // 2. Statistical fallback formula
  let baseWait = (farmersAheadCount / counters) * avgMins;
  let qtyFactor = (produceKg / 1000.0) * 1.5;
  let isPeakHour = (hourOfDay >= 9 && hourOfDay <= 13) || (hourOfDay >= 15 && hourOfDay <= 17);
  let peakAdjustment = isPeakHour ? baseWait * 0.15 : 0;
  let emergencyBonus = (urgency === 'EMERGENCY' || perishability === 'HIGH') ? -0.25 * baseWait : 0;

  let calculatedWait = baseWait + qtyFactor + peakAdjustment + emergencyBonus;

  if (farmersAheadCount === 0) {
    calculatedWait = Math.min(5, Math.max(2, (produceKg / 2000.0) * 3));
  } else {
    calculatedWait = Math.max(3, calculatedWait);
  }

  const estimatedWaitMinutes = Math.max(1, Math.round(calculatedWait));

  return {
    estimatedWaitMinutes,
    source: 'STATISTICAL_FALLBACK',
    confidence: 0.85,
    factors: {
      farmers_ahead: farmersAheadCount,
      active_counters: counters,
      avg_processing_mins: avgMins,
      produce_quantity_kg: produceKg,
      is_peak_hour: isPeakHour,
      is_emergency_priority: (urgency === 'EMERGENCY' || perishability === 'HIGH')
    }
  };
}

module.exports = {
  predictWaitTime
};
