const crypto = require('crypto');
const { blockchain } = require('./db');

function calculateHash(index, timestamp, transactionType, batchId, data, previousHash) {
  const content = String(index) +
    String(timestamp) +
    String(transactionType) +
    String(batchId || '') +
    JSON.stringify(data) +
    String(previousHash);

  return crypto.createHash('sha256').update(content).digest('hex');
}

class BlockchainService {
  constructor() {
    this.ensureGenesis();
  }

  ensureGenesis() {
    if (blockchain.count() === 0) {
      const genesisTimestamp = new Date('2026-01-01T00:00:00.000Z').toISOString();
      const genesisData = {
        message: 'MediChain Genesis Block - Smart Medicine Supply Chain Ledger Initialized',
        system: 'MediChain Network Core'
      };
      const hash = calculateHash(0, genesisTimestamp, 'GENESIS', 'SYSTEM', genesisData, '0');

      blockchain.insert({
        index: 0,
        timestamp: genesisTimestamp,
        transactionType: 'GENESIS',
        batchId: 'SYSTEM',
        data: genesisData,
        previousHash: '0',
        hash: hash
      });
      console.log('MediChain Genesis Block created.');
    }
  }

  getChain() {
    return blockchain.find().sort((a, b) => a.index - b.index);
  }

  getChainByBatch(batchId) {
    if (!batchId) return [];
    const normalized = String(batchId).trim().toUpperCase();
    return blockchain.find(b => b.batchId && b.batchId.toUpperCase() === normalized)
      .sort((a, b) => a.index - b.index);
  }

  getLatestBlock() {
    const chain = this.getChain();
    return chain[chain.length - 1];
  }

  addBlock(transactionType, batchId, data) {
    const latest = this.getLatestBlock();
    const nextIndex = latest ? latest.index + 1 : 0;
    const previousHash = latest ? latest.hash : '0';
    const timestamp = new Date().toISOString();
    const normalizedBatch = batchId ? String(batchId).trim().toUpperCase() : 'GENERAL';

    const hash = calculateHash(nextIndex, timestamp, transactionType, normalizedBatch, data, previousHash);

    const newBlock = {
      index: nextIndex,
      timestamp,
      transactionType,
      batchId: normalizedBatch,
      data,
      previousHash,
      hash
    };

    blockchain.insert(newBlock);
    return newBlock;
  }

  validateChain() {
    const chain = this.getChain();
    if (chain.length === 0) {
      return { isValid: false, reason: 'Empty blockchain ledger.', compromisedBlockIndex: null };
    }

    // Verify Genesis Block
    const genesis = chain[0];
    const computedGenesisHash = calculateHash(
      genesis.index,
      genesis.timestamp,
      genesis.transactionType,
      genesis.batchId,
      genesis.data,
      genesis.previousHash
    );

    if (genesis.hash !== computedGenesisHash || genesis.previousHash !== '0') {
      return {
        isValid: false,
        reason: 'Genesis block has been tampered with or corrupted.',
        compromisedBlockIndex: 0
      };
    }

    // Verify sequential blocks
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];

      // 1. Recalculate hash of current block
      const computedHash = calculateHash(
        current.index,
        current.timestamp,
        current.transactionType,
        current.batchId,
        current.data,
        current.previousHash
      );

      if (current.hash !== computedHash) {
        return {
          isValid: false,
          reason: `Block #${current.index} data integrity mismatch! Computed hash does not match stored block hash.`,
          compromisedBlockIndex: current.index,
          storedHash: current.hash,
          computedHash
        };
      }

      // 2. Verify chain linkage
      if (current.previousHash !== previous.hash) {
        return {
          isValid: false,
          reason: `Block #${current.index} broken chain link! Previous hash (${current.previousHash.slice(0, 10)}...) does not match Block #${previous.index} hash (${previous.hash.slice(0, 10)}...).`,
          compromisedBlockIndex: current.index
        };
      }
    }

    return {
      isValid: true,
      blockCount: chain.length,
      message: 'All blockchain records are cryptographically verified and intact.'
    };
  }

  // Demonstration method to simulate tampering
  simulateTamper(blockIndex, alteredData) {
    const chain = this.getChain();
    const target = chain.find(b => b.index === Number(blockIndex));
    if (!target) {
      throw new Error(`Block #${blockIndex} does not exist.`);
    }

    // Save a backup if not already saved
    if (!global.tamperBackup) {
      global.tamperBackup = JSON.parse(JSON.stringify(chain));
    }

    // Alter the data while leaving the hash intact (classic tampering attempt)
    target.data = {
      ...target.data,
      ...alteredData,
      _tampered: true,
      _tamperTimestamp: new Date().toISOString()
    };
    blockchain.save();

    return {
      success: true,
      message: `Block #${blockIndex} has been maliciously modified for demonstration. Validate chain to see tamper detection alert.`,
      tamperedBlock: target
    };
  }

  restoreBlockchain() {
    if (global.tamperBackup) {
      blockchain.data = JSON.parse(JSON.stringify(global.tamperBackup));
      blockchain.save();
      global.tamperBackup = null;
      return { success: true, message: 'Blockchain restored to original untampered state.' };
    }

    // Recompute valid hashes from scratch if backup is missing
    const chain = this.getChain();
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].data && chain[i].data._tampered) {
        delete chain[i].data._tampered;
        delete chain[i].data._tamperTimestamp;
      }
      chain[i].previousHash = chain[i - 1].hash;
      chain[i].hash = calculateHash(
        chain[i].index,
        chain[i].timestamp,
        chain[i].transactionType,
        chain[i].batchId,
        chain[i].data,
        chain[i].previousHash
      );
    }
    blockchain.save();
    return { success: true, message: 'Blockchain cryptographic integrity restored.' };
  }
}

const blockchainService = new BlockchainService();
module.exports = {
  blockchainService,
  calculateHash
};
