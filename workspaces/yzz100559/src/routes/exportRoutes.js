const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');
const path = require('path');

router.get('/extensions', async (req, res) => {
  try {
    const result = await exportService.exportExtensions(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/refunds', async (req, res) => {
  try {
    const result = await exportService.exportRefunds(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/plate-changes', async (req, res) => {
  try {
    const result = await exportService.exportPlateChanges(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/manual-adjustments', async (req, res) => {
  try {
    const result = await exportService.exportManualAdjustments(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/fee-transactions', async (req, res) => {
  try {
    const result = await exportService.exportFeeTransactions(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', '..', 'exports', filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      res.status(404).json({ success: false, message: '文件不存在' });
    }
  });
});

module.exports = router;
