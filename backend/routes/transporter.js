const express = require('express');
const router = express.Router();
const { medicines, shipments } = require('../services/db');
const { blockchainService } = require('../services/blockchain');
const { authenticate, requireRole } = require('../middleware/auth');
const { addAlert } = require('../services/alerts');

// GET /api/transporter/shipments
router.get('/shipments', authenticate, requireRole(['transporter', 'admin']), (req, res) => {
  try {
    const allShipments = shipments.find().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    const allMedicines = medicines.find();

    const result = allShipments.map(ship => {
      const med = allMedicines.find(m => m.batchId.toUpperCase() === ship.batchId.toUpperCase()) || {};
      return {
        ...ship,
        medicine: med
      };
    });

    return res.json({
      success: true,
      shipments: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/transporter/checkpoint/:batchId
router.post('/checkpoint/:batchId', authenticate, requireRole(['transporter', 'admin']), (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const { currentTemperature, location, vehicleNumber, transportCompany, notes } = req.body;

    if (currentTemperature === undefined || currentTemperature === null || currentTemperature === '') {
      return res.status(400).json({
        success: false,
        message: 'Current temperature reading is required.'
      });
    }

    const temp = Number(currentTemperature);
    if (isNaN(temp)) {
      return res.status(400).json({
        success: false,
        message: 'Temperature must be a valid numeric value.'
      });
    }

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine batch ${batchId} was not found.`
      });
    }

    const shipment = shipments.findOne(s => s.batchId.toUpperCase() === batchId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: `Shipment record for batch ${batchId} not found.`
      });
    }

    const minTemp = Number(medicine.minTemperature);
    const maxTemp = Number(medicine.maxTemperature);

    // ==========================================
    // TEMPERATURE ALERT LOGIC
    // ==========================================
    let status = 'NORMAL';
    let statusMessage = '✓ Temperature Normal';

    if (temp < minTemp) {
      status = 'ANOMALY';
      statusMessage = '⚠ TEMPERATURE ALERT: Temperature dropped below the safe storage range.';
    } else if (temp > maxTemp) {
      status = 'ANOMALY';
      statusMessage = '⚠ TEMPERATURE ALERT: Temperature exceeded the safe storage range.';
    }

    const checkpointTimestamp = new Date().toISOString();

    // 1. Create Blockchain Transaction for every checkpoint
    const blockData = {
      batchId,
      temperature: temp,
      minAllowed: minTemp,
      maxAllowed: maxTemp,
      temperatureStatus: status,
      location: location || 'Highway Transit Checkpoint',
      vehicleNumber: vehicleNumber || shipment.vehicleNumber || 'TRK-2026-X',
      transportCompany: transportCompany || (req.user.organization || req.user.name),
      notes: notes || '',
      recordedAt: checkpointTimestamp
    };

    const block = blockchainService.addBlock('TRANSPORT_TEMPERATURE_CHECK', batchId, blockData);

    // 2. Append to temperature history
    const history = shipment.temperatureHistory || [];
    history.push({
      timestamp: checkpointTimestamp,
      temperature: temp,
      allowedRange: `${minTemp}°C – ${maxTemp}°C`,
      status,
      location: blockData.location,
      blockIndex: block.index,
      blockHash: block.hash
    });

    // Check if any reading in history was an anomaly
    const hasAnyAnomaly = history.some(h => h.status === 'ANOMALY');
    const overallTempStatus = hasAnyAnomaly ? 'ANOMALY' : 'NORMAL';

    // 3. Update Shipment & Medicine
    shipments.update(s => s.batchId.toUpperCase() === batchId, {
      currentTemperature: temp,
      temperatureStatus: overallTempStatus,
      temperatureHistory: history,
      updatedAt: checkpointTimestamp
    });

    medicines.update(m => m.batchId.toUpperCase() === batchId, {
      temperatureStatus: overallTempStatus,
      lastRecordedTemp: temp
    });

    // 4. Create Notification
    if (status === 'ANOMALY') {
      addAlert({
        type: 'WARNING',
        message: `Temperature anomaly detected for Batch ${batchId}: recorded ${temp}°C (Safe range: ${minTemp}°C – ${maxTemp}°C).`,
        batchId,
        role: 'ALL',
        details: { recordedTemp: temp, minTemp, maxTemp, blockIndex: block.index }
      });
    } else {
      addAlert({
        type: 'INFO',
        message: `Temperature checkpoint logged for Batch ${batchId}: ${temp}°C (Normal).`,
        batchId,
        role: 'TRANSPORTER'
      });
    }

    return res.json({
      success: true,
      status,
      message: statusMessage,
      temperature: temp,
      allowedRange: `${minTemp}°C – ${maxTemp}°C`,
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/transporter/deliver/:batchId
router.post('/deliver/:batchId', authenticate, requireRole(['transporter', 'admin']), (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const { destination, receivedByPharmacy } = req.body;

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found.` });
    }

    const deliveryDate = new Date().toISOString();
    const dest = destination || 'CityCare Pharmacy Central';

    // Create DELIVERED blockchain block
    const blockData = {
      batchId,
      medicineName: medicine.medicineName,
      deliveredBy: req.user.organization || req.user.name,
      destination: dest,
      deliveredDate: deliveryDate
    };

    const block = blockchainService.addBlock('DELIVERED', batchId, blockData);

    medicines.update(m => m.batchId.toUpperCase() === batchId, {
      currentStage: 'PHARMACY',
      status: 'DELIVERED_TO_PHARMACY'
    });

    shipments.update(s => s.batchId.toUpperCase() === batchId, {
      stage: 'PHARMACY',
      status: 'DELIVERED',
      deliveredAt: deliveryDate
    });

    addAlert({
      type: 'SUCCESS',
      message: `Batch ${batchId} successfully delivered to pharmacy (${dest}).`,
      batchId,
      role: 'ALL'
    });

    return res.json({
      success: true,
      message: 'Shipment marked as DELIVERED.',
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
