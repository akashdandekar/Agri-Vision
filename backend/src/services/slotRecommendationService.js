const { query } = require('../config/db');

/**
 * Smart Slot Allocation Algorithm
 * Analyzes centre load, slot utilization, crop perishability, and urgency
 * to recommend the most optimal booking slot for a farmer.
 */
async function recommendSlot({ centreId, bookingDate, produceQuantityKg, urgency = 'NORMAL', perishability = 'MEDIUM' }) {
  // 1. Get centre details
  const [centre] = await query(
    `SELECT * FROM procurement_centres WHERE id = ? AND status = 'ACTIVE'`,
    [centreId]
  );

  if (!centre) {
    throw new Error('Selected procurement centre is inactive or not found.');
  }

  // 2. Fetch all active slots for the centre
  const slots = await query(
    `SELECT * FROM centre_slots WHERE centre_id = ? AND is_active = 1 ORDER BY slot_start ASC`,
    [centreId]
  );

  if (slots.length === 0) {
    return {
      recommendedSlot: null,
      availableSlots: [],
      reason: 'No active slots configured for this procurement centre.'
    };
  }

  // 3. Query existing bookings for this centre on the requested date
  const existingBookings = await query(
    `SELECT slot_id, COUNT(*) as booked_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as booked_kg
     FROM bookings
     WHERE centre_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')
     GROUP BY slot_id`,
    [centreId, bookingDate]
  );

  const bookingMap = new Map();
  existingBookings.forEach(b => {
    bookingMap.set(b.slot_id, {
      bookedFarmers: parseInt(b.booked_farmers, 10),
      bookedKg: parseFloat(b.booked_kg)
    });
  });

  // 4. Calculate total centre daily utilization
  const totalBookedFarmers = existingBookings.reduce((sum, b) => sum + parseInt(b.booked_farmers, 10), 0);
  const totalBookedKg = existingBookings.reduce((sum, b) => sum + parseFloat(b.booked_kg), 0);

  const dailyFarmersRemaining = centre.max_farmers_per_day - totalBookedFarmers;
  const dailyKgRemaining = centre.max_produce_kg_per_day - totalBookedKg;

  if (dailyFarmersRemaining <= 0 || dailyKgRemaining < produceQuantityKg) {
    return {
      recommendedSlot: null,
      availableSlots: [],
      centreDailyFull: true,
      dailyFarmersRemaining: Math.max(0, dailyFarmersRemaining),
      dailyKgRemaining: Math.max(0, dailyKgRemaining),
      reason: 'Centre daily capacity is fully booked for this date.'
    };
  }

  // 5. Evaluate each slot
  const evaluatedSlots = slots.map(slot => {
    const usage = bookingMap.get(slot.id) || { bookedFarmers: 0, bookedKg: 0 };
    const farmersAvailable = slot.max_farmers - usage.bookedFarmers;
    const kgAvailable = slot.max_produce_kg - usage.bookedKg;

    const canAccommodate = farmersAvailable >= 1 && kgAvailable >= produceQuantityKg;

    // Slot score calculation:
    // Higher score = better match
    let score = 100;

    // Penalize congested slots to distribute workload evenly
    const congestionRatio = usage.bookedKg / slot.max_produce_kg;
    score -= congestionRatio * 40;

    // Time preference: Perishable or Urgent crops benefit from early morning intake
    const hourStart = parseInt(slot.slot_start.split(':')[0], 10);
    if (urgency === 'EMERGENCY' || perishability === 'HIGH') {
      // Prioritize morning slots (08:00 - 11:00)
      if (hourStart >= 8 && hourStart <= 10) score += 50;
      else if (hourStart > 10 && hourStart <= 12) score += 25;
      else score -= 20;
    } else if (urgency === 'URGENT') {
      if (hourStart >= 8 && hourStart <= 12) score += 30;
    } else {
      // Balanced midday / afternoon preference
      if (hourStart >= 10 && hourStart <= 14) score += 20;
    }

    return {
      slotId: slot.id,
      displayTime: slot.display_time,
      slotStart: slot.slot_start,
      slotEnd: slot.slot_end,
      maxFarmers: slot.max_farmers,
      maxProduceKg: slot.max_produce_kg,
      bookedFarmers: usage.bookedFarmers,
      bookedKg: usage.bookedKg,
      farmersAvailable: Math.max(0, farmersAvailable),
      kgAvailable: Math.max(0, kgAvailable),
      canAccommodate,
      score: canAccommodate ? score : -1
    };
  });

  const availableSlots = evaluatedSlots.filter(s => s.canAccommodate);
  availableSlots.sort((a, b) => b.score - a.score);

  const recommendedSlot = availableSlots.length > 0 ? availableSlots[0] : null;

  return {
    recommendedSlot,
    allSlots: evaluatedSlots,
    availableSlotsCount: availableSlots.length,
    dailyCapacity: {
      totalMaxFarmers: centre.max_farmers_per_day,
      totalMaxKg: centre.max_produce_kg_per_day,
      totalBookedFarmers,
      totalBookedKg,
      dailyFarmersRemaining: Math.max(0, dailyFarmersRemaining),
      dailyKgRemaining: Math.max(0, dailyKgRemaining)
    }
  };
}

module.exports = {
  recommendSlot
};
