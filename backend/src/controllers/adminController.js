const { query } = require('../config/db');

/**
 * Get comprehensive Admin Dashboard statistics and KPIs
 */
async function getAdminOverview(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Total Registered Farmers
    const [farmerCount] = await query('SELECT COUNT(*) as count FROM farmers');

    // 2. Today's Bookings
    const [todayBookings] = await query(
      `SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND status != 'CANCELLED'`,
      [today]
    );

    // 3. Active Queue (WAITING, CHECKED_IN, IN_PROGRESS, QUALITY_TESTING, PROCUREMENT)
    const [activeQueue] = await query(
      `SELECT COUNT(*) as count FROM queue_entries
       WHERE procurement_date = ? AND status IN ('WAITING', 'CHECKED_IN', 'IN_PROGRESS', 'QUALITY_TESTING', 'PROCUREMENT')`,
      [today]
    );

    // 4. Completed Procurements Today
    const [completedToday] = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(net_procured_kg), 0) as total_kg, COALESCE(SUM(total_procurement_value), 0) as total_value
       FROM procurements
       WHERE DATE(procurement_time) = ? AND status = 'COMPLETED'`,
      [today]
    );

    // 5. Pending Payments
    const [pendingPayments] = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount FROM payments WHERE status = 'PENDING'`
    );

    // 6. Emergency Bookings Count Today
    const [emergencyToday] = await query(
      `SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_type = 'EMERGENCY' AND status != 'CANCELLED'`,
      [today]
    );

    // 7. Centre Utilization for today across centres
    const centreUtil = await query(
      `SELECT c.id, c.centre_code, c.name, c.max_farmers_per_day, c.max_produce_kg_per_day,
              COUNT(b.id) as booked_farmers,
              COALESCE(SUM(b.allocated_quantity_kg), 0) as booked_kg
       FROM procurement_centres c
       LEFT JOIN bookings b ON b.centre_id = c.id AND b.booking_date = ? AND b.status != 'CANCELLED'
       WHERE c.status = 'ACTIVE'
       GROUP BY c.id`,
      [today]
    );

    const formattedUtil = centreUtil.map(c => {
      const bookedFarmers = parseInt(c.booked_farmers, 10);
      const bookedKg = parseFloat(c.booked_kg);
      const farmerUtil = c.max_farmers_per_day > 0 ? ((bookedFarmers / c.max_farmers_per_day) * 100).toFixed(1) : 0;
      const kgUtil = c.max_produce_kg_per_day > 0 ? ((bookedKg / c.max_produce_kg_per_day) * 100).toFixed(1) : 0;
      return {
        id: c.id,
        code: c.centre_code,
        name: c.name,
        maxFarmers: c.max_farmers_per_day,
        maxKg: c.max_produce_kg_per_day,
        bookedFarmers,
        bookedKg,
        farmerUtilizationPercent: parseFloat(farmerUtil),
        kgUtilizationPercent: parseFloat(kgUtil)
      };
    });

    // 8. Queue Status Breakdown Today
    const queueBreakdown = await query(
      `SELECT status, COUNT(*) as count
       FROM queue_entries
       WHERE procurement_date = ?
       GROUP BY status`,
      [today]
    );

    // 9. Recent Bookings (latest 10)
    const recentBookings = await query(
      `SELECT b.id, b.booking_reference, b.booking_date, b.booking_type, b.status, b.allocated_quantity_kg,
              u.full_name as farmer_name, u.phone as farmer_phone,
              p.crop_name, c.name as centre_name, t.token_number
       FROM bookings b
       JOIN farmers f ON f.id = b.farmer_id
       JOIN users u ON u.id = f.user_id
       JOIN farmer_produce p ON p.id = b.produce_id
       JOIN procurement_centres c ON c.id = b.centre_id
       LEFT JOIN tokens t ON t.booking_id = b.id
       ORDER BY b.created_at DESC LIMIT 8`
    );

    return res.json({
      success: true,
      stats: {
        totalFarmers: parseInt(farmerCount[0].count, 10),
        todayBookings: parseInt(todayBookings[0].count, 10),
        activeQueue: parseInt(activeQueue[0].count, 10),
        completedProcurementsToday: parseInt(completedToday[0].count, 10),
        completedProcuredKgToday: parseFloat(completedToday[0].total_kg),
        completedProcuredValueToday: parseFloat(completedToday[0].total_value),
        pendingPaymentsCount: parseInt(pendingPayments[0].count, 10),
        pendingPaymentsAmount: parseFloat(pendingPayments[0].total_amount),
        emergencyBookingsToday: parseInt(emergencyToday[0].count, 10)
      },
      centreUtilization: formattedUtil,
      queueBreakdown,
      recentBookings
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get Detailed Admin Bookings List with Search and Filtering
 */
async function getAdminBookings(req, res, next) {
  try {
    const { centreId, date, status, bookingType, search } = req.query;

    let sql = `
      SELECT b.*,
             u.full_name as farmer_name, u.phone as farmer_phone,
             p.crop_name, p.quantity_input, p.unit, p.perishability, p.urgency,
             c.name as centre_name, c.centre_code,
             s.display_time as slot_display,
             t.token_number, t.sequence_number, t.priority_score,
             q.status as queue_status, q.counter_assigned,
             qt.status as quality_status, qt.grade as quality_grade,
             pr.status as procurement_status, pr.net_procured_kg, pr.total_procurement_value,
             pay.status as payment_status, pay.amount as payment_amount
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
      WHERE 1=1
    `;

    const params = [];

    if (centreId && centreId !== 'ALL') {
      sql += ' AND b.centre_id = ?';
      params.push(centreId);
    }
    if (date) {
      sql += ' AND b.booking_date = ?';
      params.push(date);
    }
    if (status && status !== 'ALL') {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    if (bookingType && bookingType !== 'ALL') {
      sql += ' AND b.booking_type = ?';
      params.push(bookingType);
    }
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.phone LIKE ? OR b.booking_reference LIKE ? OR t.token_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Token priority ordering: Procurement date ASC, Slot time ASC, Booking priority
    sql += ' ORDER BY b.booking_date DESC, t.priority_score ASC, s.slot_start ASC, b.created_at DESC';

    const bookings = await query(sql, params);

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
 * Get Admin Analytics Data (Trends, Processing Times, Payments, Crops)
 */
async function getAdminAnalytics(req, res, next) {
  try {
    // 1. Last 7 Days Booking Volumes
    const dailyBookingsTrend = await query(
      `SELECT booking_date, COUNT(*) as total_bookings,
              SUM(CASE WHEN booking_type = 'EMERGENCY' THEN 1 ELSE 0 END) as emergency_bookings,
              COALESCE(SUM(allocated_quantity_kg), 0) as total_kg
       FROM bookings
       WHERE booking_date >= CURDATE() - INTERVAL 7 DAY AND status != 'CANCELLED'
       GROUP BY booking_date
       ORDER BY booking_date ASC`
    );

    // 2. Crop Distribution
    const cropDistribution = await query(
      `SELECT p.crop_name, COUNT(b.id) as booking_count, COALESCE(SUM(b.allocated_quantity_kg), 0) as total_kg
       FROM bookings b
       JOIN farmer_produce p ON p.id = b.produce_id
       WHERE b.status != 'CANCELLED'
       GROUP BY p.crop_name
       ORDER BY total_kg DESC LIMIT 6`
    );

    // 3. Payment Totals by Status
    const paymentStats = await query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
       FROM payments
       GROUP BY status`
    );

    // 4. Quality Grade Distribution
    const qualityStats = await query(
      `SELECT grade, COUNT(*) as count
       FROM quality_tests
       WHERE grade IS NOT NULL
       GROUP BY grade`
    );

    return res.json({
      success: true,
      data: {
        dailyBookingsTrend,
        cropDistribution,
        paymentStats,
        qualityStats
      }
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminOverview,
  getAdminBookings,
  getAdminAnalytics
};
