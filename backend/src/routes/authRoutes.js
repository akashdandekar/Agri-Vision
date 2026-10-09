const express = require('express');
const router = express.Router();
const {
  farmerRegister,
  farmerLogin,
  adminLogin,
  getMe,
  updateFarmerProfile
} = require('../controllers/authController');
const { verifyToken, requireFarmer } = require('../middleware/authMiddleware');

// Public auth endpoints
router.post('/farmer/register', farmerRegister);
router.post('/farmer/login', farmerLogin);
router.post('/admin/login', adminLogin);

// Protected auth endpoints
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, requireFarmer, updateFarmerProfile);

module.exports = router;
