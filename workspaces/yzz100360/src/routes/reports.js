const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

router.get('/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const report = await reportService.getDailyReport(date);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/missed-scans/alerts', async (req, res) => {
  try {
    const alerts = await reportService.getMissedScanAlerts();
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const status = await reportService.getInventoryStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
