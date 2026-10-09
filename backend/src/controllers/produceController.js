const { query } = require('../config/db');

/**
 * List all produce for the currently logged-in farmer
 */
async function getFarmerProduce(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    if (!farmerId) {
      return res.status(403).json({ success: false, error: 'Farmer profile not identified.' });
    }

    const produceList = await query(
      `SELECT * FROM farmer_produce WHERE farmer_id = ? ORDER BY created_at DESC`,
      [farmerId]
    );

    return res.json({
      success: true,
      count: produceList.length,
      data: produceList
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add new produce
 * Converts quintal to kg internally: 1 quintal = 100 kg
 */
async function addProduce(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    if (!farmerId) {
      return res.status(403).json({ success: false, error: 'Farmer profile not identified.' });
    }

    const {
      cropName,
      quantity,
      unit = 'quintal', // 'kg' or 'quintal'
      harvestDate,
      perishability = 'MEDIUM', // 'HIGH', 'MEDIUM', 'LOW'
      urgency = 'NORMAL', // 'EMERGENCY', 'URGENT', 'NORMAL'
      description
    } = req.body;

    if (!cropName || !quantity || !harvestDate) {
      return res.status(400).json({
        success: false,
        error: 'Crop name, quantity, and harvest date are required.'
      });
    }

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive number.'
      });
    }

    const validUnit = (unit && unit.toLowerCase() === 'kg') ? 'kg' : 'quintal';

    // Normalize to kg for internal capacity calculations: 1 quintal = 100 kg
    const quantityKg = validUnit === 'quintal' ? (numQty * 100) : numQty;

    const validPerishability = ['HIGH', 'MEDIUM', 'LOW'].includes(perishability) ? perishability : 'MEDIUM';
    const validUrgency = ['EMERGENCY', 'URGENT', 'NORMAL'].includes(urgency) ? urgency : 'NORMAL';

    const result = await query(
      `INSERT INTO farmer_produce
       (farmer_id, crop_name, quantity_input, unit, quantity_kg, harvest_date, perishability, urgency, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', NOW())`,
      [
        farmerId,
        cropName.trim(),
        numQty,
        validUnit,
        quantityKg,
        harvestDate,
        validPerishability,
        validUrgency,
        description ? description.trim() : null
      ]
    );

    const [newProduce] = await query('SELECT * FROM farmer_produce WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Produce record added successfully.',
      data: newProduce
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update produce record (only if not already booked or procured)
 */
async function updateProduce(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    const { id } = req.params;

    const [existing] = await query(
      'SELECT * FROM farmer_produce WHERE id = ? AND farmer_id = ?',
      [id, farmerId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Produce item not found.' });
    }

    if (existing.status === 'BOOKED' || existing.status === 'PROCURED') {
      return res.status(400).json({
        success: false,
        error: `Cannot modify produce that is already ${existing.status.toLowerCase()}.`
      });
    }

    const {
      cropName,
      quantity,
      unit,
      harvestDate,
      perishability,
      urgency,
      description
    } = req.body;

    const newCropName = cropName ? cropName.trim() : existing.crop_name;
    const newUnit = unit ? (unit.toLowerCase() === 'kg' ? 'kg' : 'quintal') : existing.unit;
    const newQtyInput = quantity ? parseFloat(quantity) : existing.quantity_input;
    const newQtyKg = newUnit === 'quintal' ? (newQtyInput * 100) : newQtyInput;
    const newHarvest = harvestDate || existing.harvest_date;
    const newPerishability = perishability || existing.perishability;
    const newUrgency = urgency || existing.urgency;
    const newDesc = description !== undefined ? description : existing.description;

    await query(
      `UPDATE farmer_produce
       SET crop_name = ?, quantity_input = ?, unit = ?, quantity_kg = ?, harvest_date = ?,
           perishability = ?, urgency = ?, description = ?
       WHERE id = ?`,
      [newCropName, newQtyInput, newUnit, newQtyKg, newHarvest, newPerishability, newUrgency, newDesc, id]
    );

    const [updated] = await query('SELECT * FROM farmer_produce WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Produce record updated successfully.',
      data: updated
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Delete produce record (only if not booked)
 */
async function deleteProduce(req, res, next) {
  try {
    const farmerId = req.user.farmer_id;
    const { id } = req.params;

    const [existing] = await query(
      'SELECT * FROM farmer_produce WHERE id = ? AND farmer_id = ?',
      [id, farmerId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Produce item not found.' });
    }

    if (existing.status === 'BOOKED' || existing.status === 'PROCURED') {
      return res.status(400).json({
        success: false,
        error: `Cannot delete produce that is currently ${existing.status.toLowerCase()}.`
      });
    }

    await query('DELETE FROM farmer_produce WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Produce record deleted successfully.'
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFarmerProduce,
  addProduce,
  updateProduce,
  deleteProduce
};
