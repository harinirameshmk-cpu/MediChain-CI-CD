const express = require('express');
const router = express.Router();
const { medicines, shipments } = require('../services/db');
const { blockchainService } = require('../services/blockchain');
const { authenticate, requireRole } = require('../middleware/auth');
const { addAlert } = require('../services/alerts');

// GET /api/pharmacy/incoming
router.get('/incoming', authenticate, requireRole(['pharmacy', 'admin']), (req, res) => {
  try {
    const allMedicines = medicines.find().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const allShipments = shipments.find();

    const now = new Date();

    const list = allMedicines.map(med => {
      const ship = allShipments.find(s => s.batchId.toUpperCase() === med.batchId.toUpperCase()) || {};

      // Check expiry
      let isExpired = false;
      let daysToExpiry = null;
      if (med.expiryDate) {
        const expDate = new Date(med.expiryDate);
        isExpired = expDate < now;
        daysToExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      }

      return {
        ...med,
        shipment: ship,
        isExpired,
        daysToExpiry,
        hasTemperatureAnomaly: med.temperatureStatus === 'ANOMALY' || ship.temperatureStatus === 'ANOMALY'
      };
    });

    return res.json({
      success: true,
      medicines: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/pharmacy/receive/:batchId
router.post('/receive/:batchId', authenticate, requireRole(['pharmacy', 'admin']), (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const { pharmacyName, notes } = req.body;

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: `Medicine batch ${batchId} was not found.` });
    }

    const shipment = shipments.findOne(s => s.batchId.toUpperCase() === batchId) || {};
    const pharmName = pharmacyName || (req.user.organization || req.user.name);
    const hasAnomaly = medicine.temperatureStatus === 'ANOMALY' || shipment.temperatureStatus === 'ANOMALY';

    const receivedDate = new Date().toISOString();

    // Create PHARMACY_RECEIVED blockchain block
    const blockData = {
      batchId,
      medicineName: medicine.medicineName,
      pharmacy: pharmName,
      quantity: medicine.quantity,
      receivedDate,
      temperatureStatus: hasAnomaly ? 'ANOMALY' : 'NORMAL',
      temperatureWarning: hasAnomaly
        ? 'This medicine experienced a temperature condition outside the recommended storage range during transportation.'
        : 'All transport temperatures were within manufacturer safe bounds.',
      notes: notes || ''
    };

    const block = blockchainService.addBlock('PHARMACY_RECEIVED', batchId, blockData);

    medicines.update(m => m.batchId.toUpperCase() === batchId, {
      currentStage: 'PHARMACY',
      status: 'VERIFIED_AT_PHARMACY',
      pharmacyReceivedAt: receivedDate,
      pharmacy: pharmName
    });

    shipments.update(s => s.batchId.toUpperCase() === batchId, {
      status: 'ACCEPTED_BY_PHARMACY',
      receivedByPharmacyAt: receivedDate
    });

    addAlert({
      type: hasAnomaly ? 'WARNING' : 'SUCCESS',
      message: hasAnomaly
        ? `Batch ${batchId} received by ${pharmName} with TEMPERATURE WARNING.`
        : `Batch ${batchId} received and verified successfully by ${pharmName}.`,
      batchId,
      role: 'ALL',
      details: { hasAnomaly, pharmacy: pharmName }
    });

    return res.json({
      success: true,
      message: 'Medicine received at Pharmacy.',
      hasTemperatureAnomaly: hasAnomaly,
      warning: hasAnomaly
        ? '⚠ TEMPERATURE WARNING: This medicine experienced a temperature condition outside the recommended storage range during transportation.'
        : null,
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/pharmacy/reject/:batchId
router.post('/reject/:batchId', authenticate, requireRole(['pharmacy', 'admin']), (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const { reason } = req.body;

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: `Medicine batch ${batchId} was not found.` });
    }

    const blockData = {
      batchId,
      action: 'REJECTED_BY_PHARMACY',
      reason: reason || 'Critical storage temperature anomaly or physical damage',
      timestamp: new Date().toISOString()
    };

    const block = blockchainService.addBlock('PHARMACY_REJECTED', batchId, blockData);

    medicines.update(m => m.batchId.toUpperCase() === batchId, {
      status: 'REJECTED_BY_PHARMACY'
    });

    addAlert({
      type: 'DANGER',
      message: `Batch ${batchId} REJECTED by pharmacy. Reason: ${blockData.reason}`,
      batchId,
      role: 'ALL'
    });

    return res.json({
      success: true,
      message: 'Medicine shipment rejected and logged to blockchain.',
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
