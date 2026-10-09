const express = require('express');
const router = express.Router();
const {
  getProcurementByBooking,
  adminCompleteProcurement
} = require('../controllers/procurementController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/booking/:bookingId', getProcurementByBooking);
router.post('/complete', requireAdmin, adminCompleteProcurement);

module.exports = router;
