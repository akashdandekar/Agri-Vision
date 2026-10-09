const express = require('express');
const router = express.Router();
const {
  getQualityTestByBooking,
  adminStartQualityTest,
  adminSubmitQualityResult
} = require('../controllers/qualityController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Read quality test
router.get('/booking/:bookingId', getQualityTestByBooking);

// Admin-only quality management
router.post('/start', requireAdmin, adminStartQualityTest);
router.post('/submit', requireAdmin, adminSubmitQualityResult);

module.exports = router;
