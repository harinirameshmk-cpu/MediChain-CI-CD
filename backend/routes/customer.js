const express = require('express');
const router = express.Router();
const { medicines, shipments } = require('../services/db');
const { blockchainService, calculateHash } = require('../services/blockchain');
const { authenticate, requireRole } = require('../middleware/auth');


// GET /api/customer/medicines?search=paracetamol
// Customer read-only catalogue: medicines that have reached a pharmacy.
router.get('/medicines', authenticate, requireRole(['customer', 'admin']), (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const allMedicines = medicines.find();
    const list = allMedicines.filter(m => {
      const delivered = String(m.currentStage || '').toUpperCase() === 'PHARMACY' ||
        String(m.status || '').toUpperCase() === 'VERIFIED_AT_PHARMACY';
      if (!delivered) return false;
      if (!search) return true;
      return String(m.medicineName || '').toLowerCase().includes(search) ||
        String(m.batchId || '').toLowerCase().includes(search);
    }).map(m => ({
      batchId: m.batchId,
      medicineName: m.medicineName,
      manufacturer: m.manufacturer,
      quantity: m.quantity,
      manufacturingDate: m.manufacturingDate,
      expiryDate: m.expiryDate,
      currentStage: m.currentStage,
      status: m.status,
      temperatureStatus: m.temperatureStatus,
      pharmacy: m.pharmacy || null
    })).sort((a, b) => String(a.medicineName).localeCompare(String(b.medicineName)));

    res.json({ success: true, medicines: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/customer/verify/:batchId
router.get('/verify/:batchId', authenticate, requireRole(['customer', 'admin']), (req, res) => {
  try {
    const rawBatchId = req.params.batchId;
    if (!rawBatchId) {
      return res.status(400).json({ success: false, message: 'Medicine Batch ID is required.' });
    }

    const batchId = String(rawBatchId).trim().toUpperCase();
    const queryMedicineName = req.query.name ? String(req.query.name).trim().toLowerCase() : null;

    const medicine = medicines.findOne(m => m.batchId.toUpperCase() === batchId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        notFound: true,
        message: `Medicine batch '${batchId}' was not found in the MediChain blockchain registry.`
      });
    }

    // If medicine name query is provided, check compatibility
    if (queryMedicineName && !medicine.medicineName.toLowerCase().includes(queryMedicineName)) {
      return res.status(400).json({
        success: false,
        nameMismatch: true,
        message: `Batch ID '${batchId}' exists, but belongs to '${medicine.medicineName}', which does not match your search.`
      });
    }

    const shipment = shipments.findOne(s => s.batchId.toUpperCase() === batchId) || {
      temperatureHistory: []
    };

    const batchBlocks = blockchainService.getChainByBatch(batchId);
    const globalValidation = blockchainService.validateChain();

    // Verify batch-specific blocks hash integrity
    let batchTampered = !globalValidation.isValid;
    let tamperReason = globalValidation.isValid ? null : globalValidation.reason;

    if (!batchTampered) {
      for (const block of batchBlocks) {
        const computed = calculateHash(
          block.index,
          block.timestamp,
          block.transactionType,
          block.batchId,
          block.data,
          block.previousHash
        );
        if (computed !== block.hash) {
          batchTampered = true;
          tamperReason = `Block #${block.index} (${block.transactionType}) hash integrity corrupted.`;
          break;
        }
      }
    }

    // Check Expiry Date
    const now = new Date();
    let isExpired = false;
    if (medicine.expiryDate) {
      const exp = new Date(medicine.expiryDate);
      isExpired = exp < now;
    }

    // Check Temperature History
    const tempLogs = shipment.temperatureHistory || [];
    const minAllowed = Number(medicine.minTemperature);
    const maxAllowed = Number(medicine.maxTemperature);

    let hasTemperatureAnomaly = false;
    let worstAnomalousReading = null;

    for (const log of tempLogs) {
      const t = Number(log.temperature);
      if (t < minAllowed || t > maxAllowed || log.status === 'ANOMALY') {
        hasTemperatureAnomaly = true;
        worstAnomalousReading = t;
        break;
      }
    }

    // Also check blocks for any TRANSPORT_TEMPERATURE_CHECK with ANOMALY
    for (const block of batchBlocks) {
      if (block.transactionType === 'TRANSPORT_TEMPERATURE_CHECK' && block.data) {
        if (block.data.temperatureStatus === 'ANOMALY') {
          hasTemperatureAnomaly = true;
          if (worstAnomalousReading === null) {
            worstAnomalousReading = block.data.temperature;
          }
        }
      }
    }

    // ==========================================
    // EVALUATE 4 VERIFICATION CASES
    // ==========================================

    // CASE 4 - BLOCKCHAIN TAMPERING / HASH MISMATCH
    if (batchTampered) {
      return res.json({
        success: true,
        verdict: 'TAMPERED',
        isVerified: false,
        title: '🚨 BLOCKCHAIN INTEGRITY ALERT',
        badge: 'Verification Failed',
        badgeClass: 'danger',
        message: 'The integrity of the blockchain record could not be verified. The medicine history may have been altered or does not match the original transaction history.',
        alertAction: 'DO NOT USE. Report this batch immediately to the regulatory authority.',
        blockchainStatus: 'INVALID',
        expiryStatus: isExpired ? 'EXPIRED' : 'VALID',
        temperatureStatus: hasTemperatureAnomaly ? 'ANOMALY DETECTED' : 'NORMAL',
        tamperDetails: tamperReason,
        medicine,
        shipment,
        batchBlocks,
        temperatureLogs: tempLogs
      });
    }

    // CASE 3 - EXPIRED MEDICINE
    if (isExpired) {
      return res.json({
        success: true,
        verdict: 'EXPIRED',
        isVerified: false,
        title: '⚠ MEDICINE EXPIRED',
        badge: 'NOT SAFE FOR USE',
        badgeClass: 'danger',
        message: 'This medicine has passed its expiry date. It is no longer safe for consumption or clinical use.',
        alertAction: 'Dispose of safely or return to the dispensing pharmacy.',
        blockchainStatus: 'VALID',
        expiryStatus: 'EXPIRED',
        temperatureStatus: hasTemperatureAnomaly ? 'ANOMALY DETECTED' : 'SAFE',
        medicine,
        shipment,
        batchBlocks,
        temperatureLogs: tempLogs
      });
    }

    // CASE 2 - TEMPERATURE ANOMALY
    if (hasTemperatureAnomaly) {
      return res.json({
        success: true,
        verdict: 'ANOMALY',
        isVerified: true,
        isWarning: true,
        title: '⚠ MEDICINE VERIFICATION WARNING',
        badge: 'Verified with Warning',
        badgeClass: 'warning',
        message: 'This medicine was exposed to a temperature outside the recommended storage range during transportation. The event has been permanently recorded in the supply-chain history.',
        alertAction: 'Please consult the pharmacist before using this medicine.',
        blockchainStatus: 'VALID',
        expiryStatus: 'VALID',
        temperatureStatus: 'ANOMALY DETECTED',
        allowedRange: `${minAllowed}°C – ${maxAllowed}°C`,
        recordedTemperature: worstAnomalousReading !== null ? `${worstAnomalousReading}°C` : 'Out of range',
        medicine,
        shipment,
        batchBlocks,
        temperatureLogs: tempLogs
      });
    }

    // CASE 1 - EVERYTHING NORMAL
    return res.json({
      success: true,
      verdict: 'NORMAL',
      isVerified: true,
      isWarning: false,
      title: '✓ MEDICINE VERIFIED',
      badge: 'Fully Verified',
      badgeClass: 'success',
      message: 'Blockchain records match the registered medicine information and no critical supply-chain anomaly was detected.',
      alertAction: 'Medicine is genuine, uncompromised, and within manufacturer storage guidelines.',
      blockchainStatus: 'VALID',
      expiryStatus: 'NOT EXPIRED',
      temperatureStatus: 'Safe Temperature Maintained',
      allowedRange: `${minAllowed}°C – ${maxAllowed}°C`,
      recordedTemperature: tempLogs.length > 0 ? `${tempLogs[tempLogs.length - 1].temperature}°C` : 'Within safe limits',
      medicine,
      shipment,
      batchBlocks,
      temperatureLogs: tempLogs
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
