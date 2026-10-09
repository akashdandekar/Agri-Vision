const express = require('express');
const router = express.Router();
const {
  getPaymentByBooking,
  getFarmerPayments,
  adminUpdatePaymentStatus
} = require('../controllers/paymentController');
const { verifyToken, requireFarmer, requireAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/my', requireFarmer, getFarmerPayments);
router.get('/booking/:bookingId', getPaymentByBooking);
router.put('/:paymentId/status', requireAdmin, adminUpdatePaymentStatus);

module.exports = router;
