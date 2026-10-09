const express = require('express');
const router = express.Router();
const {
  getCentres,
  getCentreById,
  adminCreateCentre,
  adminUpdateCentre
} = require('../controllers/centreController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public/Farmer readable centre lists
router.get('/', getCentres);
router.get('/:id', getCentreById);

// Admin-only management endpoints
router.post('/', verifyToken, requireAdmin, adminCreateCentre);
router.put('/:id', verifyToken, requireAdmin, adminUpdateCentre);

module.exports = router;
