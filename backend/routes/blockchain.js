const express = require('express');
const router = express.Router();
const { blockchainService } = require('../services/blockchain');
const { authenticate, requireRole } = require('../middleware/auth');
const { addAlert } = require('../services/alerts');

// GET /api/blockchain
router.get('/', (req, res) => {
  try {
    const chain = blockchainService.getChain();
    return res.json({
      success: true,
      length: chain.length,
      chain
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/blockchain/validate
router.get('/validate', (req, res) => {
  try {
    const result = blockchainService.validateChain();
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/blockchain/:batchId
router.get('/:batchId', (req, res) => {
  try {
    const batchId = String(req.params.batchId).trim().toUpperCase();
    const blocks = blockchainService.getChainByBatch(batchId);
    return res.json({
      success: true,
      batchId,
      length: blocks.length,
      blocks
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/blockchain/simulate-tamper
router.post('/simulate-tamper', (req, res) => {
  try {
    const { blockIndex, alteredData } = req.body;
    const idx = blockIndex !== undefined ? Number(blockIndex) : 1;
    const patch = alteredData || { quantity: 999999, unauthorizedAlteration: 'TAMPER_TEST' };

    const result = blockchainService.simulateTamper(idx, patch);

    addAlert({
      type: 'DANGER',
      message: `SIMULATED TAMPERING: Block #${idx} was maliciously modified for verification testing.`,
      role: 'ADMIN',
      details: { blockIndex: idx }
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/blockchain/restore
router.post('/restore', (req, res) => {
  try {
    const result = blockchainService.restoreBlockchain();

    addAlert({
      type: 'SUCCESS',
      message: 'Blockchain integrity restored to clean state.',
      role: 'ADMIN'
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
