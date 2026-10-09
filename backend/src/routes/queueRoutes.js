const express = require('express');
const router = express.Router();
const {
  getLiveQueueForCentre,
  getFarmerQueueStatus,
  checkInFarmer,
  adminCallNext,
  adminMarkNoShow
} = require('../controllers/queueController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Live queue public/farmer reads
router.get('/centre/:centreId', getLiveQueueForCentre);
router.get('/status/:bookingId', verifyToken, getFarmerQueueStatus);

// Check-in (Accessible to both Farmer and Admin)
router.post('/checkin', verifyToken, checkInFarmer);

// Admin-only queue operations
router.post('/call-next', verifyToken, requireAdmin, adminCallNext);
router.post('/no-show', verifyToken, requireAdmin, adminMarkNoShow);

module.exports = router;
