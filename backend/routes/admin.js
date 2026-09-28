const express = require('express');
const router = express.Router();
const { medicines, shipments, users } = require('../services/db');
const { blockchainService } = require('../services/blockchain');
const { getAlerts } = require('../services/alerts');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/admin/dashboard (allow public/landing page or admin to view summary metrics)
router.get('/dashboard', (req, res) => {
  try {
    const allMeds = medicines.find();
    const allShipments = shipments.find();
    const chain = blockchainService.getChain();
    const alerts = getAlerts().slice(0, 10);
    const now = new Date();

    const expiredCount = allMeds.filter(m => m.expiryDate && new Date(m.expiryDate) < now).length;
    const anomalyCount = allShipments.filter(s => s.temperatureStatus === 'ANOMALY').length;
    const activeShipments = allShipments.filter(s => s.status === 'IN_TRANSIT').length;
    const deliveredCount = allShipments.filter(s => s.status === 'DELIVERED' || s.status === 'ACCEPTED_BY_PHARMACY' || s.stage === 'PHARMACY').length;
    const normalCount = allShipments.filter(s => s.temperatureStatus === 'NORMAL').length;

    const validation = blockchainService.validateChain();

    return res.json({
      success: true,
      stats: {
        totalMedicines: allMeds.length,
        totalShipments: allShipments.length,
        activeShipments,
        delivered: deliveredCount,
        temperatureAnomalies: anomalyCount,
        normalShipments: normalCount,
        expiredMedicines: expiredCount,
        blockchainTransactions: chain.length,
        isBlockchainValid: validation.isValid,
        blockchainMessage: validation.message || validation.reason
      },
      recentAlerts: alerts,
      recentTransactions: chain.slice(-5).reverse()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/admin/medicines
router.get('/medicines', authenticate, requireRole('admin'), (req, res) => {
  try {
    const all = medicines.find().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const allShips = shipments.find();
    const now = new Date();

    const enriched = all.map(med => {
      const ship = allShips.find(s => s.batchId.toUpperCase() === med.batchId.toUpperCase()) || {};
      const isExpired = med.expiryDate ? new Date(med.expiryDate) < now : false;
      return {
        ...med,
        shipment: ship,
        isExpired
      };
    });

    return res.json({ success: true, medicines: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/admin/shipments
router.get('/shipments', authenticate, requireRole('admin'), (req, res) => {
  try {
    const list = shipments.find().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    return res.json({ success: true, shipments: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/admin/alerts
router.get('/alerts', (req, res) => {
  try {
    const role = req.query.role || 'ALL';
    const list = getAlerts({ role });
    return res.json({ success: true, alerts: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/admin/users
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  try {
    const list = users.find().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      organization: u.organization,
      createdAt: u.createdAt
    }));
    return res.json({ success: true, users: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
