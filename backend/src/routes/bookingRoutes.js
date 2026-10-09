const express = require('express');
const router = express.Router();
const {
  createRegularBooking,
  createEmergencyBooking,
  getFarmerBookings,
  getBookingDetails,
  cancelBooking
} = require('../controllers/bookingController');
const { verifyToken, requireFarmer } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Farmer bookings actions
router.post('/regular', requireFarmer, createRegularBooking);
router.post('/emergency', requireFarmer, createEmergencyBooking);
router.get('/my', requireFarmer, getFarmerBookings);
router.get('/:id', getBookingDetails);
router.post('/:id/cancel', cancelBooking);

module.exports = router;
