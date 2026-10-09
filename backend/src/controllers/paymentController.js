const { query, withTransaction } = require('../config/db');
const { createNotification } = require('../services/notificationService');

/**
 * Get payment details for a specific booking
 */
async function getPaymentByBooking(req, res, next) {
  try {
    const { bookingId } = req.params;

    const rows = await query(
      `SELECT pay.*,
              b.booking_reference, b.booking_date,
              p.crop_name, p.quantity_input, p.unit,
              u.full_name as farmer_name, u.phone as farmer_phone,
              f.bank_account_no, f.bank_ifsc
       FROM payments pay
       JOIN bookings b ON b.id = pay.booking_id
       JOIN farmers f ON f.id = pay.farmer_id
       JOIN users u ON u.id = f.user_id
       JOIN farmer_produce p ON p.id = b.produce_id
       WHERE pay.booking_id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment record not found for this booking.' });
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
 * Get all payments for logged-in farmer
 */
async function getFarmerPayments(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    if (!farmerId) {
      return res.status(403).json({ success: false, error: 'Farmer profile not found.' });
    }

    const rows = await query(
      `SELECT pay.*,
              b.booking_reference, b.booking_date,
              p.crop_name, p.unit,
              pr.net_procured_kg, pr.rate_per_kg,
              c.name as centre_name
       FROM payments pay
       JOIN bookings b ON b.id = pay.booking_id
       JOIN procurement_centres c ON c.id = b.centre_id
       JOIN farmer_produce p ON p.id = b.produce_id
       LEFT JOIN procurements pr ON pr.id = pay.procurement_id
       WHERE pay.farmer_id = ?
       ORDER BY pay.created_at DESC`,
      [farmerId]
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update Payment Status (PENDING -> PROCESSING -> PAID / FAILED)
 */
async function adminUpdatePaymentStatus(req, res, next) {
  try {
    const { paymentId } = req.params;
    const { status, referenceNumber, remarks, paymentMode = 'DIRECT_BANK_TRANSFER' } = req.body;

    if (!status || !['PENDING', 'PROCESSING', 'PAID', 'FAILED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment status (PENDING, PROCESSING, PAID, FAILED) is required.'
      });
    }

    const updated = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT pay.*, f.user_id, f.bank_account_no, f.bank_ifsc, b.booking_reference, p.crop_name
         FROM payments pay
         JOIN farmers f ON f.id = pay.farmer_id
         JOIN bookings b ON b.id = pay.booking_id
         JOIN farmer_produce p ON p.id = b.produce_id
         WHERE pay.id = ? FOR UPDATE`,
        [paymentId]
      );

      if (rows.length === 0) {
        throw { statusCode: 404, message: 'Payment record not found.', isOperational: true };
      }

      const payment = rows[0];

      const refNo = referenceNumber || payment.reference_number || `DBT-KS-${Date.now().toString().slice(-8)}`;
      const paymentDate = status === 'PAID' ? 'NOW()' : (payment.payment_date ? 'payment_date' : 'NULL');

      await conn.query(
        `UPDATE payments
         SET status = ?,
             reference_number = ?,
             payment_mode = ?,
             remarks = ?,
             payment_date = ${status === 'PAID' ? 'NOW()' : 'payment_date'},
             updated_at = NOW()
         WHERE id = ?`,
        [status, refNo, paymentMode, remarks || payment.remarks, paymentId]
      );

      return {
        ...payment,
        status,
        reference_number: refNo
      };
    });

    // Notify farmer based on payment status
    let notifTitle = 'Payment Status Update';
    let notifMsg = `Payment for ${updated.crop_name} (₹${parseFloat(updated.amount).toLocaleString('en-IN')}) is now ${status}.`;
    let notifType = 'PAYMENT_PROCESSED';

    if (status === 'PAID') {
      notifTitle = '💰 Payment Transferred Successfully!';
      notifMsg = `₹${parseFloat(updated.amount).toLocaleString('en-IN')} has been transferred to your registered bank account (${updated.bank_account_no || 'DBT'}). Reference: ${updated.reference_number}.`;
      notifType = 'PAYMENT_COMPLETED';
    } else if (status === 'FAILED') {
      notifTitle = '⚠️ Payment Failed';
      notifMsg = `Payment transfer failed for booking ${updated.booking_reference}. Reason: ${remarks || 'Bank IFSC or account verification failure'}. Our team is reviewing.`;
      notifType = 'PAYMENT_FAILED';
    }

    await createNotification({
      userId: updated.user_id,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      metadata: { paymentId, amount: updated.amount, status }
    });

    return res.json({
      success: true,
      message: `Payment status updated to ${status}.`,
      data: {
        paymentId,
        status,
        amount: updated.amount,
        referenceNumber: updated.reference_number
      }
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPaymentByBooking,
  getFarmerPayments,
  adminUpdatePaymentStatus
};
