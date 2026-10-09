const { query, withTransaction } = require('../config/db');
const { predictWaitTime } = require('../services/aiService');
const { createNotification } = require('../services/notificationService');

/**
 * Get Live Queue State for a specific Centre on a Date
 * Returns currently serving token, waiting queue ordered by priority and slot time, and stats.
 */
async function getLiveQueueForCentre(req, res, next) {
  try {
    const { centreId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Centre info
    const [centre] = await query('SELECT * FROM procurement_centres WHERE id = ?', [centreId]);
    if (!centre) {
      return res.status(404).json({ success: false, error: 'Procurement centre not found.' });
    }

    // Active tokens in queue for this date, ordered by:
    // 1. priority_score ASC (e.g. 50 for emergency comes before 100)
    // 2. slot_start ASC
    // 3. sequence_number ASC
    const queueList = await query(
      `SELECT q.id as queue_id, q.status as queue_status, q.counter_assigned,
              q.check_in_time, q.stage_start_time, q.estimated_wait_minutes,
              t.token_number, t.sequence_number, t.priority_score,
              b.id as booking_id, b.booking_reference, b.booking_type, b.allocated_quantity_kg,
              u.full_name as farmer_name, u.phone as farmer_phone,
              p.crop_name, p.unit, p.perishability, p.urgency,
              s.display_time as slot_display, s.slot_start
       FROM queue_entries q
       JOIN tokens t ON t.id = q.token_id
       JOIN bookings b ON b.id = q.booking_id
       JOIN farmers f ON f.id = b.farmer_id
       JOIN users u ON u.id = f.user_id
       JOIN farmer_produce p ON p.id = b.produce_id
       JOIN centre_slots s ON s.id = b.slot_id
       WHERE q.centre_id = ? AND q.procurement_date = ?
       ORDER BY
         CASE
           WHEN q.status = 'IN_PROGRESS' THEN 1
           WHEN q.status = 'WAITING' THEN 2
           WHEN q.status = 'CHECKED_IN' THEN 3
           WHEN q.status = 'BOOKED' THEN 4
           WHEN q.status IN ('QUALITY_TESTING', 'PROCUREMENT') THEN 5
           ELSE 6
         END,
         t.priority_score ASC,
         s.slot_start ASC,
         t.sequence_number ASC`,
      [centreId, targetDate]
    );

    // Current token being actively served at counters
    const currentlyServing = queueList.filter(q => q.queue_status === 'IN_PROGRESS');
    const waitingTokens = queueList.filter(q => ['WAITING', 'CHECKED_IN'].includes(q.queue_status));
    const completedTokens = queueList.filter(q => q.queue_status === 'COMPLETED');

    const currentTokenStr = currentlyServing.length > 0 ? currentlyServing.map(s => s.token_number).join(', ') : 'None';

    return res.json({
      success: true,
      centre: {
        id: centre.id,
        name: centre.name,
        code: centre.centre_code,
        activeCounters: centre.active_counters,
        avgProcessingMins: centre.avg_processing_mins
      },
      targetDate,
      summary: {
        currentToken: currentTokenStr,
        currentlyServingCount: currentlyServing.length,
        waitingCount: waitingTokens.length,
        completedCount: completedTokens.length,
        totalScheduledToday: queueList.length
      },
      queue: queueList
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get Farmer Live Queue Position & AI Estimated Waiting Time
 */
async function getFarmerQueueStatus(req, res, next) {
  try {
    const { bookingId } = req.params;
    const isFarmer = req.user.role === 'FARMER';
    const farmerId = req.user.farmer_id;

    // Get booking & queue entry
    const rows = await query(
      `SELECT b.id as booking_id, b.farmer_id, b.booking_reference, b.booking_date, b.booking_type,
              b.allocated_quantity_kg, b.centre_id, b.status as booking_status,
              c.name as centre_name, c.active_counters, c.avg_processing_mins,
              t.token_number, t.sequence_number, t.priority_score,
              q.status as queue_status, q.check_in_time, q.counter_assigned,
              s.display_time as slot_display, s.slot_start,
              p.crop_name, p.perishability, p.urgency
       FROM bookings b
       JOIN procurement_centres c ON c.id = b.centre_id
       JOIN centre_slots s ON s.id = b.slot_id
       JOIN farmer_produce p ON p.id = b.produce_id
       JOIN tokens t ON t.booking_id = b.id
       JOIN queue_entries q ON q.booking_id = b.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking queue record not found.' });
    }

    const booking = rows[0];

    if (isFarmer && booking.farmer_id !== farmerId) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own queue status.' });
    }

    // Find current serving token at the centre
    const [servingRow] = await query(
      `SELECT t.token_number, q.counter_assigned
       FROM queue_entries q
       JOIN tokens t ON t.id = q.token_id
       WHERE q.centre_id = ? AND q.procurement_date = ? AND q.status = 'IN_PROGRESS'
       ORDER BY q.stage_start_time DESC LIMIT 1`,
      [booking.centre_id, booking.booking_date]
    );

    const currentToken = servingRow ? servingRow.token_number : 'Waiting to start';

    // Calculate People Ahead:
    // Anyone on same date who is:
    // 1. Either WAITING or CHECKED_IN or IN_PROGRESS
    // 2. Ordered ahead by (priority_score, slot_start, sequence_number)
    const [aheadRow] = await query(
      `SELECT COUNT(*) as people_ahead
       FROM queue_entries q
       JOIN tokens t ON t.id = q.token_id
       JOIN bookings b ON b.id = q.booking_id
       JOIN centre_slots s ON s.id = b.slot_id
       WHERE q.centre_id = ? AND q.procurement_date = ?
         AND q.status IN ('WAITING', 'CHECKED_IN', 'IN_PROGRESS')
         AND q.booking_id != ?
         AND (
           t.priority_score < ?
           OR (t.priority_score = ? AND s.slot_start < ?)
           OR (t.priority_score = ? AND s.slot_start = ? AND t.sequence_number < ?)
         )`,
      [
        booking.centre_id,
        booking.booking_date,
        booking.booking_id,
        booking.priority_score,
        booking.priority_score,
        booking.slot_start,
        booking.priority_score,
        booking.slot_start,
        booking.sequence_number
      ]
    );

    const peopleAhead = aheadRow ? parseInt(aheadRow.people_ahead, 10) : 0;

    // Call AI Wait Time Service (with statistical fallback)
    const aiPrediction = await predictWaitTime({
      farmersAhead: peopleAhead,
      avgProcessingMins: booking.avg_processing_mins,
      activeCounters: booking.active_counters,
      produceQuantityKg: booking.allocated_quantity_kg,
      urgency: booking.urgency,
      perishability: booking.perishability,
      hourOfDay: new Date().getHours()
    });

    // Update estimated_wait_minutes in queue_entries
    await query(
      'UPDATE queue_entries SET estimated_wait_minutes = ? WHERE booking_id = ?',
      [aiPrediction.estimatedWaitMinutes, booking.booking_id]
    );

    return res.json({
      success: true,
      data: {
        bookingId: booking.booking_id,
        bookingReference: booking.booking_reference,
        centreName: booking.centre_name,
        slotDisplay: booking.slot_display,
        cropName: booking.crop_name,
        quantityKg: booking.allocated_quantity_kg,
        farmerToken: booking.token_number,
        currentToken,
        peopleAhead,
        queueStatus: booking.queue_status,
        checkInTime: booking.check_in_time,
        counterAssigned: booking.counter_assigned,
        estimatedWaitMinutes: aiPrediction.estimatedWaitMinutes,
        aiConfidence: aiPrediction.confidence,
        predictionSource: aiPrediction.source
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Check-In Farmer (Can be invoked by Farmer reaching centre or by Admin at entrance)
 */
async function checkInFarmer(req, res, next) {
  try {
    const { bookingId } = req.body;
    const isFarmer = req.user.role === 'FARMER';
    const farmerId = req.user.farmer_id;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID is required.' });
    }

    const result = await withTransaction(async (conn) => {
      let checkSql = 'SELECT b.*, t.token_number, f.user_id FROM bookings b JOIN tokens t ON t.booking_id = b.id JOIN farmers f ON f.id = b.farmer_id WHERE b.id = ? FOR UPDATE';
      const checkParams = [bookingId];

      const [rows] = await conn.query(checkSql, checkParams);
      if (rows.length === 0) {
        throw { statusCode: 404, message: 'Booking not found.', isOperational: true };
      }

      const booking = rows[0];

      if (isFarmer && booking.farmer_id !== farmerId) {
        throw { statusCode: 403, message: 'Cannot check in for another farmer.', isOperational: true };
      }

      if (['CHECKED_IN', 'WAITING', 'IN_PROGRESS', 'QUALITY_TESTING', 'PROCUREMENT', 'COMPLETED'].includes(booking.status)) {
        throw { statusCode: 400, message: `Farmer has already checked in (current status: ${booking.status}).`, isOperational: true };
      }

      if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
        throw { statusCode: 400, message: `Cannot check in a booking that is ${booking.status.toLowerCase()}.`, isOperational: true };
      }

      // Update Booking & Queue status to CHECKED_IN / WAITING
      await conn.query('UPDATE bookings SET status = "CHECKED_IN" WHERE id = ?', [bookingId]);
      await conn.query(
        'UPDATE queue_entries SET status = "WAITING", check_in_time = NOW() WHERE booking_id = ?',
        [bookingId]
      );

      // Create Quality Test record in PENDING state
      await conn.query(
        `INSERT INTO quality_tests (booking_id, status, created_at)
         VALUES (?, 'PENDING', NOW())
         ON DUPLICATE KEY UPDATE status = 'PENDING'`,
        [bookingId]
      );

      return {
        bookingId,
        tokenNumber: booking.token_number,
        userId: booking.user_id
      };
    });

    // Notify farmer
    await createNotification({
      userId: result.userId,
      title: 'Checked-in Successfully!',
      message: `You have successfully checked in! Token ${result.tokenNumber} is now in the live queue. Please monitor the digital display.`,
      type: 'CHECK_IN',
      metadata: { bookingId, token: result.tokenNumber }
    });

    return res.json({
      success: true,
      message: `Token ${result.tokenNumber} checked in successfully. Added to active queue.`,
      data: result
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Call Next Farmer to Counter
 */
async function adminCallNext(req, res, next) {
  try {
    const { bookingId, counterNumber = 1 } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID is required.' });
    }

    const updated = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT b.*, t.token_number, f.user_id, c.name as centre_name
         FROM bookings b
         JOIN tokens t ON t.booking_id = b.id
         JOIN farmers f ON f.id = b.farmer_id
         JOIN procurement_centres c ON c.id = b.centre_id
         WHERE b.id = ? FOR UPDATE`,
        [bookingId]
      );

      if (rows.length === 0) {
        throw { statusCode: 404, message: 'Booking not found.', isOperational: true };
      }

      const booking = rows[0];

      // Update booking and queue
      await conn.query('UPDATE bookings SET status = "IN_PROGRESS" WHERE id = ?', [bookingId]);
      await conn.query(
        `UPDATE queue_entries
         SET status = "IN_PROGRESS", counter_assigned = ?, stage_start_time = NOW()
         WHERE booking_id = ?`,
        [counterNumber, bookingId]
      );

      return booking;
    });

    // Notify farmer: Your token has been called!
    await createNotification({
      userId: updated.user_id,
      title: `🔔 Token ${updated.token_number} Called!`,
      message: `Attention: Token ${updated.token_number} has been called to Counter #${counterNumber} at ${updated.centre_name}. Please proceed with your produce documents.`,
      type: 'TOKEN_CALLED',
      metadata: { bookingId, token: updated.token_number, counter: counterNumber }
    });

    return res.json({
      success: true,
      message: `Token ${updated.token_number} called to Counter #${counterNumber}.`,
      data: {
        bookingId,
        tokenNumber: updated.token_number,
        counterAssigned: counterNumber
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Mark Farmer No-Show
 */
async function adminMarkNoShow(req, res, next) {
  try {
    const { bookingId, reason = 'Did not arrive during slot window' } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID is required.' });
    }

    await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        'SELECT b.*, f.user_id FROM bookings b JOIN farmers f ON f.id = b.farmer_id WHERE b.id = ? FOR UPDATE',
        [bookingId]
      );

      if (rows.length === 0) {
        throw { statusCode: 404, message: 'Booking not found.', isOperational: true };
      }

      const booking = rows[0];

      await conn.query(
        'UPDATE bookings SET status = "NO_SHOW", cancellation_reason = ? WHERE id = ?',
        [reason, bookingId]
      );

      await conn.query(
        'UPDATE queue_entries SET status = "NO_SHOW" WHERE booking_id = ?',
        [bookingId]
      );

      // Release produce back to AVAILABLE
      await conn.query(
        'UPDATE farmer_produce SET status = "AVAILABLE" WHERE id = ?',
        [booking.produce_id]
      );

      // Notify farmer
      await createNotification({
        userId: booking.user_id,
        title: 'Marked as No-Show',
        message: `Your booking ${booking.booking_reference} has been marked as No-Show. Your produce has been unbooked so you can reschedule.`,
        type: 'NO_SHOW',
        metadata: { bookingId }
      });
    });

    return res.json({
      success: true,
      message: 'Booking marked as No-Show. Produce released.'
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLiveQueueForCentre,
  getFarmerQueueStatus,
  checkInFarmer,
  adminCallNext,
  adminMarkNoShow
};
