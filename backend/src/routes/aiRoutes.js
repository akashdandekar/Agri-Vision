const express = require('express');
const router = express.Router();
const { getWaitTimePrediction } = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/predict', verifyToken, getWaitTimePrediction);

module.exports = router;
