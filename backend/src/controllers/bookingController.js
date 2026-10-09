const { query, withTransaction } = require('../config/db');
const { createNotification } = require('../services/notificationService');

/**
 * Generate sequential token string: e.g. T001, T002, T003...
 */
function formatTokenNumber(sequence) {
  return `T${String(sequence).padStart(3, '0')}`;
}

/**
 * Generate unique booking reference: e.g. KS-2026-PUN-XXXXX
 */
function generateBookingReference(centreCode) {
  const year = new Date().getFullYear();
  const cleanCode = (centreCode || 'CEN').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `KS-${year}-${cleanCode}-${rand}`;
}

/**
 * Create Regular Booking (Atomic MySQL Transaction with Row Locks)
 */
async function createRegularBooking(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    const userId = req.user.id;

    if (!farmerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Farmer profile required.' });
    }

    const { produceId, centreId, slotId, bookingDate } = req.body;

    if (!produceId || !centreId || !slotId || !bookingDate) {
      return res.status(400).json({
        success: false,
        error: 'Produce ID, Centre ID, Slot ID, and Booking Date are required.'
      });
    }

    // Date validation (must not be past date)
    const todayStr = new Date().toISOString().split('T')[0];
    if (bookingDate < todayStr) {
      return res.status(400).json({
        success: false,
        error: 'Cannot book slots for a past date.'
      });
    }

    // Execute atomic booking transaction
    const bookingResult = await withTransaction(async (conn) => {
      // 1. Validate farmer's produce
      const [produceRows] = await conn.query(
        'SELECT * FROM farmer_produce WHERE id = ? AND farmer_id = ? FOR UPDATE',
        [produceId, farmerId]
      );

      if (produceRows.length === 0) {
        throw { statusCode: 404, message: 'Selected produce not found or does not belong to you.', isOperational: true };
      }

      const produce = produceRows[0];
      if (produce.status !== 'AVAILABLE') {
        throw { statusCode: 400, message: `This produce is already marked as ${produce.status.toLowerCase()}.`, isOperational: true };
      }

      const produceKg = parseFloat(produce.quantity_kg);
      if (produceKg <= 0) {
        throw { statusCode: 400, message: 'Invalid produce quantity.', isOperational: true };
      }

      // 2. Lock and validate Centre
      const [centreRows] = await conn.query(
        'SELECT * FROM procurement_centres WHERE id = ? FOR UPDATE',
        [centreId]
      );

      if (centreRows.length === 0) {
        throw { statusCode: 404, message: 'Procurement centre not found.', isOperational: true };
      }

      const centre = centreRows[0];
      if (centre.status !== 'ACTIVE') {
        throw { statusCode: 400, message: 'Selected procurement centre is currently inactive or undergoing maintenance.', isOperational: true };
      }

      // 3. Verify Centre Operating Days
      const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDayName = dayOfWeekNames[new Date(bookingDate).getUTCDay()];
      const operatingDays = centre.operating_days.split(',').map(d => d.trim());
      if (!operatingDays.includes(targetDayName)) {
        throw { statusCode: 400, message: `The centre is closed on ${targetDayName}s. Operating days: ${centre.operating_days}`, isOperational: true };
      }

      // 4. Check Duplicate/Conflicting Active Booking for Farmer on same date
      const [existingActive] = await conn.query(
        `SELECT id, booking_reference FROM bookings
         WHERE farmer_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [farmerId, bookingDate]
      );

      if (existingActive.length > 0) {
        throw {
          statusCode: 409,
          message: `You already have an active booking (${existingActive[0].booking_reference}) on ${bookingDate}. Only one active procurement slot allowed per date.`,
          isOperational: true
        };
      }

      // 5. Lock and validate Slot
      const [slotRows] = await conn.query(
        'SELECT * FROM centre_slots WHERE id = ? AND centre_id = ? AND is_active = 1 FOR UPDATE',
        [slotId, centreId]
      );

      if (slotRows.length === 0) {
        throw { statusCode: 404, message: 'Requested slot not found or inactive for this centre.', isOperational: true };
      }

      const slot = slotRows[0];

      // 6. Check Overall Centre Daily Capacity (both farmer count & produce kg)
      const [dailyBookings] = await conn.query(
        `SELECT COUNT(*) as total_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as total_kg
         FROM bookings
         WHERE centre_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [centreId, bookingDate]
      );

      const currentDailyFarmers = parseInt(dailyBookings[0].total_farmers, 10);
      const currentDailyKg = parseFloat(dailyBookings[0].total_kg);

      // Total daily limit check
      if (currentDailyFarmers + 1 > centre.max_farmers_per_day) {
        throw { statusCode: 422, message: 'Centre daily farmer capacity limit reached for this date.', isOperational: true };
      }

      if (currentDailyKg + produceKg > parseFloat(centre.max_produce_kg_per_day)) {
        throw {
          statusCode: 422,
          message: `Centre daily produce capacity reached. Available: ${(centre.max_produce_kg_per_day - currentDailyKg).toFixed(1)} kg, requested: ${produceKg} kg.`,
          isOperational: true
        };
      }

      // 7. Check Slot-level Capacity (both farmer count & produce kg)
      const [slotBookings] = await conn.query(
        `SELECT COUNT(*) as slot_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as slot_kg
         FROM bookings
         WHERE slot_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [slotId, bookingDate]
      );

      const currentSlotFarmers = parseInt(slotBookings[0].slot_farmers, 10);
      const currentSlotKg = parseFloat(slotBookings[0].slot_kg);

      if (currentSlotFarmers + 1 > slot.max_farmers) {
        throw { statusCode: 422, message: 'This time slot is full (maximum farmer limit reached). Please select another slot.', isOperational: true };
      }

      if (currentSlotKg + produceKg > parseFloat(slot.max_produce_kg)) {
        throw {
          statusCode: 422,
          message: `This time slot cannot accommodate ${produceKg} kg. Remaining slot capacity: ${(slot.max_produce_kg - currentSlotKg).toFixed(1)} kg.`,
          isOperational: true
        };
      }

      // 8. Generate Digital Token sequence for the centre on this date
      const [maxTokenRow] = await conn.query(
        `SELECT COALESCE(MAX(sequence_number), 0) as max_seq
         FROM tokens
         WHERE centre_id = ? AND procurement_date = ?`,
        [centreId, bookingDate]
      );

      const nextSequence = parseInt(maxTokenRow[0].max_seq, 10) + 1;
      const tokenNumber = formatTokenNumber(nextSequence);
      const bookingRef = generateBookingReference(centre.centre_code);

      // 9. Insert Booking record
      const [insertBooking] = await conn.query(
        `INSERT INTO bookings
         (booking_reference, farmer_id, produce_id, centre_id, slot_id, booking_date, allocated_quantity_kg, booking_type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'REGULAR', 'BOOKED', NOW())`,
        [bookingRef, farmerId, produceId, centreId, slotId, bookingDate, produceKg]
      );

      const bookingId = insertBooking.insertId;

      // 10. Update Produce status to BOOKED
      await conn.query('UPDATE farmer_produce SET status = "BOOKED" WHERE id = ?', [produceId]);

      // 11. Insert Token record
      const [insertToken] = await conn.query(
        `INSERT INTO tokens (booking_id, centre_id, procurement_date, token_number, sequence_number, priority_score, created_at)
         VALUES (?, ?, ?, ?, ?, 100, NOW())`,
        [bookingId, centreId, bookingDate, tokenNumber, nextSequence]
      );

      const tokenId = insertToken.insertId;

      // 12. Insert Queue Entry
      await conn.query(
        `INSERT INTO queue_entries (booking_id, centre_id, token_id, procurement_date, status, estimated_wait_minutes, updated_at)
         VALUES (?, ?, ?, ?, 'BOOKED', 0, NOW())`,
        [bookingId, centreId, tokenId, bookingDate]
      );

      return {
        bookingId,
        bookingRef,
        tokenNumber,
        sequenceNumber: nextSequence,
        centreName: centre.name,
        slotDisplay: slot.display_time,
        bookingDate,
        quantityKg: produceKg,
        cropName: produce.crop_name,
        bookingType: 'REGULAR'
      };
    });

    // Send persistent notification to farmer
    await createNotification({
      userId,
      title: 'Booking Confirmed!',
      message: `Your slot at ${bookingResult.centreName} for ${bookingResult.cropName} (${bookingResult.quantityKg} kg) is confirmed. Token: ${bookingResult.tokenNumber} | Time: ${bookingResult.slotDisplay}`,
      type: 'BOOKING_SUCCESS',
      metadata: { bookingId: bookingResult.bookingId, token: bookingResult.tokenNumber }
    });

    return res.status(201).json({
      success: true,
      message: 'Slot booked successfully! Digital token generated.',
      data: bookingResult
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Create Emergency Booking
 * Strictly restricted to logged-in farmer with HIGH perishability & EMERGENCY urgency.
 * Emergency capacity is a reserved subset of the real centre capacity!
 */
async function createEmergencyBooking(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    const userId = req.user.id;

    if (!farmerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Farmer profile required.' });
    }

    const { produceId, centreId, bookingDate, reason } = req.body;

    if (!produceId || !centreId || !bookingDate) {
      return res.status(400).json({
        success: false,
        error: 'Produce ID, Centre ID, and Booking Date are required for emergency booking.'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (bookingDate < todayStr) {
      return res.status(400).json({
        success: false,
        error: 'Cannot book emergency slots for a past date.'
      });
    }

    const emergencyResult = await withTransaction(async (conn) => {
      // 1. Lock and verify produce belongs to logged-in farmer
      const [produceRows] = await conn.query(
        'SELECT * FROM farmer_produce WHERE id = ? AND farmer_id = ? FOR UPDATE',
        [produceId, farmerId]
      );

      if (produceRows.length === 0) {
        throw { statusCode: 404, message: 'Produce not found or does not belong to your account.', isOperational: true };
      }

      const produce = produceRows[0];
      if (produce.status !== 'AVAILABLE') {
        throw { statusCode: 400, message: `Produce is already marked as ${produce.status.toLowerCase()}.`, isOperational: true };
      }

      // CRITICAL EMERGENCY ELIGIBILITY VALIDATION:
      // Produce MUST have HIGH perishability and EMERGENCY or URGENT urgency
      if (produce.perishability !== 'HIGH') {
        throw {
          statusCode: 422,
          message: 'Emergency booking rejected: This produce has low or medium perishability. Emergency slots are strictly reserved for highly perishable crops prone to rapid spoilage.',
          isOperational: true
        };
      }

      if (produce.urgency !== 'EMERGENCY' && produce.urgency !== 'URGENT') {
        throw {
          statusCode: 422,
          message: 'Emergency booking rejected: Urgency level must be marked as EMERGENCY or URGENT to qualify for priority allocation.',
          isOperational: true
        };
      }

      const produceKg = parseFloat(produce.quantity_kg);

      // 2. Lock centre
      const [centreRows] = await conn.query(
        'SELECT * FROM procurement_centres WHERE id = ? FOR UPDATE',
        [centreId]
      );

      if (centreRows.length === 0) {
        throw { statusCode: 404, message: 'Procurement centre not found.', isOperational: true };
      }

      const centre = centreRows[0];
      if (centre.status !== 'ACTIVE') {
        throw { statusCode: 400, message: 'Procurement centre is inactive.', isOperational: true };
      }

      // 3. Check duplicate active booking on same date
      const [existingActive] = await conn.query(
        `SELECT id, booking_reference FROM bookings
         WHERE farmer_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [farmerId, bookingDate]
      );

      if (existingActive.length > 0) {
        throw {
          statusCode: 409,
          message: `You already have an active booking (${existingActive[0].booking_reference}) on ${bookingDate}.`,
          isOperational: true
        };
      }

      // 4. Calculate existing emergency bookings today
      const [emergencyBookings] = await conn.query(
        `SELECT COUNT(*) as emergency_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as emergency_kg
         FROM bookings
         WHERE centre_id = ? AND booking_date = ? AND booking_type = 'EMERGENCY' AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [centreId, bookingDate]
      );

      const currentEmergFarmers = parseInt(emergencyBookings[0].emergency_farmers, 10);
      const currentEmergKg = parseFloat(emergencyBookings[0].emergency_kg);

      // Emergency quota check
      if (currentEmergFarmers + 1 > centre.emergency_farmer_quota) {
        throw {
          statusCode: 422,
          message: `Emergency farmer quota exhausted for ${bookingDate} (Max: ${centre.emergency_farmer_quota} emergency farmers).`,
          isOperational: true
        };
      }

      if (currentEmergKg + produceKg > parseFloat(centre.emergency_produce_kg_quota)) {
        throw {
          statusCode: 422,
          message: `Emergency quantity quota exhausted. Available emergency quota: ${(centre.emergency_produce_kg_quota - currentEmergKg).toFixed(1)} kg.`,
          isOperational: true
        };
      }

      // 5. CRITICAL CAPACITY RULE: Emergency capacity is a reserved subset of real centre capacity.
      // Total bookings (regular + emergency) must NEVER exceed centre total daily capacity!
      const [totalBookings] = await conn.query(
        `SELECT COUNT(*) as total_farmers, COALESCE(SUM(allocated_quantity_kg), 0) as total_kg
         FROM bookings
         WHERE centre_id = ? AND booking_date = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [centreId, bookingDate]
      );

      const totalFarmers = parseInt(totalBookings[0].total_farmers, 10);
      const totalKg = parseFloat(totalBookings[0].total_kg);

      if (totalFarmers + 1 > centre.max_farmers_per_day) {
        throw { statusCode: 422, message: 'Centre absolute maximum farmer capacity reached for this date.', isOperational: true };
      }

      if (totalKg + produceKg > parseFloat(centre.max_produce_kg_per_day)) {
        throw { statusCode: 422, message: 'Centre absolute maximum produce capacity reached for this date.', isOperational: true };
      }

      // 6. Assign to first active slot or designated emergency slot
      const [availableSlots] = await conn.query(
        'SELECT * FROM centre_slots WHERE centre_id = ? AND is_active = 1 ORDER BY slot_start ASC LIMIT 1',
        [centreId]
      );

      if (availableSlots.length === 0) {
        throw { statusCode: 400, message: 'No operational slots available at this centre.', isOperational: true };
      }

      const assignedSlot = availableSlots[0];

      // 7. Generate Token with HIGH priority score (score 50 instead of 100 for fast dispatch)
      const [maxTokenRow] = await conn.query(
        `SELECT COALESCE(MAX(sequence_number), 0) as max_seq
         FROM tokens
         WHERE centre_id = ? AND procurement_date = ?`,
        [centreId, bookingDate]
      );

      const nextSequence = parseInt(maxTokenRow[0].max_seq, 10) + 1;
      const tokenNumber = formatTokenNumber(nextSequence);
      const bookingRef = generateBookingReference(centre.centre_code);

      // 8. Insert Emergency Booking
      const [insertBooking] = await conn.query(
        `INSERT INTO bookings
         (booking_reference, farmer_id, produce_id, centre_id, slot_id, booking_date, allocated_quantity_kg, booking_type, status, cancellation_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'EMERGENCY', 'BOOKED', ?, NOW())`,
        [bookingRef, farmerId, produceId, centreId, assignedSlot.id, bookingDate, produceKg, reason ? `Emergency: ${reason}` : 'Perishable produce priority']
      );

      const bookingId = insertBooking.insertId;

      // 9. Update Produce status
      await conn.query('UPDATE farmer_produce SET status = "BOOKED" WHERE id = ?', [produceId]);

      // 10. Insert Token (priority_score = 50 for expedited priority)
      const [insertToken] = await conn.query(
        `INSERT INTO tokens (booking_id, centre_id, procurement_date, token_number, sequence_number, priority_score, created_at)
         VALUES (?, ?, ?, ?, ?, 50, NOW())`,
        [bookingId, centreId, bookingDate, tokenNumber, nextSequence]
      );

      const tokenId = insertToken.insertId;

      // 11. Insert Queue Entry
      await conn.query(
        `INSERT INTO queue_entries (booking_id, centre_id, token_id, procurement_date, status, estimated_wait_minutes, updated_at)
         VALUES (?, ?, ?, ?, 'BOOKED', 0, NOW())`,
        [bookingId, centreId, tokenId, bookingDate]
      );

      return {
        bookingId,
        bookingRef,
        tokenNumber,
        sequenceNumber: nextSequence,
        centreName: centre.name,
        slotDisplay: assignedSlot.display_time,
        bookingDate,
        quantityKg: produceKg,
        cropName: produce.crop_name,
        bookingType: 'EMERGENCY'
      };
    });

    // Notify farmer of emergency booking approval
    await createNotification({
      userId,
      title: '🚨 Emergency Booking Accepted!',
      message: `Emergency allocation confirmed for perishable produce ${emergencyResult.cropName} (${emergencyResult.quantityKg} kg). Priority Token: ${emergencyResult.tokenNumber} at ${emergencyResult.centreName}.`,
      type: 'EMERGENCY_BOOKING_ACCEPTED',
      metadata: { bookingId: emergencyResult.bookingId, token: emergencyResult.tokenNumber }
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency booking granted! Priority digital token generated.',
      data: emergencyResult
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get all bookings for currently logged-in farmer
 */
async function getFarmerBookings(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    if (!farmerId) {
      return res.status(403).json({ success: false, error: 'Farmer profile not found.' });
    }

    const bookings = await query(
      `SELECT b.*,
              p.crop_name, p.quantity_input, p.unit, p.perishability, p.urgency,
              c.name as centre_name, c.location as centre_location, c.district as centre_district,
              s.slot_start, s.slot_end, s.display_time as slot_display,
              t.token_number, t.sequence_number, t.priority_score,
              q.status as queue_status, q.estimated_wait_minutes, q.counter_assigned,
              qt.status as quality_status, qt.grade as quality_grade,
              pr.status as procurement_status, pr.net_procured_kg, pr.total_procurement_value,
              pay.status as payment_status, pay.amount as payment_amount, pay.reference_number as payment_reference
       FROM bookings b
       JOIN farmer_produce p ON p.id = b.produce_id
       JOIN procurement_centres c ON c.id = b.centre_id
       JOIN centre_slots s ON s.id = b.slot_id
       LEFT JOIN tokens t ON t.booking_id = b.id
       LEFT JOIN queue_entries q ON q.booking_id = b.id
       LEFT JOIN quality_tests qt ON qt.booking_id = b.id
       LEFT JOIN procurements pr ON pr.booking_id = b.id
       LEFT JOIN payments pay ON pay.booking_id = b.id
       WHERE b.farmer_id = ?
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      [farmerId]
    );

    return res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get single booking detailed view
 */
async function getBookingDetails(req, res, next) {
  try {
    const { id } = req.params;
    const isFarmer = req.user.role === 'FARMER';
    const farmerId = req.user.farmer_id;

    let sql = `
      SELECT b.*,
             u.full_name as farmer_name, u.phone as farmer_phone,
             f.village, f.district as farmer_district, f.bank_account_no, f.bank_ifsc,
             p.crop_name, p.quantity_input, p.unit, p.perishability, p.urgency,
             c.name as centre_name, c.location as centre_location, c.district as centre_district, c.active_counters, c.avg_processing_mins,
             s.slot_start, s.slot_end, s.display_time as slot_display,
             t.token_number, t.sequence_number, t.priority_score,
             q.status as queue_status, q.check_in_time, q.stage_start_time, q.completed_time, q.counter_assigned, q.estimated_wait_minutes,
             qt.status as quality_status, qt.grade as quality_grade, qt.moisture_percentage, qt.foreign_matter_percentage, qt.remarks as quality_remarks,
             pr.status as procurement_status, pr.gross_weight_kg, pr.tare_weight_kg, pr.net_procured_kg, pr.rate_per_kg, pr.total_procurement_value,
             pay.status as payment_status, pay.amount as payment_amount, pay.reference_number as payment_reference, pay.payment_mode, pay.payment_date
      FROM bookings b
      JOIN farmers f ON f.id = b.farmer_id
      JOIN users u ON u.id = f.user_id
      JOIN farmer_produce p ON p.id = b.produce_id
      JOIN procurement_centres c ON c.id = b.centre_id
      JOIN centre_slots s ON s.id = b.slot_id
      LEFT JOIN tokens t ON t.booking_id = b.id
      LEFT JOIN queue_entries q ON q.booking_id = b.id
      LEFT JOIN quality_tests qt ON qt.booking_id = b.id
      LEFT JOIN procurements pr ON pr.booking_id = b.id
      LEFT JOIN payments pay ON pay.booking_id = b.id
      WHERE b.id = ?
    `;

    const params = [id];
    if (isFarmer) {
      sql += ' AND b.farmer_id = ?';
      params.push(farmerId);
    }

    const rows = await query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    return res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Cancel Booking (releases capacity, releases produce back to AVAILABLE)
 */
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by farmer' } = req.body;
    const isFarmer = req.user.role === 'FARMER';
    const farmerId = req.user.farmer_id;

    await withTransaction(async (conn) => {
      let checkSql = 'SELECT * FROM bookings WHERE id = ? FOR UPDATE';
      const checkParams = [id];

      if (isFarmer) {
        checkSql = 'SELECT * FROM bookings WHERE id = ? AND farmer_id = ? FOR UPDATE';
        checkParams.push(farmerId);
      }

      const [bookingRows] = await conn.query(checkSql, checkParams);
      if (bookingRows.length === 0) {
        throw { statusCode: 404, message: 'Booking not found or unauthorized to cancel.', isOperational: true };
      }

      const booking = bookingRows[0];
      if (['COMPLETED', 'CANCELLED', 'QUALITY_TESTING', 'PROCUREMENT'].includes(booking.status)) {
        throw {
          statusCode: 400,
          message: `Cannot cancel booking with current status '${booking.status}'.`,
          isOperational: true
        };
      }

      // Update booking status
      await conn.query(
        'UPDATE bookings SET status = "CANCELLED", cancellation_reason = ? WHERE id = ?',
        [reason, id]
      );

      // Release produce back to AVAILABLE
      await conn.query(
        'UPDATE farmer_produce SET status = "AVAILABLE" WHERE id = ?',
        [booking.produce_id]
      );

      // Update queue entry
      await conn.query(
        'UPDATE queue_entries SET status = "CANCELLED" WHERE booking_id = ?',
        [id]
      );

      // Notify farmer
      const [farmerUser] = await conn.query(
        'SELECT user_id FROM farmers WHERE id = ?',
        [booking.farmer_id]
      );

      if (farmerUser.length > 0) {
        await createNotification({
          userId: farmerUser[0].user_id,
          title: 'Booking Cancelled',
          message: `Booking ${booking.booking_reference} has been cancelled. Reason: ${reason}`,
          type: 'BOOKING_CANCELLED',
          metadata: { bookingId: id }
        });
      }
    });

    return res.json({
      success: true,
      message: 'Booking cancelled successfully. Capacity and produce have been released.'
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRegularBooking,
  createEmergencyBooking,
  getFarmerBookings,
  getBookingDetails,
  cancelBooking
};
