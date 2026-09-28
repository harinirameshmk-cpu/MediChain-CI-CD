const { notifications } = require('./db');

function addAlert({ type = 'INFO', message, batchId = null, role = 'ALL', details = {} }) {
  const alert = {
    type: type.toUpperCase(), // SUCCESS, WARNING, DANGER, INFO
    message,
    batchId: batchId ? String(batchId).toUpperCase() : null,
    role, // ALL, MANUFACTURER, DISTRIBUTOR, TRANSPORTER, PHARMACY, ADMIN
    details,
    read: false,
    timestamp: new Date().toISOString()
  };

  const saved = notifications.insert(alert);
  return saved;
}

function getAlerts(filter = {}) {
  const all = notifications.find();
  return all
    .filter(item => {
      if (filter.role && filter.role !== 'ALL' && item.role !== 'ALL' && item.role !== filter.role) {
        return false;
      }
      if (filter.batchId && item.batchId !== filter.batchId.toUpperCase()) {
        return false;
      }
      if (filter.type && item.type !== filter.type.toUpperCase()) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  addAlert,
  getAlerts
};
