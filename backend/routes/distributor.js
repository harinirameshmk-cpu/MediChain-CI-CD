const express = require('express');
const router = express.Router();
const { medicines, shipments } = require('../services/db');
const { blockchainService } = require('../services/blockchain');
const { authenticate, requireRole } = require('../middleware/auth');
const { addAlert } = require('../services/alerts');

// GET /api/distributor/available
router.get('/available', authenticate, requireRole(['distributor', 'admin']), (req, res) => {
  try {
    const allMedicines = medicines.find().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const allShipments = shipments.find();

    const result = allMedicines.map(med => {
      const ship = allShipments.find(s => s.batchId.toUpperCase() === med.batchId.toUpperCase()) || {};
      return {
        ...med,
        shipment: ship
      };
    });

    return res.json({
      success: true,
      batches: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/distributor/receive/:batchId
router.post('/receive/:batchId', authenticate, requireRole(['distributor', 'admin']), (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const { distributorName, receivedQuantity, warehouseLocation } = req.body;

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine batch ${batchId} was not found. Cannot receive unregistered medicine.`
      });
    }

    // Verify against initial blockchain block
    const history = blockchainService.getChainByBatch(batchId);
    const mfgBlock = history.find(b => b.transactionType === 'MEDICINE_REGISTERED');
    if (!mfgBlock) {
      return res.status(400).json({
        success: false,
        message: `Blockchain origin record missing for batch ${batchId}.`
      });
    }

    // Check if received quantity or details contradict original manufacturer record
    const declaredQty = receivedQuantity !== undefined ? Number(receivedQuantity) : medicine.quantity;
    if (declaredQty !== medicine.quantity) {
      addAlert({
        type: 'DANGER',
        message: `BLOCKCHAIN DATA MISMATCH: Batch ${batchId} quantity (${declaredQty}) does not match original manufacturer record (${medicine.quantity}).`,
        batchId,
        role: 'DISTRIBUTOR'
      });

      return res.status(400).json({
        success: false,
        isMismatch: true,
        message: 'BLOCKCHAIN DATA MISMATCH: Medicine batch information differs from the original manufacturer record.',
        originalQuantity: medicine.quantity,
        receivedQuantity: declaredQty
      });
    }

    const distName = distributorName || (req.user.organization || req.user.name);

    // Create DISTRIBUTOR_RECEIVED blockchain block
    const blockData = {
      batchId,
      medicineName: medicine.medicineName,
      distributor: distName,
      quantity: medicine.quantity,
      warehouseLocation: warehouseLocation || 'Central Distribution Hub',
      receivedDate: new Date().toISOString()
    };

    const block = blockchainService.addBlock('DISTRIBUTOR_RECEIVED', batchId, blockData);

    // Update medicine status
    medicines.update(m => m.batchId.toUpperCase() === batchId, {
      currentStage: 'DISTRIBUTOR',
      status: 'RECEIVED_BY_DISTRIBUTOR',
      distributor: distName,
      distributorReceivedAt: blockData.receivedDate
    });

    // Update shipment
    shipments.update(s => s.batchId.toUpperCase() === batchId, {
      stage: 'DISTRIBUTOR',
      status: 'READY_FOR_DISPATCH',
      distributor: distName,
      warehouseLocation: blockData.warehouseLocation
    });

    addAlert({
      type: 'SUCCESS',
      message: `Batch ${batchId} successfully received by Distributor ${distName}.`,
      batchId,
      role: 'DISTRIBUTOR'
    });

    return res.json({
      success: true,
      message: 'Batch successfully received and logged on blockchain.',
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/distributor/dispatch/:batchId
router.post('/dispatch/:batchId', authenticate, requireRole(['distributor', 'admin']), (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const { transporter, destination, vehicleNumber, pickupLocation } = req.body;

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine batch ${batchId} not found.`
      });
    }

    if (medicine.currentStage !== 'DISTRIBUTOR' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch batch ${batchId}. It has not been received by distributor yet.`
      });
    }

    const transporterName = transporter || 'ColdChain Express';
    const dest = destination || 'CityCare Pharmacy Central';
    const pickup = pickupLocation || 'Central Distribution Hub';

    // Create DISPATCHED blockchain block
    const blockData = {
      batchId,
      medicineName: medicine.medicineName,
      distributor: medicine.distributor || req.user.organization || req.user.name,
      transporter: transporterName,
      pickupLocation: pickup,
      destination: dest,
      vehicleNumber: vehicleNumber || 'TRK-2026-X',
      dispatchedDate: new Date().toISOString()
    };

    const block = blockchainService.addBlock('DISPATCHED', batchId, blockData);

    medicines.update(m => m.batchId.toUpperCase() === batchId, {
      currentStage: 'TRANSPORTER',
      status: 'IN_TRANSIT'
    });

    shipments.update(s => s.batchId.toUpperCase() === batchId, {
      stage: 'TRANSPORTER',
      status: 'IN_TRANSIT',
      transporter: transporterName,
      vehicleNumber: blockData.vehicleNumber,
      pickupLocation: pickup,
      destination: dest,
      dispatchedAt: blockData.dispatchedDate
    });

    addAlert({
      type: 'INFO',
      message: `Batch ${batchId} dispatched to Transporter ${transporterName} towards ${dest}.`,
      batchId,
      role: 'ALL'
    });

    return res.json({
      success: true,
      message: 'Batch successfully dispatched to Transporter.',
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
