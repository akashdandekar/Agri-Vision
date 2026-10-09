const express = require('express');
const router = express.Router();
const {
  getFarmerProduce,
  addProduce,
  updateProduce,
  deleteProduce
} = require('../controllers/produceController');
const { verifyToken, requireFarmer } = require('../middleware/authMiddleware');

// Farmer produce endpoints (strictly restricted to farmers)
router.use(verifyToken, requireFarmer);

router.get('/', getFarmerProduce);
router.post('/', addProduce);
router.put('/:id', updateProduce);
router.delete('/:id', deleteProduce);

module.exports = router;
