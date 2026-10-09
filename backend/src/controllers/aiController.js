const { predictWaitTime } = require('../services/aiService');

/**
 * AI Wait-Time Prediction API Endpoint
 * Accessible by client frontend or external integrations
 */
async function getWaitTimePrediction(req, res, next) {
  try {
    const {
      farmersAhead,
      avgProcessingMins,
      activeCounters,
      produceQuantityKg,
      urgency,
      perishability
    } = req.body;

    const prediction = await predictWaitTime({
      farmersAhead,
      avgProcessingMins,
      activeCounters,
      produceQuantityKg,
      urgency,
      perishability
    });

    return res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWaitTimePrediction
};
