const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  dbPath: path.join(__dirname, '../data/studio.db'),
  uploadDir: path.join(__dirname, '../uploads'),
  insurance: {
    minInsuranceRatio: 1.0,
    expiryWarningDays: 30,
    overdueWarningDays: 1
  },
  roles: ['photographer', 'stylist', 'client', 'producer', 'legal']
};

module.exports = config;
