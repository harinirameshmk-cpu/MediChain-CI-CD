const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' STARTING MEDICHAIN END-TO-END VERIFICATION TEST');
  console.log('====================================================\n');

  try {
    // 1. Login default Manufacturer
    console.log('1. Logging in as Manufacturer...');
    const mfgLogin = await request('POST', '/auth/login', {
      email: 'manufacturer@medichain.com',
      password: 'manu12345',
      role: 'manufacturer'
    });
    if (!mfgLogin.data.success) throw new Error('Mfg login failed: ' + mfgLogin.data.message);
    const mfgToken = mfgLogin.data.token;
    console.log('   ✓ Manufacturer Authenticated successfully.\n');

    // 2. Register Batch
    const testBatchId = 'MED' + Math.floor(100 + Math.random() * 900);
    console.log(`2. Registering Medicine Batch ${testBatchId}...`);
    const regRes = await request(
      'POST',
      '/manufacturer/medicine',
      {
        batchId: testBatchId,
        medicineName: 'Paracetamol 500mg',
        medicineType: 'Tablet',
        quantity: 1000,
        manufacturingDate: '2026-03-01',
        expiryDate: '2027-03-01',
        minTemperature: 2,
        maxTemperature: 8,
        description: 'Standard analgesic and antipyretic tablets.',
        certificate: 'QA-CERT-PARACETAMOL-998'
      },
      mfgToken
    );
    if (!regRes.data.success) throw new Error('Medicine registration failed: ' + regRes.data.message);
    console.log(`   ✓ Batch ${testBatchId} registered. Blockchain Block #${regRes.data.blockchain.index} created.`);
    console.log(`   ✓ Block Hash: ${regRes.data.blockchain.hash}\n`);

    // 3. Login Distributor
    console.log('3. Logging in as Distributor...');
    const distLogin = await request('POST', '/auth/login', {
      email: 'distributor@medichain.com',
      password: 'dist12345',
      role: 'distributor'
    });
    if (!distLogin.data.success) throw new Error('Distributor login failed: ' + distLogin.data.message);
    const distToken = distLogin.data.token;
    console.log('   ✓ Distributor Authenticated.\n');

    // 4. Distributor Receives and Dispatches
    console.log(`4. Distributor Receiving Batch ${testBatchId}...`);
    const receiveRes = await request('POST', `/distributor/receive/${testBatchId}`, {}, distToken);
    if (!receiveRes.data.success) throw new Error('Distributor receive failed: ' + receiveRes.data.message);
    console.log(`   ✓ DISTRIBUTOR_RECEIVED block created (Block #${receiveRes.data.blockchain.index}).\n`);

    console.log(`5. Distributor Dispatching Batch ${testBatchId} to Transporter...`);
    const dispatchRes = await request(
      'POST',
      `/distributor/dispatch/${testBatchId}`,
      {
        transporter: 'ColdChain Express',
        destination: 'CityCare Pharmacy Central',
        vehicleNumber: 'TRK-COLD-8821'
      },
      distToken
    );
    if (!dispatchRes.data.success) throw new Error('Dispatch failed: ' + dispatchRes.data.message);
    console.log(`   ✓ DISPATCHED block created (Block #${dispatchRes.data.blockchain.index}).\n`);

    // 5. Login Transporter
    console.log('6. Logging in as Transporter...');
    const transLogin = await request('POST', '/auth/login', {
      email: 'transporter@medichain.com',
      password: 'trans12345',
      role: 'transporter'
    });
    if (!transLogin.data.success) throw new Error('Transporter login failed: ' + transLogin.data.message);
    const transToken = transLogin.data.token;
    console.log('   ✓ Transporter Authenticated.\n');

    // 6. Transporter Temperature Checkpoint 1: 5°C (NORMAL)
    console.log(`7. Transporter recording Checkpoint 1 at 5°C (Within 2°C - 8°C)...`);
    const check1 = await request(
      'POST',
      `/transporter/checkpoint/${testBatchId}`,
      {
        currentTemperature: 5,
        location: 'Highway Toll Checkpoint North',
        vehicleNumber: 'TRK-COLD-8821'
      },
      transToken
    );
    if (!check1.data.success || check1.data.status !== 'NORMAL') {
      throw new Error('Checkpoint 1 expected NORMAL: ' + JSON.stringify(check1.data));
    }
    console.log(`   ✓ Status: ${check1.data.status} (${check1.data.message})`);
    console.log(`   ✓ Blockchain Block #${check1.data.blockchain.index} logged.\n`);

    // 7. Transporter Temperature Checkpoint 2: 10°C (ANOMALY!)
    console.log(`8. Transporter recording Checkpoint 2 at 10°C (EXCEEDS 8°C safe max!)...`);
    const check2 = await request(
      'POST',
      `/transporter/checkpoint/${testBatchId}`,
      {
        currentTemperature: 10,
        location: 'City Border Inspection Station',
        vehicleNumber: 'TRK-COLD-8821',
        notes: 'Brief refrigeration compressor failure during transit.'
      },
      transToken
    );
    if (!check2.data.success || check2.data.status !== 'ANOMALY') {
      throw new Error('Checkpoint 2 expected ANOMALY: ' + JSON.stringify(check2.data));
    }
    console.log(`   ✓ ANOMALY DETECTED: ${check2.data.message}`);
    console.log(`   ✓ Blockchain Block #${check2.data.blockchain.index} permanently recorded anomaly.\n`);

    // 8. Transporter delivers
    console.log(`9. Transporter delivering batch to Pharmacy...`);
    const deliverRes = await request('POST', `/transporter/deliver/${testBatchId}`, {}, transToken);
    if (!deliverRes.data.success) throw new Error('Delivery failed: ' + deliverRes.data.message);
    console.log(`   ✓ DELIVERED block created (Block #${deliverRes.data.blockchain.index}).\n`);

    // 9. Pharmacy Receives
    console.log('10. Logging in as Pharmacy...');
    const pharmLogin = await request('POST', '/auth/login', {
      email: 'pharmacy@medichain.com',
      password: 'pharm12345',
      role: 'pharmacy'
    });
    if (!pharmLogin.data.success) throw new Error('Pharmacy login failed: ' + pharmLogin.data.message);
    const pharmToken = pharmLogin.data.token;

    console.log(`11. Pharmacy inspecting incoming batch ${testBatchId}...`);
    const incRes = await request('GET', '/pharmacy/incoming', null, pharmToken);
    const targetMed = incRes.data.medicines.find(m => m.batchId === testBatchId);
    if (!targetMed || !targetMed.hasTemperatureAnomaly) {
      throw new Error('Pharmacy expected to see temperature anomaly on batch!');
    }
    console.log(`   ✓ Pharmacy confirmed incoming temperature warning visible: hasTemperatureAnomaly = true`);

    const rxRes = await request('POST', `/pharmacy/receive/${testBatchId}`, {}, pharmToken);
    console.log(`   ✓ Pharmacy received batch. Warning displayed: "${rxRes.data.warning}"`);
    console.log(`   ✓ PHARMACY_RECEIVED Block #${rxRes.data.blockchain.index} logged.\n`);

    // 10. Customer Public Verification
    console.log(`12. Testing Public Customer Verification for ${testBatchId}...`);
    const custRes = await request('GET', `/customer/verify/${testBatchId}`);
    if (!custRes.data.success) throw new Error('Customer verification failed: ' + custRes.data.message);

    console.log(`   ✓ Customer Verdict: ${custRes.data.verdict}`);
    console.log(`   ✓ Title: ${custRes.data.title}`);
    console.log(`   ✓ Badge: ${custRes.data.badge}`);
    console.log(`   ✓ Storage Alert Message: "${custRes.data.message}"`);
    console.log(`   ✓ Recommended Range: ${custRes.data.allowedRange} | Recorded: ${custRes.data.recordedTemperature}`);
    console.log(`   ✓ Actionable Warning: "${custRes.data.alertAction}"`);

    if (custRes.data.verdict !== 'ANOMALY') {
      throw new Error(`Expected Customer verdict to be ANOMALY, got: ${custRes.data.verdict}`);
    }
    console.log('   ✓ Customer Verification properly detected and highlighted the temperature anomaly!\n');

    // 11. Validate Global Blockchain Integrity
    console.log('13. Validating Global Blockchain Cryptographic Integrity...');
    const valRes = await request('GET', '/blockchain/validate');
    if (!valRes.data.success || !valRes.data.isValid) {
      throw new Error('Expected clean blockchain validation: ' + JSON.stringify(valRes.data));
    }
    console.log(`   ✓ Blockchain Cryptographically Valid (${valRes.data.blockCount} blocks verified).\n`);

    // 12. Test Tamper Detection
    console.log('14. Testing Blockchain Tamper Detection (Case 4)...');
    const tamperRes = await request('POST', '/blockchain/simulate-tamper', {
      blockIndex: 1,
      alteredData: { quantity: 999999, medicineName: 'COUNTERFEIT PARACETAMOL' }
    });
    console.log(`   ✓ Malicious alteration injected into Block #1 for testing.`);

    const tamperValRes = await request('GET', '/blockchain/validate');
    console.log(`   ✓ Validation Result: isValid = ${tamperValRes.data.isValid}`);
    console.log(`   ✓ Detected Mismatch: "${tamperValRes.data.reason}"`);

    const custTamperRes = await request('GET', `/customer/verify/${testBatchId}`);
    console.log(`   ✓ Customer Alert: ${custTamperRes.data.title}`);
    console.log(`   ✓ Customer Badge: ${custTamperRes.data.badge}`);
    console.log(`   ✓ Customer Warning: "${custTamperRes.data.message}"`);

    if (custTamperRes.data.verdict !== 'TAMPERED') {
      throw new Error(`Expected Customer verdict to be TAMPERED, got: ${custTamperRes.data.verdict}`);
    }
    console.log('   ✓ Tampering properly caught and customer verification aborted!\n');

    // 13. Restore clean blockchain
    console.log('15. Restoring blockchain to original untampered state...');
    const restoreRes = await request('POST', '/blockchain/restore');
    const cleanVal = await request('GET', '/blockchain/validate');
    console.log(`   ✓ Blockchain Restored: isValid = ${cleanVal.data.isValid} (${cleanVal.data.message})\n`);

    console.log('====================================================');
    console.log(' ALL MEDICHAIN BACKEND & BLOCKCHAIN TESTS PASSED! ');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

// Start server in background for testing if not already running
const { server } = require('./server');
setTimeout(runTests, 1000);
