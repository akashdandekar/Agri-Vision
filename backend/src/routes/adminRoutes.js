const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getAdminBookings,
  getAdminAnalytics
} = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken, requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/bookings', getAdminBookings);
router.get('/analytics', getAdminAnalytics);

module.exports = router;
