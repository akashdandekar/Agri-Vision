const { query, withTransaction } = require('../config/db');

/**
 * Format a 'HH:MM:SS' time into 12-hour AM/PM string (e.g. '09:00 AM')
 */
function formatTimeToAmPm(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12 AM
  const formattedHour = hours < 10 ? '0' + hours : hours;
  return `${formattedHour}:${minutes} ${ampm}`;
}

/**
 * Generates slot array based on start time, end time, and duration in minutes
 */
function generateCentreSlots(openingTime, closingTime, durationMins, maxFarmersSlot, maxKgSlot) {
  const slots = [];
  const [startH, startM] = openingTime.split(':').map(Number);
  const [endH, endM] = closingTime.split(':').map(Number);

  let currentMin = startH * 60 + startM;
  const endTotalMin = endH * 60 + endM;

  while (currentMin + durationMins <= endTotalMin) {
    const slotStartMin = currentMin;
    const slotEndMin = currentMin + durationMins;

    const sH = Math.floor(slotStartMin / 60);
    const sM = slotStartMin % 60;
    const eH = Math.floor(slotEndMin / 60);
    const eM = slotEndMin % 60;

    const startTimeStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`;
    const endTimeStr = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00`;

    const displayStart = formatTimeToAmPm(startTimeStr);
    const displayEnd = formatTimeToAmPm(endTimeStr);
    const displayTime = `${displayStart} – ${displayEnd}`;

    slots.push({
      slot_start: startTimeStr,
      slot_end: endTimeStr,
      display_time: displayTime,
      max_farmers: maxFarmersSlot,
      max_produce_kg: maxKgSlot
    });

    currentMin += durationMins;
  }

  return slots;
}

/**
 * List all procurement centres
 */
