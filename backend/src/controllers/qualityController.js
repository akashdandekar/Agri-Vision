const { query, withTransaction } = require('../config/db');
const { createNotification } = require('../services/notificationService');

/**
 * Get Quality Test details for a booking
 */
async function getQualityTestByBooking(req, res, next) {
  try {
    const { bookingId } = req.params;

    const rows = await query(
      `SELECT qt.*,
              b.booking_reference, b.booking_date, b.allocated_quantity_kg,
              p.crop_name, p.quantity_input, p.unit,
              u.full_name as farmer_name, u.phone as farmer_phone,
              adm_user.full_name as inspector_name, a.employee_id as inspector_employee_id
       FROM quality_tests qt
       JOIN bookings b ON b.id = qt.booking_id
       JOIN farmers f ON f.id = b.farmer_id
       JOIN users u ON u.id = f.user_id
       JOIN farmer_produce p ON p.id = b.produce_id
       LEFT JOIN admins a ON a.id = qt.inspected_by_admin_id
       LEFT JOIN users adm_user ON adm_user.id = a.user_id
       WHERE qt.booking_id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quality test record not found for this booking.' });
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
 * Admin: Start Quality Testing
 */
async function adminStartQualityTest(req, res, next) {
  try {
    const { bookingId } = req.body;
    const adminId = req.user.admin_id;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID is required.' });
    }

    const testInfo = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        'SELECT b.*, f.user_id, t.token_number FROM bookings b JOIN farmers f ON f.id = b.farmer_id JOIN tokens t ON t.booking_id = b.id WHERE b.id = ? FOR UPDATE',
        [bookingId]
      );

      if (rows.length === 0) {
        throw { statusCode: 404, message: 'Booking not found.', isOperational: true };
      }

      const booking = rows[0];

      // Update booking and queue to QUALITY_TESTING
      await conn.query('UPDATE bookings SET status = "QUALITY_TESTING" WHERE id = ?', [bookingId]);
      await conn.query('UPDATE queue_entries SET status = "QUALITY_TESTING" WHERE booking_id = ?', [bookingId]);

      // Insert or update quality_tests
      await conn.query(
        `INSERT INTO quality_tests (booking_id, inspected_by_admin_id, status, test_timestamp, created_at)
         VALUES (?, ?, 'TESTING', NOW(), NOW())
         ON DUPLICATE KEY UPDATE inspected_by_admin_id = ?, status = 'TESTING', test_timestamp = NOW()`,
        [bookingId, adminId, adminId]
      );

      return booking;
    });

    // Notify farmer
    await createNotification({
      userId: testInfo.user_id,
      title: '🔬 Crop Quality Testing Started',
      message: `Quality testing has started for Token ${testInfo.token_number}. Moisture analysis and physical purity test in progress.`,
      type: 'QUALITY_TESTING_STARTED',
      metadata: { bookingId, token: testInfo.token_number }
    });

    return res.json({
      success: true,
      message: 'Quality testing initialized.',
      data: { bookingId, status: 'TESTING' }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Submit Quality Test Result (PASSED / REJECTED)
 */
async function adminSubmitQualityResult(req, res, next) {
  try {
    const {
      bookingId,
      status, // 'PASSED' or 'REJECTED'
      grade,  // 'GRADE_A', 'GRADE_B', 'GRADE_C', 'REJECTED'
      moisturePercentage,
      foreignMatterPercentage,
      remarks
    } = req.body;

    const adminId = req.user.admin_id;

    if (!bookingId || !status || !['PASSED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and valid test status (PASSED or REJECTED) are required.'
      });
    }

    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT b.*, f.user_id, t.token_number, p.crop_name
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
      const validGrade = status === 'REJECTED' ? 'REJECTED' : (grade || 'GRADE_A');

      // Update quality_tests
      await conn.query(
        `INSERT INTO quality_tests
         (booking_id, inspected_by_admin_id, status, grade, moisture_percentage, foreign_matter_percentage, remarks, test_timestamp, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           inspected_by_admin_id = VALUES(inspected_by_admin_id),
           status = VALUES(status),
           grade = VALUES(grade),
           moisture_percentage = VALUES(moisture_percentage),
           foreign_matter_percentage = VALUES(foreign_matter_percentage),
           remarks = VALUES(remarks),
           test_timestamp = NOW()`,
        [bookingId, adminId, status, validGrade, moisturePercentage || null, foreignMatterPercentage || null, remarks || null]
      );

      if (status === 'PASSED') {
        // Progress booking and queue to PROCUREMENT
        await conn.query('UPDATE bookings SET status = "PROCUREMENT" WHERE id = ?', [bookingId]);
        await conn.query('UPDATE queue_entries SET status = "PROCUREMENT" WHERE booking_id = ?', [bookingId]);

        // Standard government MSP rate heuristics per crop (in Rs/kg)
        let ratePerKg = 48.0; // default
        const lowerCrop = booking.crop_name.toLowerCase();
        if (lowerCrop.includes('soybean')) ratePerKg = 48.92;
        else if (lowerCrop.includes('wheat')) ratePerKg = 24.25;
        else if (lowerCrop.includes('paddy') || lowerCrop.includes('rice')) ratePerKg = 23.00;
        else if (lowerCrop.includes('chana') || lowerCrop.includes('gram')) ratePerKg = 54.40;
        else if (lowerCrop.includes('tomato')) ratePerKg = 18.50;

        // Auto-create pending procurement record
        const estValue = (booking.allocated_quantity_kg * ratePerKg).toFixed(2);
        await conn.query(
          `INSERT INTO procurements (booking_id, processed_by_admin_id, net_procured_kg, rate_per_kg, total_procurement_value, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'PENDING', NOW())
           ON DUPLICATE KEY UPDATE rate_per_kg = VALUES(rate_per_kg), total_procurement_value = VALUES(total_procurement_value)`,
          [bookingId, adminId, booking.allocated_quantity_kg, ratePerKg, estValue]
        );

      } else {
        // REJECTED: Mark booking as COMPLETED (Rejected)
        await conn.query('UPDATE bookings SET status = "COMPLETED", cancellation_reason = ? WHERE id = ?', [`Quality test rejected: ${remarks || 'Standards not met'}`, bookingId]);
        await conn.query('UPDATE queue_entries SET status = "COMPLETED" WHERE booking_id = ?', [bookingId]);
        // Produce can be released back so farmer can dry or clean
        await conn.query('UPDATE farmer_produce SET status = "AVAILABLE" WHERE id = ?', [booking.produce_id]);
      }

      return {
        bookingId,
        tokenNumber: booking.token_number,
        userId: booking.user_id,
        cropName: booking.crop_name,
        status,
        grade: validGrade
      };
    });

    // Notify farmer
    const title = result.status === 'PASSED' ? '✅ Quality Test PASSED!' : '❌ Quality Test Not Passed';
    const msg = result.status === 'PASSED'
      ? `Congratulations! Your produce (${result.cropName}) passed quality inspection with ${result.grade}. Moving to digital weighment & procurement.`
      : `Quality test for ${result.cropName} did not meet minimum standards (${remarks || 'Moisture/Foreign matter above threshold'}).`;

    await createNotification({
      userId: result.userId,
      title,
      message: msg,
      type: result.status === 'PASSED' ? 'QUALITY_PASSED' : 'QUALITY_REJECTED',
      metadata: { bookingId, grade: result.grade, status: result.status }
    });

    return res.json({
      success: true,
      message: `Quality test result submitted: ${result.status}`,
      data: result
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getQualityTestByBooking,
  adminStartQualityTest,
  adminSubmitQualityResult
};
