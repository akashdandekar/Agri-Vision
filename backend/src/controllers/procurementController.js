const { query, withTransaction } = require('../config/db');
const { createNotification } = require('../services/notificationService');

/**
 * Get procurement details for a booking
 */
async function getProcurementByBooking(req, res, next) {
  try {
    const { bookingId } = req.params;

    const rows = await query(
      `SELECT pr.*,
              b.booking_reference, b.booking_date, b.allocated_quantity_kg,
              p.crop_name, p.unit,
              u.full_name as farmer_name, u.phone as farmer_phone,
              adm_user.full_name as officer_name, a.employee_id as officer_employee_id
       FROM procurements pr
       JOIN bookings b ON b.id = pr.booking_id
       JOIN farmers f ON f.id = b.farmer_id
       JOIN users u ON u.id = f.user_id
       JOIN farmer_produce p ON p.id = b.produce_id
       LEFT JOIN admins a ON a.id = pr.processed_by_admin_id
       LEFT JOIN users adm_user ON adm_user.id = a.user_id
       WHERE pr.booking_id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Procurement record not found.' });
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
 * Admin: Complete Procurement
 * Records gross/tare weighment, computes total amount, marks booking completed,
 * transitions produce to PROCURED, and creates DBT Payment record in PENDING state!
 */
async function adminCompleteProcurement(req, res, next) {
  try {
    const {
      bookingId,
      grossWeightKg,
      tareWeightKg,
      netProcuredKg,
      ratePerKg,
      notes
    } = req.body;

    const adminId = req.user.admin_id;

    if (!bookingId || !ratePerKg) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and rate per kg are required.'
      });
    }

    let netKg = parseFloat(netProcuredKg);
    const gross = grossWeightKg ? parseFloat(grossWeightKg) : null;
    const tare = tareWeightKg ? parseFloat(tareWeightKg) : null;

    if (gross !== null && tare !== null && gross > tare) {
      netKg = gross - tare;
    }

    if (isNaN(netKg) || netKg <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Net procured weight must be greater than zero.'
      });
    }

    const rate = parseFloat(ratePerKg);
    const totalValue = parseFloat((netKg * rate).toFixed(2));

    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT b.*, f.user_id, f.id as farmer_id, t.token_number, p.crop_name
         FROM bookings b
         JOIN farmers f ON f.id = b.farmer_id
         JOIN tokens t ON t.booking_id = b.id
         JOIN farmer_produce p ON p.id = b.produce_id
         WHERE b.id = ? FOR UPDATE`,
        [bookingId]
      );

      if (rows.length === 0) {
        throw { statusCode: 404, message: 'Booking not found.', isOperational: true };
      }

      const booking = rows[0];

      // 1. Update procurements table
      await conn.query(
        `INSERT INTO procurements
         (booking_id, processed_by_admin_id, gross_weight_kg, tare_weight_kg, net_procured_kg, rate_per_kg, total_procurement_value, status, procurement_time, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), ?, NOW())
         ON DUPLICATE KEY UPDATE
           processed_by_admin_id = VALUES(processed_by_admin_id),
           gross_weight_kg = VALUES(gross_weight_kg),
           tare_weight_kg = VALUES(tare_weight_kg),
           net_procured_kg = VALUES(net_procured_kg),
           rate_per_kg = VALUES(rate_per_kg),
           total_procurement_value = VALUES(total_procurement_value),
           status = 'COMPLETED',
           procurement_time = NOW(),
           notes = VALUES(notes),
           updated_at = NOW()`,
        [bookingId, adminId, gross, tare, netKg, rate, totalValue, notes || null]
      );

      const [procRows] = await conn.query('SELECT id FROM procurements WHERE booking_id = ?', [bookingId]);
      const procurementId = procRows[0].id;

      // 2. Mark booking COMPLETED
      await conn.query('UPDATE bookings SET status = "COMPLETED" WHERE id = ?', [bookingId]);

      // 3. Mark produce PROCURED
      await conn.query('UPDATE farmer_produce SET status = "PROCURED" WHERE id = ?', [booking.produce_id]);

      // 4. Mark queue COMPLETED
      await conn.query(
        'UPDATE queue_entries SET status = "COMPLETED", completed_time = NOW() WHERE booking_id = ?',
        [bookingId]
      );

      // 5. Automatically create DBT Payment record in PENDING status
      await conn.query(
        `INSERT INTO payments (booking_id, procurement_id, farmer_id, amount, status, payment_mode, reference_number, remarks, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', 'DIRECT_BANK_TRANSFER', ?, 'Procurement completed. DBT payment queued.', NOW())
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = 'PENDING'`,
        [bookingId, procurementId, booking.farmer_id, totalValue, `KS-DBT-${Date.now().toString().slice(-8)}`]
      );

      return {
        bookingId,
        procurementId,
        userId: booking.user_id,
        farmerId: booking.farmer_id,
        cropName: booking.crop_name,
        netKg,
        rate,
        totalValue,
        tokenNumber: booking.token_number
      };
    });

    // Notify farmer
    await createNotification({
      userId: result.userId,
      title: '🌾 Procurement Completed!',
      message: `Your ${result.cropName} (${result.netKg} kg) has been successfully procured at ₹${result.rate}/kg. Total Amount: ₹${result.totalValue.toLocaleString('en-IN')}. DBT payment is being initiated.`,
      type: 'PROCUREMENT_COMPLETED',
      metadata: { bookingId, netKg: result.netKg, totalValue: result.totalValue }
    });

    return res.json({
      success: true,
      message: 'Procurement finalized. Digital receipt and payment record created.',
      data: result
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProcurementByBooking,
  adminCompleteProcurement
};
