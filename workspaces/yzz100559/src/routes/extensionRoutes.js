const express = require('express');
const router = express.Router();
const extensionService = require('../services/extensionService');
const { getCardByNo } = require('../services/cardService');

router.post('/applications', async (req, res) => {
  try {
    const result = await extensionService.createApplication(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/applications', async (req, res) => {
  const result = await extensionService.listApplications(req.query);
  res.json({ success: true, data: result });
});

router.get('/applications/:applicationNo', async (req, res) => {
  const result = await extensionService.getApplicationByNo(req.params.applicationNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '申请不存在' });
  }
  res.json({ success: true, data: result });
});

router.post('/applications/:applicationNo/approve', async (req, res) => {
  try {
    const result = await extensionService.approveApplication(
      req.params.applicationNo,
      req.body.operator
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/applications/:applicationNo/reject', async (req, res) => {
  try {
    const result = await extensionService.rejectApplication(
      req.params.applicationNo,
      req.body.reason,
      req.body.operator
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/cards/:cardNo/extensions', async (req, res) => {
  const card = await getCardByNo(req.params.cardNo);
  if (!card) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  const result = await extensionService.getExtensionsByCard(card.id);
  res.json({ success: true, data: result });
});

module.exports = router;