async function getCentres(req, res, next) {
  try {
    const { district, state, status = 'ACTIVE' } = req.query;

    let sql = 'SELECT * FROM procurement_centres WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (district) {
      sql += ' AND district LIKE ?';
      params.push(`%${district}%`);
    }
    if (state) {
      sql += ' AND state LIKE ?';
      params.push(`%${state}%`);
    }

    sql += ' ORDER BY name ASC';

    const centres = await query(sql, params);

    // Format display times for each centre
    const formatted = centres.map(c => ({
      ...c,
      opening_time_ampm: formatTimeToAmPm(c.opening_time),
      closing_time_ampm: formatTimeToAmPm(c.closing_time),
      operating_hours_display: `${formatTimeToAmPm(c.opening_time)} – ${formatTimeToAmPm(c.closing_time)}`
    }));

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single centre details with its slots and today's capacity usage
 */
async function getCentreById(req, res, next) {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [centre] = await query('SELECT * FROM procurement_centres WHERE id = ?', [id]);
    if (!centre) {
      return res.status(404).json({ success: false, error: 'Procurement centre not found.' });
    }

    // Get slots
    const slots = await query(
      'SELECT * FROM centre_slots WHERE centre_id = ? AND is_active = 1 ORDER BY slot_start ASC',
      [id]
    );

    // Calculate booked usage for targetDate
    const bookings = await query(
      `SELECT slot_id, COUNT(*) as booked_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as booked_kg
       FROM bookings
       WHERE centre_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')
       GROUP BY slot_id`,
      [id, targetDate]
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

    const enrichedSlots = slots.map(s => {
      const usage = bookingMap.get(s.id) || { bookedFarmers: 0, bookedKg: 0 };
      const farmersRemaining = Math.max(0, s.max_farmers - usage.bookedFarmers);
      const kgRemaining = Math.max(0, s.max_produce_kg - usage.bookedKg);

      return {
        ...s,
        booked_farmers: usage.bookedFarmers,
        booked_kg: usage.bookedKg,
        farmers_remaining: farmersRemaining,
        kg_remaining: kgRemaining,
        is_full: farmersRemaining === 0 || kgRemaining <= 0
      };
    });

    const dailyFarmersRemaining = Math.max(0, centre.max_farmers_per_day - totalBookedFarmers);
    const dailyKgRemaining = Math.max(0, centre.max_produce_kg_per_day - totalBookedKg);

    return res.json({
      success: true,
      data: {
        ...centre,
        opening_time_ampm: formatTimeToAmPm(centre.opening_time),
        closing_time_ampm: formatTimeToAmPm(centre.closing_time),
        operating_hours_display: `${formatTimeToAmPm(centre.opening_time)} – ${formatTimeToAmPm(centre.closing_time)}`,
        targetDate,
        dailyUsage: {
          totalBookedFarmers,
          totalBookedKg,
          dailyFarmersRemaining,
          dailyKgRemaining,
          isCentreFull: dailyFarmersRemaining === 0 || dailyKgRemaining <= 0,
          utilizationPercentage: centre.max_produce_kg_per_day > 0 ? ((totalBookedKg / centre.max_produce_kg_per_day) * 100).toFixed(1) : 0
        },
        slots: enrichedSlots
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Create new procurement centre and automatically generate slots
 */
async function adminCreateCentre(req, res, next) {
  try {
    const {
      centreCode,
      name,
      location,
      district,
      state,
      operatingDays = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
      openingTime = '08:00:00',
      closingTime = '18:00:00',
      slotDurationMinutes = 30,
      maxFarmersPerDay = 100,
      maxProduceKgPerDay = 25000,
      maxFarmersPerSlot = 10,
      maxProduceKgPerSlot = 2500,
      emergencyFarmerQuota = 15,
      emergencyProduceKgQuota = 3500,
      activeCounters = 3,
      avgProcessingMins = 15
    } = req.body;

    if (!centreCode || !name || !location || !district || !state) {
      return res.status(400).json({
        success: false,
        error: 'Centre code, name, location, district, and state are required.'
      });
    }

    const result = await withTransaction(async (conn) => {
      const [insertResult] = await conn.query(
        `INSERT INTO procurement_centres
         (centre_code, name, location, district, state, operating_days, opening_time, closing_time,
          slot_duration_minutes, max_farmers_per_day, max_produce_kg_per_day, max_farmers_per_slot,
          max_produce_kg_per_slot, emergency_farmer_quota, emergency_produce_kg_quota,
          active_counters, avg_processing_mins, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())`,
        [
          centreCode.trim().toUpperCase(),
          name.trim(),
          location.trim(),
          district.trim(),
          state.trim(),
          operatingDays,
          openingTime,
          closingTime,
          slotDurationMinutes,
          maxFarmersPerDay,
          maxProduceKgPerDay,
          maxFarmersPerSlot,
          maxProduceKgPerSlot,
          emergencyFarmerQuota,
          emergencyProduceKgQuota,
          activeCounters,
          avgProcessingMins
        ]
      );

      const centreId = insertResult.insertId;

      // Auto-generate slots
      const generatedSlots = generateCentreSlots(
        openingTime,
        closingTime,
        parseInt(slotDurationMinutes, 10),
        parseInt(maxFarmersPerSlot, 10),
        parseFloat(maxProduceKgPerSlot)
      );

      for (const slot of generatedSlots) {
        await conn.query(
          `INSERT INTO centre_slots (centre_id, slot_start, slot_end, display_time, max_farmers, max_produce_kg, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [centreId, slot.slot_start, slot.slot_end, slot.display_time, slot.max_farmers, slot.max_produce_kg]
        );
      }

      return centreId;
    });

    const [createdCentre] = await query('SELECT * FROM procurement_centres WHERE id = ?', [result]);

    return res.status(201).json({
      success: true,
      message: 'Procurement centre and slots created successfully.',
      data: createdCentre
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update existing procurement centre
 */
async function adminUpdateCentre(req, res, next) {
  try {
    const { id } = req.params;
    const [centre] = await query('SELECT * FROM procurement_centres WHERE id = ?', [id]);
    if (!centre) {
      return res.status(404).json({ success: false, error: 'Procurement centre not found.' });
    }

    const {
      name,
      location,
      district,
      state,
      operatingDays,
      openingTime,
      closingTime,
      slotDurationMinutes,
      maxFarmersPerDay,
      maxProduceKgPerDay,
      maxFarmersPerSlot,
      maxProduceKgPerSlot,
      emergencyFarmerQuota,
      emergencyProduceKgQuota,
      activeCounters,
      avgProcessingMins,
      status
    } = req.body;

    await query(
      `UPDATE procurement_centres
       SET name = COALESCE(?, name),
           location = COALESCE(?, location),
           district = COALESCE(?, district),
           state = COALESCE(?, state),
           operating_days = COALESCE(?, operating_days),
           opening_time = COALESCE(?, opening_time),
           closing_time = COALESCE(?, closing_time),
           slot_duration_minutes = COALESCE(?, slot_duration_minutes),
           max_farmers_per_day = COALESCE(?, max_farmers_per_day),
           max_produce_kg_per_day = COALESCE(?, max_produce_kg_per_day),
           max_farmers_per_slot = COALESCE(?, max_farmers_per_slot),
           max_produce_kg_per_slot = COALESCE(?, max_produce_kg_per_slot),
           emergency_farmer_quota = COALESCE(?, emergency_farmer_quota),
           emergency_produce_kg_quota = COALESCE(?, emergency_produce_kg_quota),
           active_counters = COALESCE(?, active_counters),
           avg_processing_mins = COALESCE(?, avg_processing_mins),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name, location, district, state, operatingDays, openingTime, closingTime,
        slotDurationMinutes, maxFarmersPerDay, maxProduceKgPerDay, maxFarmersPerSlot,
        maxProduceKgPerSlot, emergencyFarmerQuota, emergencyProduceKgQuota,
        activeCounters, avgProcessingMins, status, id
      ]
    );

    const [updated] = await query('SELECT * FROM procurement_centres WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Centre updated successfully.',
      data: updated
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  formatTimeToAmPm,
  getCentres,
  getCentreById,
  adminCreateCentre,
  adminUpdateCentre
};
