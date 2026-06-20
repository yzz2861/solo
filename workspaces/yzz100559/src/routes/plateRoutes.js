const express = require('express');
const router = express.Router();
const plateService = require('../services/plateService');
const { getCardByNo } = require('../services/cardService');

router.post('/changes', async (req, res) => {
  try {
    const result = await plateService.changePlate(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/changes', async (req, res) => {
  const result = await plateService.listPlateChanges(req.query);
  res.json({ success: true, data: result });
});

router.get('/changes/:changeNo', async (req, res) => {
  const result = await plateService.getPlateChangeByNo(req.params.changeNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '变更记录不存在' });
  }
  res.json({ success: true, data: result });
});

router.get('/cards/:cardNo/history', async (req, res) => {
  const card = await getCardByNo(req.params.cardNo);
  if (!card) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  const result = await plateService.getAllOldPlates(card.id);
  res.json({ success: true, data: result });
});

module.exports = router;
