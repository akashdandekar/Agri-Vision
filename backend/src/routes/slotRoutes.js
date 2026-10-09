const express = require('express');
const router = express.Router();
const {
  getCentreSlots,
  getSmartRecommendation
} = require('../controllers/slotController');

// Slots query for centre on given date
router.get('/centre/:centreId', getCentreSlots);

// Smart Slot Recommendation
router.get('/recommend', getSmartRecommendation);

module.exports = router;
