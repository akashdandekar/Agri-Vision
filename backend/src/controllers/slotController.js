const { query } = require('../config/db');
const { recommendSlot } = require('../services/slotRecommendationService');

/**
 * Get available slots for a centre on a given date with capacity availability
 */
async function getCentreSlots(req, res, next) {
  try {
    const { centreId } = req.params;
    const { date, produceQuantityKg } = req.query;

    const targetDate = date || new Date().toISOString().split('T')[0];
    const qtyKg = produceQuantityKg ? parseFloat(produceQuantityKg) : 0;

    // Check centre exists
    const [centre] = await query('SELECT * FROM procurement_centres WHERE id = ?', [centreId]);
    if (!centre) {
      return res.status(404).json({ success: false, error: 'Procurement centre not found.' });
    }

    // Get all active slots
    const slots = await query(
      `SELECT * FROM centre_slots WHERE centre_id = ? AND is_active = 1 ORDER BY slot_start ASC`,
      [centreId]
    );

    // Calculate booked usage per slot on this date
    const bookings = await query(
      `SELECT slot_id, COUNT(*) as booked_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as booked_kg
       FROM bookings
       WHERE centre_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')
       GROUP BY slot_id`,
      [centreId, targetDate]
    );

    const bookingMap = new Map();
    let totalBookedFarmers = 0;
    let totalBookedKg = 0;

    bookings.forEach(b => {
      const bFarmers = parseInt(b.booked_farmers, 10);
      const bKg = parseFloat(b.booked_kg);
      bookingMap.set(b.slot_id, { bookedFarmers: bFarmers, bookedKg: bKg });
      totalBookedFarmers += bFarmers;
      totalBookedKg += bKg;
    });

    const dailyFarmersRemaining = Math.max(0, centre.max_farmers_per_day - totalBookedFarmers);
    const dailyKgRemaining = Math.max(0, centre.max_produce_kg_per_day - totalBookedKg);
    const isCentreFull = dailyFarmersRemaining <= 0 || (qtyKg > 0 && dailyKgRemaining < qtyKg);

    const enrichedSlots = slots.map(slot => {
      const usage = bookingMap.get(slot.id) || { bookedFarmers: 0, bookedKg: 0 };
      const farmersAvailable = Math.max(0, slot.max_farmers - usage.bookedFarmers);
      const kgAvailable = Math.max(0, slot.max_produce_kg - usage.bookedKg);

      const canAccommodate = !isCentreFull && farmersAvailable >= 1 && (qtyKg === 0 || kgAvailable >= qtyKg);

      return {
        id: slot.id,
        centreId: slot.centre_id,
        slotStart: slot.slot_start,
        slotEnd: slot.slot_end,
        displayTime: slot.display_time,
        maxFarmers: slot.max_farmers,
        maxProduceKg: slot.max_produce_kg,
        bookedFarmers: usage.bookedFarmers,
        bookedKg: usage.bookedKg,
        farmersAvailable,
        kgAvailable,
        canAccommodate
      };
    });

    return res.json({
      success: true,
      targetDate,
      centre: {
        id: centre.id,
        name: centre.name,
        code: centre.centre_code,
        dailyMaxFarmers: centre.max_farmers_per_day,
        dailyMaxKg: centre.max_produce_kg_per_day,
        totalBookedFarmers,
        totalBookedKg,
        dailyFarmersRemaining,
        dailyKgRemaining,
        isCentreFull
      },
      slots: enrichedSlots
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get Smart Slot Recommendation for farmer
 */
async function getSmartRecommendation(req, res, next) {
  try {
    const { centreId, date, produceQuantityKg, urgency = 'NORMAL', perishability = 'MEDIUM' } = req.query;

    if (!centreId || !date || !produceQuantityKg) {
      return res.status(400).json({
        success: false,
        error: 'Centre ID, date, and produce quantity in kg are required.'
      });
    }

    const recommendation = await recommendSlot({
      centreId: parseInt(centreId, 10),
      bookingDate: date,
      produceQuantityKg: parseFloat(produceQuantityKg),
      urgency,
      perishability
    });

    return res.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCentreSlots,
  getSmartRecommendation
};
