require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./services/db');
const authRoutes = require('./routes/auth');
const manufacturerRoutes = require('./routes/manufacturer');
const distributorRoutes = require('./routes/distributor');
const transporterRoutes = require('./routes/transporter');
const pharmacyRoutes = require('./routes/pharmacy');
const customerRoutes = require('./routes/customer');
const blockchainRoutes = require('./routes/blockchain');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from parent root
const frontendRoot = path.join(__dirname, '..');
app.use(express.static(frontendRoot));

// API routes are mounted after MongoDB is ready.
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'MediChain Blockchain Server',
    timestamp: new Date().toISOString()
  });
});

// 404 for API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint '${req.originalUrl}' not found.` });
});

// Fallback for root html navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred: ' + err.message
  });
});

let server = null;

async function startServer() {
  try {
    await connectDB();
    // Load blockchain service only after MongoDB data has been loaded.
    require('./services/blockchain');


    app.use('/api/auth', authRoutes);
    app.use('/api/manufacturer', manufacturerRoutes);
    app.use('/api/distributor', distributorRoutes);
    app.use('/api/transporter', transporterRoutes);
    app.use('/api/pharmacy', pharmacyRoutes);
    app.use('/api/customer', customerRoutes);
    app.use('/api/blockchain', blockchainRoutes);
    app.use('/api/admin', adminRoutes);

    server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(' MediChain Blockchain Server is Running');
      console.log(` Web Application URL: http://localhost:${PORT}`);
      console.log(` API Base URL:        http://localhost:${PORT}/api`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('Failed to start MediChain:', err.message);
    console.error('Check MONGODB_USER, MONGODB_PASSWORD and MONGODB_HOST1/2/3 in .env.');
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
