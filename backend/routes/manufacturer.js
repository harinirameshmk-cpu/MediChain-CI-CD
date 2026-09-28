const express = require('express');
const router = express.Router();
const { medicines, shipments } = require('../services/db');
const { blockchainService } = require('../services/blockchain');
const { authenticate, requireRole } = require('../middleware/auth');
const { addAlert } = require('../services/alerts');

// POST /api/manufacturer/medicine
router.post('/medicine', authenticate, requireRole(['manufacturer', 'admin']), (req, res) => {
  try {
    const {
      batchId,
      medicineName,
      medicineType,
      manufacturer,
      quantity,
      manufacturingDate,
      expiryDate,
      description,
      minTemperature,
      maxTemperature,
      certificate
    } = req.body;

    if (!batchId || !medicineName || !quantity || minTemperature === undefined || maxTemperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID, Medicine Name, Quantity, and Temperature Range are required.'
      });
    }

    const normalizedBatchId = String(batchId).trim().toUpperCase();

    // Check duplicate batch ID
    const existing = medicines.findOne(m => m.batchId.toUpperCase() === normalizedBatchId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Batch ID '${normalizedBatchId}' is already registered in the MediChain system.`
      });
    }

    const minTemp = Number(minTemperature);
    const maxTemp = Number(maxTemperature);
    const qty = Number(quantity);

    if (isNaN(minTemp) || isNaN(maxTemp)) {
      return res.status(400).json({
        success: false,
        message: 'Minimum and Maximum storage temperatures must be valid numbers.'
      });
    }

    if (minTemp > maxTemp) {
      return res.status(400).json({
        success: false,
        message: 'Minimum temperature cannot be greater than Maximum temperature.'
      });
    }

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.'
      });
    }

    const mfgName = manufacturer ? manufacturer.trim() : (req.user.organization || req.user.name);

    // 1. Create Blockchain Transaction
    const blockData = {
      batchId: normalizedBatchId,
      medicineName: medicineName.trim(),
      medicineType: medicineType ? medicineType.trim() : 'Pharmaceutical',
      manufacturer: mfgName,
      quantity: qty,
      manufacturingDate: manufacturingDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '',
      minTemperature: minTemp,
      maxTemperature: maxTemp,
      description: description ? description.trim() : '',
      certificate: certificate ? certificate.trim() : `CERT-${normalizedBatchId}-${Date.now().toString().slice(-4)}`
    };

    const block = blockchainService.addBlock('MEDICINE_REGISTERED', normalizedBatchId, blockData);

    // 2. Insert into Medicines Collection
    const newMedicine = medicines.insert({
      ...blockData,
      registeredBy: req.user.id,
      currentStage: 'MANUFACTURER',
      status: 'REGISTERED',
      temperatureStatus: 'NORMAL',
      registeredAt: new Date().toISOString(),
      blockchainBlockIndex: block.index,
      blockchainHash: block.hash
    });

    // 3. Create initial shipment tracking placeholder for downstream roles
    shipments.insert({
      batchId: normalizedBatchId,
      medicineName: blockData.medicineName,
      manufacturer: mfgName,
      quantity: qty,
      minTemperature: minTemp,
      maxTemperature: maxTemp,
      currentTemperature: null,
      temperatureStatus: 'NORMAL',
      stage: 'MANUFACTURER',
      status: 'AWAITING_DISTRIBUTOR',
      temperatureHistory: [],
      updatedAt: new Date().toISOString()
    });

    // 4. Create Notification
    addAlert({
      type: 'SUCCESS',
      message: `Medicine batch ${normalizedBatchId} (${medicineName}) successfully registered on the blockchain.`,
      batchId: normalizedBatchId,
      role: 'ALL',
      details: { minTemperature: minTemp, maxTemperature: maxTemp, blockIndex: block.index }
    });

    return res.status(201).json({
      success: true,
      message: 'Medicine Registered & Blockchain Transaction Created',
      medicine: newMedicine,
      blockchain: block
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/manufacturer/medicines
router.get('/medicines', authenticate, requireRole(['manufacturer', 'admin']), (req, res) => {
  try {
    const list = medicines.find().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({
      success: true,
      medicines: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
